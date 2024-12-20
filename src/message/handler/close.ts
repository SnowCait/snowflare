import { Subscriptions } from "../../subscriptions";
import { MessageHandler } from "../handler";

export class CloseMessageHandler implements MessageHandler {
  #subscriptionId: string;
  #getSubscriptions: () => Map<WebSocket, Subscriptions>;

  constructor(
    subscriptionId: string,
    getSubscriptions: () => Map<WebSocket, Subscriptions>,
  ) {
    this.#subscriptionId = subscriptionId;
    this.#getSubscriptions = getSubscriptions;
  }

  handle(ws: WebSocket) {
    const subscriptions = this.#getSubscriptions();
    subscriptions.get(ws)?.delete(this.#subscriptionId);
  }
}
