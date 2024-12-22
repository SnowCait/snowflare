import { Event, matchFilter, verifyEvent } from "nostr-tools";
import { MessageHandler } from "../handler";
import { Connection } from "../../connection";
import { nip11 } from "../../config";

export class EventMessageHandler implements MessageHandler {
  #event: Event;
  #getConnections: () => Map<WebSocket, Connection>;

  constructor(event: Event, getConnections: () => Map<WebSocket, Connection>) {
    this.#event = event;
    this.#getConnections = getConnections;
  }

  handle(ws: WebSocket) {
    if (!verifyEvent(this.#event)) {
      ws.send(JSON.stringify(["NOTICE", "invalid: event"]));
      return;
    }

    if (nip11.limitation.auth_required) {
      const { auth } = ws.deserializeAttachment() as Connection;
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

    ws.send(JSON.stringify(["OK", this.#event.id, true, ""]));

    this.broadcast();
  }

  private broadcast() {
    for (const [ws, { subscriptions }] of this.#getConnections()) {
      for (const [id, filter] of subscriptions) {
        if (matchFilter(filter, this.#event)) {
          ws.send(JSON.stringify(["EVENT", id, this.#event]));
        }
      }
    }
  }
}
