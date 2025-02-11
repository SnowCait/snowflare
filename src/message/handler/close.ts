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

  async handle(
    ctx: DurableObjectState,
    ws: WebSocket,
    connections: Connections,
    storeConnection: (connection: Connection) => void,
  ): Promise<void> {
    const connection = connections.get(ws);
    if (connection === undefined) {
      errorConnectionNotFound();
      return;
    }
    const key = connection.subscriptions.get(this.#subscriptionId);
    if (key !== undefined) {
      await ctx.storage.delete(key);
    }
    connection.subscriptions.delete(this.#subscriptionId);
    storeConnection(connection);
  }
}
