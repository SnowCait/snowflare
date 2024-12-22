import { Connection } from "../../connection";
import { MessageHandler } from "../handler";

export class CloseMessageHandler implements MessageHandler {
  #subscriptionId: string;
  #getConnections: () => Map<WebSocket, Connection>;

  constructor(
    subscriptionId: string,
    getConnections: () => Map<WebSocket, Connection>,
  ) {
    this.#subscriptionId = subscriptionId;
    this.#getConnections = getConnections;
  }

  handle(ws: WebSocket) {
    const connection = this.#getConnections().get(ws);
    if (connection === undefined) {
      return;
    }
    connection.subscriptions.delete(this.#subscriptionId);
    ws.serializeAttachment(connection);
  }
}
