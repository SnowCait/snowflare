import { describe, expect, it } from "vitest";
import app from ".";

describe("/", () => {
  it("Top page returns 200 OK", async () => {
    const response = await app.request("http://localhost/");
    expect(response.status).toBe(200);
  });
});
