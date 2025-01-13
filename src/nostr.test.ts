import { describe, expect, it } from "vitest";
import { validateFilter } from "./nostr";

describe("validate filter", () => {
  it("{}", () => {
    expect(validateFilter({})).toBe(true);
  });
  it("ids", () => {
    expect(validateFilter({ ids: "" as any })).toBe(false); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(validateFilter({ ids: [] })).toBe(false);
    expect(
      validateFilter({
        ids: [
          "0000000000000000000000000000000000000000000000000000000000000000",
        ],
      }),
    ).toBe(true);
    expect(
      validateFilter({
        ids: [""],
      }),
    ).toBe(false);
    expect(
      validateFilter({
        ids: [1 as any], // eslint-disable-line @typescript-eslint/no-explicit-any
      }),
    ).toBe(false);
  });
  it("authors", () => {
    expect(validateFilter({ authors: "" as any })).toBe(false); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(validateFilter({ authors: [] })).toBe(false);
    expect(
      validateFilter({
        authors: [
          "0000000000000000000000000000000000000000000000000000000000000000",
        ],
      }),
    ).toBe(true);
    expect(
      validateFilter({
        authors: [""],
      }),
    ).toBe(false);
    expect(
      validateFilter({
        authors: [1 as any], // eslint-disable-line @typescript-eslint/no-explicit-any
      }),
    ).toBe(false);
    expect(
      validateFilter({
        ids: [1 as any], // eslint-disable-line @typescript-eslint/no-explicit-any
      }),
    ).toBe(false);
  });
  it("kinds", () => {
    expect(validateFilter({ kinds: 0 as any })).toBe(false); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(validateFilter({ kinds: [] })).toBe(false);
    expect(
      validateFilter({
        kinds: [0],
      }),
    ).toBe(true);
    expect(
      validateFilter({
        kinds: [-1],
      }),
    ).toBe(false);
    expect(
      validateFilter({
        kinds: [0, 65536],
      }),
    ).toBe(false);
    expect(
      validateFilter({
        kinds: ["" as any], // eslint-disable-line @typescript-eslint/no-explicit-any
      }),
    ).toBe(false);
  });
  it("since", () => {
    expect(validateFilter({ since: 0 })).toBe(true);
    expect(validateFilter({ since: "" as any })).toBe(false); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(validateFilter({ since: -1 })).toBe(false);
  });
  it("until", () => {
    expect(validateFilter({ until: 0 })).toBe(true);
    expect(validateFilter({ until: "" as any })).toBe(false); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(validateFilter({ until: -1 })).toBe(false);
  });
  it("since", () => {
    expect(validateFilter({ limit: 1 })).toBe(true);
    expect(validateFilter({ limit: "" as any })).toBe(false); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(validateFilter({ limit: 0 })).toBe(false);
  });
  it("tags", () => {
    expect(validateFilter({ "#t": [] })).toBe(false);
    expect(validateFilter({ "#t": ["test"] })).toBe(true);
    expect(validateFilter({ "#t": [""] })).toBe(false);
    expect(validateFilter({ "#t": [0 as any] })).toBe(false); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(validateFilter({ "#e": ["0"] })).toBe(false);
    expect(validateFilter({ "#E": ["0"] })).toBe(false);
    expect(validateFilter({ "#p": ["0"] })).toBe(false);
    expect(validateFilter({ "#P": ["0"] })).toBe(false);
    expect(validateFilter({ "#q": ["0"] })).toBe(false);
    expect(
      validateFilter({
        "#e": [
          "0000000000000000000000000000000000000000000000000000000000000000",
        ],
        "#p": [
          "0000000000000000000000000000000000000000000000000000000000000000",
        ],
      }),
    ).toBe(true);
    expect(
      validateFilter({
        "#e": [
          "0000000000000000000000000000000000000000000000000000000000000000",
        ],
        "#p": ["0"],
      }),
    ).toBe(false);
    expect(validateFilter({ unknown: ["test"] } as any)).toBe(false); // eslint-disable-line @typescript-eslint/no-explicit-any
  });
  it("search", () => {
    expect(validateFilter({ search: "test" })).toBe(false); // Unsupported
  });
});
