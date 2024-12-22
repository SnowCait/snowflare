import { Event, matchFilter, verifyEvent } from "nostr-tools";
import { MessageHandler } from "../handler";
import { Connections, errorConnectionNotFound } from "../../connection";
import { nip11 } from "../../config";

export class EventMessageHandler implements MessageHandler {
  #event: Event;

  constructor(event: Event) {
    this.#event = event;
  }

  handle(ws: WebSocket, connections: Connections): void {
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

    ws.send(JSON.stringify(["OK", this.#event.id, true, ""]));

    this.broadcast(connections);
  }

  private broadcast(connections: Connections) {
    for (const [ws, { subscriptions }] of connections) {
      for (const [id, filter] of subscriptions) {
        if (matchFilter(filter, this.#event)) {
          ws.send(JSON.stringify(["EVENT", id, this.#event]));
        }
      }
    }
  }
}
