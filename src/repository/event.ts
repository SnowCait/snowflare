import { Event, Filter } from "nostr-tools";

export interface EventRepository {
  save(event: Event): Promise<void>;
  saveReplaceableEvent(event: Event): Promise<void>;
  deleteBy(event: Event): Promise<void>;
  find(filter: Filter): Promise<Event[]>;
}
