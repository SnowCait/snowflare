import { Event, Filter } from "nostr-tools";

export interface EventRepository {
  put(event: Event): Promise<void>;
  list(filter: Filter): Promise<Event[]>;
}
