import { Filter } from "nostr-tools";
import { MessageHandler } from "../handler";
import { Connection } from "../../connection";
import { EventRepository } from "../../repository/event";
import { validateFilter } from "../../nostr";

export class ReqMessageHandler implements MessageHandler {
  #subscriptionId: string;
  #filter: Filter;
  #eventsRepository: EventRepository;

  constructor(
    subscriptionId: string,
    filter: Filter,
    eventsRepository: EventRepository,
  ) {
    this.#subscriptionId = subscriptionId;
    this.#filter = filter;
    this.#eventsRepository = eventsRepository;
  }

  async handle(ctx: DurableObjectState, ws: WebSocket): Promise<void> {
    console.debug("[REQ]", { filter: this.#filter });

    const connection = ws.deserializeAttachment() as Connection;

    if (!validateFilter(this.#filter)) {
      console.debug("[unsupported filter]", { filter: this.#filter });
      ws.send(
        JSON.stringify([
          "CLOSED",
          this.#subscriptionId,
          "unsupported: filter contains unsupported elements",
        ]),
      );
      return;
    }

    const key = crypto.randomUUID();
    await ctx.storage.put(key, this.#filter);
    if (connection.subscriptions.has(this.#subscriptionId)) {
      await ctx.storage.delete(
        connection.subscriptions.get(this.#subscriptionId)!,
      );
    }
    connection.subscriptions.set(this.#subscriptionId, key);
    try {
      ws.serializeAttachment(connection);
    } catch (error) {
      console.error(
        `[ws serialize attachment error] ${error} (${connection.subscriptions.size})`,
        {
          connection,
        },
      );
    }

    const events = await this.#eventsRepository.find(this.#filter);
    for (const event of events) {
      ws.send(JSON.stringify(["EVENT", this.#subscriptionId, event]));
    }

    ws.send(JSON.stringify(["EOSE", this.#subscriptionId]));
  }
}
