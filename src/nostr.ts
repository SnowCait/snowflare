import { Filter } from "nostr-tools";
import { nip11 } from "./config";

export const hexRegExp = /^[0-9a-z]{64}$/;
export const tagsFilterRegExp = /^#[a-zA-Z]$/;

export const idsFilterKeys: string[] = ["ids", "limit"] satisfies Array<
  keyof Pick<Filter, "ids" | "limit">
>;
export const nonTagKeys: string[] = [
  "ids",
  "authors",
  "kinds",
  "since",
  "until",
  "limit",
] satisfies Array<
  keyof Pick<Filter, "ids" | "authors" | "kinds" | "since" | "until" | "limit">
>;
export const hexTagKeys: string[] = [
  "#e",
  "#E",
  "#p",
  "#P",
  "#q",
] satisfies Array<keyof Pick<Filter, "#e" | "#E" | "#p" | "#P" | "#q">>;

export function validateFilter(filter: Filter): boolean {
  if (
    filter.ids !== undefined &&
    !(
      Array.isArray(filter.ids) &&
      filter.ids.length > 0 &&
      filter.ids.every((id) => hexRegExp.test(id))
    )
  ) {
    return false;
  }

  if (
    filter.authors !== undefined &&
    !(
      Array.isArray(filter.authors) &&
      filter.authors.length > 0 &&
      filter.authors.every((pubkey) => hexRegExp.test(pubkey))
    )
  ) {
    return false;
  }

  if (
    filter.kinds !== undefined &&
    !(
      Array.isArray(filter.kinds) &&
      filter.kinds.length > 0 &&
      filter.kinds.every(
        (kind) => Number.isInteger(kind) && 0 <= kind && kind <= 65535,
      )
    )
  ) {
    return false;
  }

  if (
    filter.since !== undefined &&
    !(Number.isInteger(filter.since) && filter.since >= 0)
  ) {
    return false;
  }

  if (
    filter.until !== undefined &&
    !(Number.isInteger(filter.until) && filter.until >= 0)
  ) {
    return false;
  }

  if (
    filter.limit !== undefined &&
    !(
      Number.isInteger(filter.limit) &&
      0 < filter.limit &&
      filter.limit <= nip11.limitation.max_limit
    )
  ) {
    return false;
  }

  if (
    !Object.entries(filter)
      .filter(([key]) => !nonTagKeys.includes(key))
      .every(
        ([key, value]) =>
          tagsFilterRegExp.test(key) &&
          Array.isArray(value) &&
          value.length > 0 &&
          value.every((v) => typeof v === "string") &&
          (!hexTagKeys.includes(key) || value.every((v) => hexRegExp.test(v))),
      )
  ) {
    return false;
  }

  return true;
}
