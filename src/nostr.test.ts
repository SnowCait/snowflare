import { describe, expect, it } from "vitest";
import {
  broadcastable,
  isVanishTarget,
  RequestToVanish,
  validateFilter,
} from "./nostr";
import { finalizeEvent, generateSecretKey } from "nostr-tools/pure";
import { NostrConnect } from "nostr-tools/kinds";

describe("validate filter", () => {
  it("all", () => {
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
  it("limit", () => {
    expect(validateFilter({ limit: 0 })).toBe(false);
    expect(validateFilter({ limit: 1 })).toBe(true);
    expect(validateFilter({ limit: 500 })).toBe(true);
    expect(validateFilter({ limit: 501 })).toBe(false);
    expect(validateFilter({ limit: "" as any })).toBe(false); // eslint-disable-line @typescript-eslint/no-explicit-any
  });
  it("tags", () => {
    expect(validateFilter({ "#t": [] })).toBe(false);
    expect(validateFilter({ "#t": ["test"] })).toBe(true);
    expect(validateFilter({ "#d": [""] })).toBe(true);
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
  it("nostr connect", () => {
    expect(
      validateFilter({
        kinds: [NostrConnect],
        "#p": [
          "0000000000000000000000000000000000000000000000000000000000000000",
        ],
      }),
    ).toBe(true);
    expect(
      validateFilter({
        "#p": [
          "0000000000000000000000000000000000000000000000000000000000000000",
        ],
      }),
    ).toBe(true);
    expect(
      validateFilter({
        kinds: [NostrConnect],
      }),
    ).toBe(false);
  });
});

describe("broadcastable", () => {
  const seckey = generateSecretKey();
  const normalEvent = finalizeEvent(
    { kind: 1, content: "", tags: [], created_at: 0 },
    seckey,
  );
  const nostrConnectEvent = finalizeEvent(
    {
      kind: NostrConnect,
      content: "",
      tags: [
        [
          "p",
          "0000000000000000000000000000000000000000000000000000000000000000",
        ],
      ],
      created_at: 0,
    },
    seckey,
  );

  it("all", () => {
    expect(broadcastable({}, normalEvent)).toBe(true);
    expect(broadcastable({}, nostrConnectEvent)).toBe(false);
  });

  it("nostr connect", () => {
    expect(
      broadcastable(
        {
          kinds: [NostrConnect],
          "#p": [
            "0000000000000000000000000000000000000000000000000000000000000000",
          ],
        },
        nostrConnectEvent,
      ),
    ).toBe(true);
    expect(
      broadcastable(
        {
          "#p": [
            "0000000000000000000000000000000000000000000000000000000000000000",
          ],
        },
        nostrConnectEvent,
      ),
    ).toBe(true);
    expect(broadcastable({ kinds: [NostrConnect] }, nostrConnectEvent)).toBe(
      false,
    );
    expect(
      broadcastable(
        {
          kinds: [NostrConnect],
          "#p": [
            "11111111111111111111111111111111111111111111111111111111111111111",
          ],
        },
        nostrConnectEvent,
      ),
    ).toBe(false);
  });
});

//#region NIP-62 Request to Vanish

describe("isVanishTarget", () => {
  const url = "wss://example.com/";
  const seckey = generateSecretKey();

  it("returns true if the event has an ALL_RELAYS tag", () => {
    const event = finalizeEvent(
      {
        kind: RequestToVanish,
        tags: [["relay", "ALL_RELAYS"]],
        content: "",
        created_at: Math.floor(Date.now() / 1000),
      },
      seckey,
    );

    expect(isVanishTarget(event, url)).toBe(true);
  });

  it("returns true if the event has a relay tag matching the given URL", () => {
    const event = finalizeEvent(
      {
        kind: RequestToVanish,
        tags: [["relay", url]],
        content: "",
        created_at: Math.floor(Date.now() / 1000),
      },
      seckey,
    );

    expect(isVanishTarget(event, url)).toBe(true);
  });

  it("returns false if the event does not have a relay tag matching the given URL", () => {
    const event = finalizeEvent(
      {
        kind: RequestToVanish,
        tags: [["relay", "wss://wrong.com/"]],
        content: "",
        created_at: Math.floor(Date.now() / 1000),
      },
      seckey,
    );

    expect(isVanishTarget(event, url)).toBe(false);
  });
});

//#endregion
