import { Event } from "nostr-tools";
import { EventRepository } from "../event";

export class NoopEventRepository implements EventRepository {
  async save(): Promise<void> {}

  async find(): Promise<Event[]> {
    return [];
  }
}
