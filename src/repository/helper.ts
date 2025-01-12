import { Event, Filter } from "nostr-tools";

export const hexRegExp = /^[0-9a-z]{64}$/;

export const idsFilterKeys: string[] = ["ids", "limit"] satisfies Array<
  keyof Pick<Filter, "ids" | "limit">
>;

export function reverseChronological(x: Event, y: Event): number {
  return y.created_at - x.created_at;
}
