import { Event, Filter, matchFilter, sortEvents } from "nostr-tools";
import { EventRepository } from "../event";
import { config, nip11 } from "../../config";
import { hexRegExp } from "../../nostr";
import { EventDeletion } from "nostr-tools/kinds";

export class InMemoryEventRepository implements EventRepository {
  #events = new Map<string, Event>();

  async save(event: Event): Promise<void> {
    this.#events.set(event.id, event);
  }

  async saveReplaceableEvent(event: Event): Promise<void> {
    const results = [...this.#events]
      .filter(([, e]) => e.kind === event.kind && e.pubkey === event.pubkey)
      .map(([, e]) => e);
    console.debug("[existing replaceable event]", results);

    if (results.length === 0) {
      await this.save(event);
      return;
    }

    const latest = results[0];
    if (
      latest.created_at > event.created_at ||
      (latest.created_at === event.created_at &&
        event.id.localeCompare(latest.id) >= 0)
    ) {
      return;
    }

    for (const e of results) {
      this.#events.delete(e.id);
    }
    await this.save(event);
  }

  async deleteBy(event: Event): Promise<void> {
    const ids = event.tags
      .filter(([name, value]) => name === "e" && hexRegExp.test(value))
      .map(([, id]) => id);
    const uniqueIds = [...new Set(ids)];
    for (const id of uniqueIds) {
      const e = this.#events.get(id);
      if (
        e === undefined ||
        e.pubkey !== event.pubkey ||
        e.kind === EventDeletion
      ) {
        continue;
      }
      this.#events.delete(id);
    }
  }

  async find(filter: Filter): Promise<Event[]> {
    const limit = Math.min(
      filter.limit ?? config.default_limit,
      nip11.limitation.max_limit,
    );
    return sortEvents(
      [...this.#events.values()].filter((event) => matchFilter(filter, event)),
    ).slice(0, limit);
  }
}
