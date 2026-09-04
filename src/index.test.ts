import { describe, expect, it } from "vitest";
import { SELF } from "cloudflare:test";

describe("/", () => {
  it("Top page returns 200 OK", async () => {
    const response = await SELF.fetch("https://example.com/");
    expect(response.status).toBe(200);
  });
  it("NIP-11 returns 200 OK", async () => {
    const response = await SELF.fetch("https://example.com/", {
      headers: { Accept: "application/nostr+json" },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
  });
});
