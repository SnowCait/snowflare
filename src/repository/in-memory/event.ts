import { Event, Filter, matchFilter } from "nostr-tools";
import { EventRepository } from "../event";
import { nip11 } from "../../config";

export class InMemoryEventRepository implements EventRepository {
  #events = new Map<string, Event>();

  async put(event: Event): Promise<void> {
    this.#events.set(event.id, event);
  }

  async list(filter: Filter): Promise<Event[]> {
    const limit = Math.min(
      filter.limit ?? nip11.limitation.max_limit,
      nip11.limitation.max_limit,
    );
    return [...this.#events]
      .filter(([, event]) => matchFilter(filter, event))
      .toSorted(([, x], [, y]) => y.created_at - x.created_at)
      .slice(0, limit)
      .map(([, event]) => event);
  }
}
