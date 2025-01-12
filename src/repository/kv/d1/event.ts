import { Event, Filter } from "nostr-tools";
import { EventRepository } from "../../event";
import { Bindings } from "../../../app";
import { nip11 } from "../../../config";
import { hexRegExp, idsFilterKeys, reverseChronological } from "../../helper";

export class KvD1EventRepository implements EventRepository {
  #env: Bindings;

  constructor(env: Bindings) {
    this.#env = env;
  }

  async save(event: Event): Promise<void> {
    await this.#saveToKV(event);
    // TODO: Save id, pubkey, kind, tags, created_at to D1 for REQ
  }

  async #saveToKV(event: Event): Promise<void> {
    await this.#env.events.put(event.id, JSON.stringify(event));
  }

  async find(filter: Filter): Promise<Event[]> {
    if (
      Object.keys(filter).every((key) => idsFilterKeys.includes(key)) &&
      Array.isArray(filter.ids) &&
      filter.ids.length <= nip11.limitation.max_limit
    ) {
      return this.#findByIds(filter.ids);
    } else {
      // TODO
      return [];
    }
  }

  async #findByIds(ids: string[]): Promise<Event[]> {
    const events = await Promise.all(
      ids
        .filter((id) => hexRegExp.test(id))
        .map(async (id) => {
          try {
            const json = await this.#env.events.get(id);
            if (json === null) {
              return null;
            }
            return JSON.parse(json) as Event;
          } catch (error) {
            console.error("[json parse failed]", error);
            return null;
          }
        }),
    );
    return events
      .filter((event) => event !== null)
      .toSorted(reverseChronological);
  }
}
