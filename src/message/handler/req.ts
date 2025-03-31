import { Filter } from "nostr-tools";
import { MessageHandler } from "../handler";
import {
  Connection,
  Connections,
  errorConnectionNotFound,
} from "../../connection";
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

    if (!validateFilter(this.#filter)) {
      console.debug({ message: "[unsupported filter]", filter: this.#filter });
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
    const { subscriptions } = connection;
    if (subscriptions.has(this.#subscriptionId)) {
      await ctx.storage.delete(subscriptions.get(this.#subscriptionId)!);
    }
    subscriptions.set(this.#subscriptionId, key);
    storeConnection({ ...connection, subscriptions });

    const events = await this.#eventsRepository.find(this.#filter);
    for (const event of events) {
      ws.send(JSON.stringify(["EVENT", this.#subscriptionId, event]));
    }

    ws.send(JSON.stringify(["EOSE", this.#subscriptionId]));
  }
}
