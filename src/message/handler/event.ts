import { Event, Filter, verifyEvent } from "nostr-tools";
import { MessageHandler } from "../handler";
import { Connection } from "../../connection";
import { nip11 } from "../../config";
import { EventRepository } from "../../repository/event";
import {
  EventDeletion,
  isEphemeralKind,
  isAddressableKind,
  isReplaceableKind,
} from "nostr-tools/kinds";
import { sendAuthChallenge } from "../sender/auth";
import { broadcastable } from "../../nostr";

export class EventMessageHandler implements MessageHandler {
  #event: Event;
  #eventsRepository: EventRepository;

  constructor(event: Event, eventsRepository: EventRepository) {
    this.#event = event;
    this.#eventsRepository = eventsRepository;
  }

  async handle(ctx: DurableObjectState, ws: WebSocket): Promise<void> {
    console.debug("[EVENT]", { event: this.#event });

    if (!verifyEvent(this.#event)) {
      ws.send(JSON.stringify(["NOTICE", "invalid: event"]));
      return;
    }

    const connection = ws.deserializeAttachment() as Connection;
    const { auth } = connection;

    if (auth === undefined || auth.pubkey !== this.#event.pubkey) {
      const isProtected = this.#event.tags.some(([name]) => name === "-");

      if (
        nip11.limitation.auth_required ||
        nip11.limitation.restricted_writes ||
        isProtected
      ) {
        if (auth?.pubkey === undefined) {
          const challenge = sendAuthChallenge(ws);
          connection.auth = {
            challenge,
            challengedAt: Date.now(),
          };
          ws.serializeAttachment(connection);
        }
        const message = isProtected
          ? "this event may only be published by its author"
          : "we only accept events from registered users";
        ws.send(
          JSON.stringify([
            "OK",
            this.#event.id,
            false,
            `auth-required: ${message}`,
          ]),
        );
        return;
      }
    }

    if (isReplaceableKind(this.#event.kind)) {
      await this.#eventsRepository.saveReplaceableEvent(
        this.#event,
        connection.ipAddress,
      );
    } else if (isAddressableKind(this.#event.kind)) {
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

    await this.#broadcast(ctx);
  }

  async #broadcast(ctx: DurableObjectState): Promise<void> {
    const subscriptionsMap = await ctx.storage.list<Map<string, Filter[]>>();
    subscriptionsMap.delete("maintenance"); // Exclude non-connections
    const availableConnectionIds = new Set<string>();
    for (const ws of ctx.getWebSockets()) {
      const { id } = ws.deserializeAttachment() as Connection;
      availableConnectionIds.add(id);
      const subscriptions = subscriptionsMap.get(id);
      if (subscriptions === undefined) {
        continue;
      }
      for (const [id, filters] of subscriptions) {
        if (filters.some((filter) => broadcastable(filter, this.#event))) {
          ws.send(JSON.stringify(["EVENT", id, this.#event]));
        }
      }
    }
  }
}
