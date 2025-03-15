import { Event, Filter } from "nostr-tools";

export interface EventRepository {
  save(event: Event, ipAddress: string | null): Promise<void>;
  saveReplaceableEvent(event: Event, ipAddress: string | null): Promise<void>;
  saveAddressableEvent(event: Event, ipAddress: string | null): Promise<void>;
  deleteBy(event: Event): Promise<void>;
  find(filter: Filter): Promise<Event[]>;
}
