import { Event, Filter, sortEvents } from "nostr-tools";
import { MessageHandler } from "../handler";
import { Connection } from "../../connection";
import { EventRepository } from "../../repository/event";
import { validateFilter } from "../../nostr";
import { nip11 } from "../../config";

export class ReqMessageHandler implements MessageHandler {
  #subscriptionId: string;
  #filters: Filter[];
  #eventsRepository: EventRepository;

  constructor(
    subscriptionId: string,
    filters: Filter[],
    eventsRepository: EventRepository,
  ) {
    this.#subscriptionId = subscriptionId;
    this.#filters = filters;
    this.#eventsRepository = eventsRepository;
  }

  async handle(ctx: DurableObjectState, ws: WebSocket): Promise<void> {
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

    if (this.#filters.length > nip11.limitation.max_filters) {
      ws.send(
        JSON.stringify([
          "CLOSED",
          this.#subscriptionId,
          "unsupported: too many filters",
        ]),
      );
      return;
    }

    if (this.#filters.some((filter) => !validateFilter(filter))) {
      ws.send(
        JSON.stringify([
          "CLOSED",
          this.#subscriptionId,
          "unsupported: filters contain unsupported elements",
        ]),
      );
      return;
    }

    const connection = ws.deserializeAttachment() as Connection;
    const subscriptions =
      (await ctx.storage.get<Map<string, Filter[]>>(connection.id)) ??
      new Map<string, Filter[]>();
    subscriptions.set(this.#subscriptionId, this.#filters);
    if (subscriptions.size > nip11.limitation.max_subscriptions) {
      console.debug(
        "[too many subscriptions]",
        connection.id,
        subscriptions.size,
      );
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

    const promises = this.#filters.map((filter) =>
      this.#eventsRepository.find(filter),
    );
    const possibleDuplicateEvents = await Promise.all(promises);
    const events = possibleDuplicateEvents
      .flat()
      .reduce((distinctEvents, event): Event[] => {
        if (!distinctEvents.some((e) => e.id === event.id)) {
          distinctEvents.push(event);
        }
        return distinctEvents;
      }, []);
    for (const event of sortEvents(events)) {
      ws.send(JSON.stringify(["EVENT", this.#subscriptionId, event]));
    }

    ws.send(JSON.stringify(["EOSE", this.#subscriptionId]));
  }
}
