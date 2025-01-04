import { Event } from "nostr-tools";
import { EventRepository } from "../event";

export class NoopEventRepository implements EventRepository {
  async put(): Promise<void> {}

  async list(): Promise<Event[]> {
    return [];
  }
}
