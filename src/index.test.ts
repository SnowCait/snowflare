import { describe, expect, it } from "vitest";
import app from ".";

describe("/", () => {
  it("Top page returns 200 OK", async () => {
    const response = await app.request("/");
    expect(response.status).toBe(200);
  });
  it("NIP-11 returns 200 OK", async () => {
    const response = await app.request("/", {
      headers: { Accept: "application/nostr+json" },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
  });
});
