import { Bindings } from "../app";
import { EventRepository } from "./event";
import { InMemoryEventRepository } from "./in-memory/event";
import { KvD1EventRepository } from "./kv/d1/event";

export type RepositoryType = "in-memory" | "kv-d1";

export class RepositoryFactory {
  static create(type: RepositoryType, env: Bindings): EventRepository {
    switch (type) {
      case "in-memory": {
        return new InMemoryEventRepository();
      }
      case "kv-d1": {
        return new KvD1EventRepository(env);
      }
      default: {
        throw new TypeError(`${type} is not supported.`);
      }
    }
  }
}
