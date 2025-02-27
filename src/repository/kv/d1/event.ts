import { Event, Filter } from "nostr-tools";
import { EventRepository } from "../../event";
import { Bindings } from "../../../app";
import { config, nip11 } from "../../../config";
import { reverseChronological } from "../../helper";
import {
  hexRegExp,
  hexTagKeys,
  idsFilterKeys,
  tagsFilterRegExp,
} from "../../../nostr";
import { EventDeletion } from "nostr-tools/kinds";

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
    const statements: D1PreparedStatement[] = [];
    statements.push(
      this.#env.DB.prepare(
        "INSERT INTO events VALUES (UNHEX(?), UNHEX(?), ?, ?)",
      ).bind(event.id, event.pubkey, event.kind, event.created_at),
    );
    for (const [name, value] of event.tags.filter(
      ([name, value]) =>
        tagsFilterRegExp.test(`#${name}`) && typeof value === "string",
    )) {
      statements.push(
        this.#env.DB.prepare(
          "INSERT INTO tags VALUES (UNHEX(?), ?, ?, ? , ?)",
        ).bind(event.id, event.kind, name, value, event.created_at),
      );
    }

    console.debug("[save event]", event);

    const result = await this.#env.DB.batch<void>(statements);
    console.debug("[save result]", result);
  }

  async delete(event: Event): Promise<void> {
    const ids = event.tags
      .filter(([name, value]) => name === "e" && hexRegExp.test(value))
      .map(([, id]) => id);
    const uniqueIds = [...new Set(ids)];

    if (uniqueIds.length === 0) {
      return;
    }

    const { results } = await this.#env.DB.prepare(
      `SELECT LOWER(HEX(id)) as id, LOWER(HEX(pubkey)) as pubkey, kind FROM events WHERE id IN (${uniqueIds.map((id) => `UNHEX("${id}")`).join(",")})`,
    ).run<{ id: string; pubkey: string; kind: number }>();
    const deleteIds = results
      .filter(
        ({ pubkey, kind }) => pubkey === event.pubkey && kind !== EventDeletion,
      )
      .map(({ id }) => id);

    if (deleteIds.length === 0) {
      return;
    }

    const statements: D1PreparedStatement[] = [];
    statements.push(
      this.#env.DB.prepare(
        `DELETE FROM events WHERE id IN (${deleteIds.map((id) => `UNHEX("${id}")`).join(",")})`,
      ),
      this.#env.DB.prepare(
        `DELETE FROM tags WHERE id IN (${deleteIds.map((id) => `UNHEX("${id}")`).join(",")})`,
      ),
    );
    const result = await this.#env.DB.batch(statements);
    console.debug("[delete result]", result);

    for (const id of deleteIds) {
      await this.#env.events.delete(id);
    }
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

    const tagsFilter = Object.entries(filter).filter(([key]) =>
      key.startsWith("#"),
    );
    if (tagsFilter.length > 0) {
      const tagsWheres: string[] = [];
      for (const [key, values] of tagsFilter) {
        // For type inference
        if (
          !Array.isArray(values) ||
          !values.every((v) => typeof v === "string")
        ) {
          console.error("[logic error]", filter);
          continue;
        }

        const uniqueValues = [...new Set(values)];
        if (hexTagKeys.includes(key)) {
          tagsWheres.push(
            `(tags.name = "${key[1]}" AND tags.value IN (${uniqueValues.map((v) => `"${v}"`).join(",")}))`,
          );
        } else {
          tagsWheres.push(
            `(tags.name = "${key[1]}" AND tags.value IN (${uniqueValues.map(() => "?").join(",")}))`,
          );
          params.push(...uniqueValues);
        }
      }
      wheres.push(
        `EXISTS(SELECT 1 FROM tags WHERE events.id = tags.id AND (${tagsWheres.join(" AND ")}))`,
      );
    }

    // D1 limit
    if (params.length > 100) {
      console.error("[too many bound parameters]", params.length, filter);
    }

    const select = "SELECT LOWER(HEX(id)) as id FROM events";
    const orderBy = "ORDER BY created_at DESC";
    const limit = `LIMIT ${filter.limit ?? config.default_limit}`;

    const query = (
      wheres.length > 0
        ? [select, "WHERE", wheres.join(" AND "), orderBy, limit]
        : [select, orderBy, limit]
    ).join(" ");
    console.debug("[find SQL]", query, JSON.stringify(params), filter);

    const result = await this.#env.DB.prepare(query)
      .bind(...params)
      .run<{ id: string }>();
    console.debug("[find result]", result);

    return this.#findByIds(result.results.map(({ id }) => id));
  }
}
