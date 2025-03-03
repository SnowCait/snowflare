import { Event, Filter, matchFilter, verifyEvent } from "nostr-tools";
import { MessageHandler } from "../handler";
import { Connections, errorConnectionNotFound } from "../../connection";
import { nip11 } from "../../config";
import { EventRepository } from "../../repository/event";
import {
  EventDeletion,
  isEphemeralKind,
  isReplaceableKind,
} from "nostr-tools/kinds";

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
  ): Promise<void> {
    if (!verifyEvent(this.#event)) {
      ws.send(JSON.stringify(["NOTICE", "invalid: event"]));
      return;
    }

    if (nip11.limitation.auth_required) {
      const connection = connections.get(ws);
      if (connection === undefined) {
        errorConnectionNotFound();
        return;
      }
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
    }

    if (isReplaceableKind(this.#event.kind)) {
      await this.#eventsRepository.saveReplaceableEvent(this.#event);
    } else if (!isEphemeralKind(this.#event.kind)) {
      await this.#eventsRepository.save(this.#event);
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
