import { Event, Filter, sortEvents } from "nostr-tools";
import { EventRepository } from "../../event";
import { Bindings } from "../../../app";
import { config, nip11 } from "../../../config";
import {
  hexRegExp,
  hexTagKeys,
  idsFilterKeys,
  tagsFilterRegExp,
} from "../../../nostr";
import { EventDeletion } from "nostr-tools/kinds";
import Cloudflare from "cloudflare";

export class KvD1EventRepository implements EventRepository {
  #env: Bindings;

  constructor(env: Bindings) {
    this.#env = env;
  }

  async save(event: Event, ipAddress: string | null): Promise<void> {
    await this.#saveToKV(event, ipAddress);
    await this.#saveToD1(event); // Execute after KV
  }

  async #saveToKV(event: Event, ipAddress: string | null): Promise<void> {
    await this.#env.events.put(event.id, JSON.stringify(event), {
      metadata: { ipAddress, receivedAt: Date.now() },
    });
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

    console.debug("[save event]", { event });

    const result = await this.#env.DB.batch<void>(statements);
    console.debug("[save result]", { result });
  }

  async saveReplaceableEvent(
    event: Event,
    ipAddress: string | null,
  ): Promise<void> {
    const { results } = await this.#env.DB.prepare(
      "SELECT LOWER(HEX(id)) as id, created_at FROM events WHERE kind = ? AND pubkey = UNHEX(?) ORDER BY created_at DESC",
    )
      .bind(event.kind, event.pubkey)
      .run<{ id: string; created_at: number }>();

    console.debug("[existing replaceable event]", { results });

    await this.#saveLatestEvent(event, results, ipAddress);
  }

  async saveAddressableEvent(
    event: Event,
    ipAddress: string | null,
  ): Promise<void> {
    const identifier = event.tags.find(([name]) => name === "d")?.at(1) ?? "";
    const { results } = await this.#env.DB.prepare(
      `
      SELECT LOWER(HEX(id)) as id, created_at FROM events
      WHERE kind = ? AND pubkey = UNHEX(?) AND EXISTS(SELECT 1 FROM tags WHERE events.id = tags.id AND tags.name = "d" AND tags.value = ?)
      ORDER BY created_at DESC
      `,
    )
      .bind(event.kind, event.pubkey, identifier)
      .run<{ id: string; created_at: number }>();

    console.debug("[existing addressable event]", { results });

    await this.#saveLatestEvent(event, results, ipAddress);
  }

  async #saveLatestEvent(
    event: Event,
    results: { id: string; created_at: number }[],
    ipAddress: string | null,
  ): Promise<void> {
    if (results.length === 0) {
      await this.save(event, ipAddress);
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

    await this.#delete(results.map(({ id }) => id));
    await this.save(event, ipAddress);
  }

  /**
   * If it is inserted between select and delete, it may not be possible to delete it,
   * but this is a rare case and considering the D1 cost (to use covering index), it is allowed at the moment.
   * If this is not acceptable, process everything in a batch.
   */
  async deleteBy(event: Event): Promise<void> {
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
    await this.#delete(deleteIds);
  }

  async #delete(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    const result = await this.#env.DB.batch([
      this.#env.DB.prepare(
        `DELETE FROM events WHERE id IN (${ids.map((id) => `UNHEX("${id}")`).join(",")})`,
      ),
      this.#env.DB.prepare(
        `DELETE FROM tags WHERE id IN (${ids.map((id) => `UNHEX("${id}")`).join(",")})`,
      ),
    ]);
    console.debug("[delete result]", { result });

    for (const id of ids) {
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
    // Workaround: The local environment runs on Miniflare but cannot be accessed via the REST API.
    if (this.#env.LOCAL === "true") {
      const events = await Promise.all(
        ids.map(async (id) => {
          try {
            const json = await this.#env.events.get(id);
            if (json === null) {
              return null;
            }
            return JSON.parse(json) as Event;
          } catch (error) {
            console.error("[json parse failed]", error, `(${ids.length})`);
            return null;
          }
        }),
      );
      return sortEvents(events.filter((event) => event !== null));
    } else {
      const chunk = <T>(array: T[], size: number): T[][] =>
        Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
          array.slice(i * size, i * size + size),
        );

      const client = new Cloudflare({ apiToken: this.#env.API_TOKEN });
      const events = await Promise.all(
        chunk(ids, 100).map(async (ids: string[]): Promise<Event[]> => {
          const response = await client.kv.namespaces.keys.bulkGet(
            this.#env.KV_ID_EVENTS,
            {
              account_id: this.#env.ACCOUNT_ID,
              keys: ids.slice(0, 100),
              type: "json",
            },
          );
          return Object.values(response?.values ?? {}).filter(
            (v) => v !== null,
          );
        }),
      );
      return sortEvents(events.flat());
    }
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
          console.error("[logic error]", { filter });
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
      console.error("[too many bound parameters]", params.length, { filter });
    }

    const select = "SELECT LOWER(HEX(id)) as id FROM events";
    const orderBy = "ORDER BY created_at DESC";
    const limit = `LIMIT ${filter.limit ?? config.default_limit}`;

    const query = (
      wheres.length > 0
        ? [select, "WHERE", wheres.join(" AND "), orderBy, limit]
        : [select, orderBy, limit]
    ).join(" ");
    console.debug("[find SQL]", query, { params, filter });

    const result = await this.#env.DB.prepare(query)
      .bind(...params)
      .run<{ id: string }>();
    console.debug("[find result]", {
      ...result,
      results: result.results.length,
      filter,
    });

    return this.#findByIds(result.results.map(({ id }) => id));
  }
}
