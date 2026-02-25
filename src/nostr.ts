import { NostrEvent } from "nostr-tools/core";
import { Filter, matchFilter } from "nostr-tools/filter";
import { NostrConnect } from "nostr-tools/kinds";
import { nip11 } from "./config";

export const hexRegExp = /^[0-9a-f]{64}$/;
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

  // NIP-46
  if (
    filter.kinds !== undefined &&
    filter.kinds.includes(NostrConnect) &&
    filter["#p"] === undefined
  ) {
    return false;
  }

  return true;
}

export function broadcastable(filter: Filter, event: NostrEvent): boolean {
  if (!matchFilter(filter, event)) {
    return false;
  }

  // NIP-46
  if (event.kind === NostrConnect && filter["#p"] === undefined) {
    return false;
  }

  return true;
}

//#region NIP-62 Request to Vanish

export const RequestToVanish = 62;
export type RequestToVanish = typeof RequestToVanish;

export function isVanishTarget(event: NostrEvent, url: string): boolean {
  const relays = event.tags
    .filter((tag) => tag[0] === "relay" && typeof tag[1] === "string")
    .map(([, url]) => url);
  return relays.some(
    (relay) =>
      relay === "ALL_RELAYS" ||
      (URL.canParse(relay) && new URL(relay).origin === new URL(url).origin),
  );
}

//#endregion
