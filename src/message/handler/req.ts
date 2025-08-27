import { Filter } from "nostr-tools";
import { MessageHandler } from "../handler";
import { Connection } from "../../connection";
import { EventRepository } from "../../repository/event";
import { validateFilter } from "../../nostr";
import { nip11 } from "../../config";

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

    if (this.#subscriptionId.length > nip11.limitation.max_subid_length) {
      console.debug("[too long subscription id]", this.#subscriptionId);
      ws.send(
        JSON.stringify([
          "CLOSED",
          this.#subscriptionId,
          "unsupported: too long subscription id",
        ]),
      );
      return;
    }

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

    const connection = ws.deserializeAttachment() as Connection;
    const subscriptions =
      (await ctx.storage.get<Map<string, Filter[]>>(connection.id)) ??
      new Map<string, Filter[]>();
    console.debug("[subscriptions]", connection.id, subscriptions);
    subscriptions.set(this.#subscriptionId, [this.#filter]);
    if (subscriptions.size > nip11.limitation.max_subscriptions) {
      console.debug("[too many subscriptions]", { connection });
      ws.send(
        JSON.stringify([
          "CLOSED",
          this.#subscriptionId,
          "unsupported: too many subscriptions",
        ]),
      );
      return;
    }

    await ctx.storage.put(connection.id, subscriptions);

    const events = await this.#eventsRepository.find(this.#filter);
    for (const event of events) {
      ws.send(JSON.stringify(["EVENT", this.#subscriptionId, event]));
    }

    ws.send(JSON.stringify(["EOSE", this.#subscriptionId]));
  }
}
