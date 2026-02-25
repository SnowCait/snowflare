import { NostrEvent } from "nostr-tools/core";
import { Filter } from "nostr-tools/filter";

export interface EventRepository {
  save(event: NostrEvent, ipAddress: string | null): Promise<void>;
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
  find(filter: Filter): Promise<NostrEvent[]>;
}
