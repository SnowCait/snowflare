import { Filter } from "nostr-tools";
import { MessageHandler } from "../handler";
import {
  Connection,
  Connections,
  errorConnectionNotFound,
} from "../../connection";

export class ReqMessageHandler implements MessageHandler {
  #subscriptionId: string;
  #filter: Filter;

  constructor(subscriptionId: string, filter: Filter) {
    this.#subscriptionId = subscriptionId;
    this.#filter = filter;
  }

  handle(
    ws: WebSocket,
    connections: Connections,
    storeConnection: (connection: Connection) => void,
  ): void {
    const connection = connections.get(ws);
    if (connection === undefined) {
      errorConnectionNotFound();
      return;
    }

    const { subscriptions } = connection;
    subscriptions.set(this.#subscriptionId, this.#filter);
    const newConnection = { ...connection, subscriptions };
    storeConnection(newConnection);

    ws.send(JSON.stringify(["EOSE", this.#subscriptionId]));
  }
}
