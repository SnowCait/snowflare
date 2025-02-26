import { Event, Filter } from "nostr-tools";

export interface EventRepository {
  save(event: Event): Promise<void>;
  delete(event: Event): Promise<void>;
  find(filter: Filter): Promise<Event[]>;
}
