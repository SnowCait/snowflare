import { Filter } from "nostr-tools/filter";
import { Connection } from "../../connection";
import { MessageHandler } from "../handler";

export class CloseMessageHandler implements MessageHandler {
  #subscriptionId: string;

  constructor(subscriptionId: string) {
    this.#subscriptionId = subscriptionId;
  }

  async handle(ctx: DurableObjectState, ws: WebSocket): Promise<void> {
    const connection = ws.deserializeAttachment() as Connection;
    const subscriptions = await ctx.storage.get<Map<string, Filter[]>>(
      connection.id,
    );
    if (subscriptions === undefined) {
      return;
    }
    subscriptions.delete(this.#subscriptionId);
    await ctx.storage.put(connection.id, subscriptions);
  }
}
