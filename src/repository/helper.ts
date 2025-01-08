import { Event } from "nostr-tools";

export const hexRegExp = /^[0-9a-z]{64}$/;

export function reverseChronological(x: Event, y: Event): number {
  return y.created_at - x.created_at;
}
