import { Event, Filter, matchFilter, verifyEvent } from "nostr-tools";
import { MessageHandler } from "../handler";
import {
  Connection,
  Connections,
  errorConnectionNotFound,
} from "../../connection";
import { nip11 } from "../../config";
import { EventRepository } from "../../repository/event";
import {
  EventDeletion,
  isEphemeralKind,
  isParameterizedReplaceableKind,
  isReplaceableKind,
} from "nostr-tools/kinds";
import { sendAuthChallenge } from "../sender/auth";

export class EventMessageHandler implements MessageHandler {
  #event: Event;
  #eventsRepository: EventRepository;

  constructor(event: Event, eventsRepository: EventRepository) {
    this.#event = event;
    this.#eventsRepository = eventsRepository;
  }

  async handle(
    ctx: DurableObjectState,
    ws: WebSocket,
    connections: Connections,
    storeConnection: (connection: Connection) => void,
  ): Promise<void> {
    if (!verifyEvent(this.#event)) {
      ws.send(JSON.stringify(["NOTICE", "invalid: event"]));
      return;
    }

    const connection = connections.get(ws);
    if (connection === undefined) {
      errorConnectionNotFound();
      return;
    }

    if (nip11.limitation.auth_required) {
      const { auth } = connection;
      if (auth?.pubkey !== this.#event.pubkey) {
        ws.send(
          JSON.stringify([
            "OK",
            this.#event.id,
            false,
            "auth-required: please send challenge",
          ]),
        );
        return;
      }
    } else if (
      this.#event.tags.some(([name]) => name === "-") &&
      connection.auth?.pubkey !== this.#event.pubkey
    ) {
      if (connection.auth?.pubkey === undefined) {
        const challenge = sendAuthChallenge(ws);
        connection.auth = {
          challenge,
          challengedAt: Date.now(),
        };
        storeConnection(connection);
        ws.send(
          JSON.stringify([
            "OK",
            this.#event.id,
            false,
            "auth-required: please send challenge",
          ]),
        );
      } else {
        ws.send(
          JSON.stringify([
            "OK",
            this.#event.id,
            false,
            "auth-required: this event may only be published by its author",
          ]),
        );
      }
      return;
    }

    if (isReplaceableKind(this.#event.kind)) {
      await this.#eventsRepository.saveReplaceableEvent(
        this.#event,
        connection.ipAddress,
      );
    } else if (isParameterizedReplaceableKind(this.#event.kind)) {
      if (
        !this.#event.tags.some(
          ([name, value]) => name === "d" && typeof value === "string",
        )
      ) {
        ws.send(
          JSON.stringify([
            "OK",
            this.#event.id,
            false,
            "invalid: addressable event requires d tag",
          ]),
        );
        return;
      }
      await this.#eventsRepository.saveAddressableEvent(
        this.#event,
        connection.ipAddress,
      );
    } else if (!isEphemeralKind(this.#event.kind)) {
      await this.#eventsRepository.save(this.#event, connection.ipAddress);
      if (this.#event.kind === EventDeletion) {
        await this.#eventsRepository.deleteBy(this.#event);
      }
    }

    ws.send(JSON.stringify(["OK", this.#event.id, true, ""]));

    await this.#broadcast(ctx, connections);
  }

  async #broadcast(
    ctx: DurableObjectState,
    connections: Connections,
  ): Promise<void> {
    const filters = await ctx.storage.list<Filter>();
    for (const [ws, { subscriptions }] of connections) {
      for (const [id, key] of subscriptions) {
        const filter = filters.get(key);
        if (filter === undefined) {
          await ctx.storage.delete(key);
        } else if (matchFilter(filter, this.#event)) {
          ws.send(JSON.stringify(["EVENT", id, this.#event]));
        }
      }
    }
  }
}
