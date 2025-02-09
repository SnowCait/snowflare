import { Event, Filter } from "nostr-tools";
import { EventRepository } from "../../event";
import { Bindings } from "../../../app";
import { config, nip11 } from "../../../config";
import { reverseChronological } from "../../helper";
import { idsFilterKeys } from "../../../nostr";

export class KvD1EventRepository implements EventRepository {
  #env: Bindings;

  constructor(env: Bindings) {
    this.#env = env;
  }

  async save(event: Event): Promise<void> {
    await this.#saveToKV(event);
    await this.#saveToD1(event); // Execute after KV
  }

  async #saveToKV(event: Event): Promise<void> {
    await this.#env.events.put(event.id, JSON.stringify(event));
  }

  async #saveToD1(event: Event): Promise<void> {
    await this.#env.DB.prepare(
      "INSERT INTO events VALUES (UNHEX(?), UNHEX(?), ?, ?)",
    )
      .bind(event.id, event.pubkey, event.kind, event.created_at)
      .run();
  }

  async find(filter: Filter): Promise<Event[]> {
    if (
      Object.keys(filter).every((key) => idsFilterKeys.includes(key)) &&
      Array.isArray(filter.ids) &&
      filter.ids.length <= nip11.limitation.max_limit
    ) {
      return this.#findByIds(filter.ids);
    } else {
      return this.#findByQuery(filter);
    }
  }

  async #findByIds(ids: string[]): Promise<Event[]> {
    const events = await Promise.all(
      ids.map(async (id) => {
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

  async #findByQuery(filter: Filter): Promise<Event[]> {
    const wheres: string[] = [];
    const params: string[] = [];

    if (filter.ids !== undefined) {
      wheres.push(
        `id IN (${filter.ids.map((id) => `UNHEX("${id}")`).join(",")})`,
      );
    }

    if (filter.authors !== undefined) {
      wheres.push(
        `pubkey IN (${filter.authors.map((pubkey) => `UNHEX("${pubkey}")`).join(",")})`,
      );
    }

    if (filter.kinds !== undefined) {
      wheres.push(`kind IN (${filter.kinds.join(",")})`);
    }

    if (filter.since !== undefined) {
      wheres.push(`created_at >= ${filter.since}`);
    }

    if (filter.until !== undefined) {
      wheres.push(`created_at <= ${filter.until}`);
    }

    const select = "SELECT LOWER(HEX(id)) as id FROM events";
    const orderBy = "ORDER BY created_at DESC";
    const limit = `LIMIT ${filter.limit ?? config.default_limit}`;

    const query = (
      wheres.length > 0
        ? [select, "WHERE", wheres.join(" AND "), orderBy, limit]
        : [select, orderBy, limit]
    ).join(" ");

    const { results } = await this.#env.DB.prepare(query)
      .bind(...params)
      .run<{ id: string }>();

    return this.#findByIds(results.map(({ id }) => id));
  }
}
