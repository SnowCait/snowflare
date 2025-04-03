import { Connection } from "../../connection";
import { MessageHandler } from "../handler";

export class CloseMessageHandler implements MessageHandler {
  #subscriptionId: string;

  constructor(subscriptionId: string) {
    this.#subscriptionId = subscriptionId;
  }

  async handle(ctx: DurableObjectState, ws: WebSocket): Promise<void> {
    console.debug("[CLOSE]", this.#subscriptionId);

    const connection = ws.deserializeAttachment() as Connection;
    const key = connection.subscriptions.get(this.#subscriptionId);
    if (key !== undefined) {
      await ctx.storage.delete(key);
    }
    connection.subscriptions.delete(this.#subscriptionId);
    ws.serializeAttachment(connection);
  }
}
