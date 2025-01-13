import { Event } from "nostr-tools";

export function reverseChronological(x: Event, y: Event): number {
  return y.created_at - x.created_at;
}
