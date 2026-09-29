import { NostrEvent } from "nostr-tools/core";
import { EventRepository } from "../event";

export class NoopEventRepository implements EventRepository {
  async save(): Promise<boolean> {
    return true;
  }

  async saveReplaceableEvent(): Promise<void> {}

  async saveAddressableEvent(): Promise<void> {}

  async deleteBy(): Promise<void> {}

  async vanishBy(): Promise<void> {}

  async expire(): Promise<void> {}

  async find(): Promise<NostrEvent[]> {
    return [];
  }
}
