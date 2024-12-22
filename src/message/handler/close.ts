import {
  Connection,
  Connections,
  errorConnectionNotFound,
} from "../../connection";
import { MessageHandler } from "../handler";

export class CloseMessageHandler implements MessageHandler {
  #subscriptionId: string;

  constructor(subscriptionId: string) {
    this.#subscriptionId = subscriptionId;
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
    connection.subscriptions.delete(this.#subscriptionId);
    storeConnection(connection);
  }
}
