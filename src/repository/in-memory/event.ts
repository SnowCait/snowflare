import { Event, Filter, matchFilter } from "nostr-tools";
import { EventRepository } from "../event";
import { config, nip11 } from "../../config";
import { reverseChronological } from "../helper";

export class InMemoryEventRepository implements EventRepository {
  #events = new Map<string, Event>();

  async save(event: Event): Promise<void> {
    this.#events.set(event.id, event);
  }

  async find(filter: Filter): Promise<Event[]> {
    const limit = Math.min(
      filter.limit ?? config.default_limit,
      nip11.limitation.max_limit,
    );
    return [...this.#events.values()]
      .filter((event) => matchFilter(filter, event))
      .toSorted(reverseChronological)
      .slice(0, limit);
  }
}
