import { Filter } from "nostr-tools";
import { MessageHandler } from "../handler";

export class ReqMessageHandler implements MessageHandler {
  #subscriptionId: string;
  #filter: Filter; // eslint-disable-line no-unused-private-class-members

  constructor(subscriptionId: string, filter: Filter) {
    this.#subscriptionId = subscriptionId;
    this.#filter = filter;
  }

  handle(ws: WebSocket) {
    ws.send(JSON.stringify(["EOSE", this.#subscriptionId]));
  }
}
