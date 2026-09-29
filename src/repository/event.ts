import { NostrEvent } from "nostr-tools/core";
import { Filter } from "nostr-tools/filter";

export interface EventRepository {
  /** Resolves to false if the event is already stored. */
  save(event: NostrEvent, ipAddress: string | null): Promise<boolean>;
  saveReplaceableEvent(
    event: NostrEvent,
    ipAddress: string | null,
  ): Promise<void>;
  saveAddressableEvent(
    event: NostrEvent,
    ipAddress: string | null,
  ): Promise<void>;
  deleteBy(event: NostrEvent): Promise<void>;
  vanishBy(event: NostrEvent): Promise<void>;
  expire(until: number): Promise<void>;
  find(filter: Filter): Promise<NostrEvent[]>;
}
