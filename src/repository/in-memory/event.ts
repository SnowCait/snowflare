import { NostrEvent, sortEvents } from "nostr-tools/core";
import { Filter, matchFilter } from "nostr-tools/filter";
import { EventRepository } from "../event";
import { config, nip11 } from "../../config";
import { hexRegExp, RequestToVanish } from "../../nostr";
import { EventDeletion, GiftWrap } from "nostr-tools/kinds";

export class InMemoryEventRepository implements EventRepository {
  #events = new Map<string, NostrEvent>();

  async save(event: NostrEvent): Promise<void> {
    this.#events.set(event.id, event);
  }

  async saveReplaceableEvent(event: NostrEvent): Promise<void> {
    const results = [...this.#events]
      .filter(([, e]) => e.kind === event.kind && e.pubkey === event.pubkey)
      .map(([, e]) => e);
    console.debug("[existing replaceable event]", { results });

    await this.#saveLatestEvent(event, results);
  }

  async saveAddressableEvent(event: NostrEvent): Promise<void> {
    const identifier = event.tags.find(([name]) => name === "d")?.at(1) ?? "";
    const results = [...this.#events]
      .filter(
        ([, e]) =>
          e.kind === event.kind &&
          e.pubkey === event.pubkey &&
          e.tags.find(([name, value]) => name === "d" && value === identifier),
      )
      .map(([, e]) => e);
    console.debug("[existing addressable event]", { results });

    await this.#saveLatestEvent(event, results);
  }

  async #saveLatestEvent(
    event: NostrEvent,
    results: { id: string; created_at: number }[],
  ): Promise<void> {
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

  async deleteBy(event: NostrEvent): Promise<void> {
    const ids = event.tags
      .filter(([name, value]) => name === "e" && hexRegExp.test(value))
      .map(([, id]) => id);
    const uniqueIds = [...new Set(ids)];
    for (const id of uniqueIds) {
      const e = this.#events.get(id);
      if (
        e === undefined ||
        e.pubkey !== event.pubkey ||
        e.kind === EventDeletion ||
        e.kind === RequestToVanish
      ) {
        continue;
      }
      this.#events.delete(id);
    }
  }

  async vanishBy(event: NostrEvent): Promise<void> {
    for (const [id, e] of this.#events) {
      if (e.created_at > event.created_at) {
        continue;
      }

      if (e.pubkey === event.pubkey) {
        this.#events.delete(id);
      } else if (
        e.kind === GiftWrap &&
        e.tags.some((tag) => tag[0] === "p" && tag[1] === event.pubkey)
      ) {
        this.#events.delete(id);
      }
    }
  }

  async find(filter: Filter): Promise<NostrEvent[]> {
    const limit = Math.min(
      filter.limit ?? config.default_limit,
      nip11.limitation.max_limit,
    );
    return sortEvents(
      [...this.#events.values()].filter((event) => matchFilter(filter, event)),
    ).slice(0, limit);
  }
}
