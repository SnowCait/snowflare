import { Event, matchFilter, verifyEvent } from "nostr-tools";
import { MessageHandler } from "../handler";
import { Subscriptions } from "../../subscriptions";

export class EventMessageHandler implements MessageHandler {
  #event: Event;
  #getSubscriptions: () => Map<WebSocket, Subscriptions>;

  constructor(
    event: Event,
    getSubscriptions: () => Map<WebSocket, Subscriptions>,
  ) {
    this.#event = event;
    this.#getSubscriptions = getSubscriptions;
  }

  handle(ws: WebSocket) {
    if (!verifyEvent(this.#event)) {
      ws.send(JSON.stringify(["NOTICE", "invalid: event"]));
      return;
    }

    ws.send(JSON.stringify(["OK", this.#event.id, true, ""]));

    this.broadcast();
  }

  private broadcast() {
    for (const [ws, subscriptions] of this.#getSubscriptions()) {
      for (const [id, filter] of subscriptions) {
        if (matchFilter(filter, this.#event)) {
          ws.send(JSON.stringify(["EVENT", id, this.#event]));
        }
      }
    }
  }
}
