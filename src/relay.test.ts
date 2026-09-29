import { describe, expect, it } from "vitest";
import { exports } from "cloudflare:workers";
import { finalizeEvent, generateSecretKey } from "nostr-tools/pure";
import { ShortTextNote } from "nostr-tools/kinds";

type Message = unknown[];

async function connect() {
  const response = await exports.default.fetch("https://example.com/", {
    headers: { Upgrade: "websocket" },
  });
  const ws = response.webSocket;
  if (ws === null) {
    throw new Error("WebSocket upgrade failed");
  }
  ws.accept();
  const messages: Message[] = [];
  ws.addEventListener("message", ({ data }) => {
    messages.push(JSON.parse(data as string));
  });
  const send = (message: Message) => ws.send(JSON.stringify(message));
  const waitFor = async (predicate: (message: Message) => boolean) => {
    await expect.poll(() => messages.find(predicate)).toBeDefined();
    return messages.find(predicate);
  };
  return { messages, send, waitFor };
}

const ok = (id: string) => (message: Message) =>
  message[0] === "OK" && message[1] === id;
const eose = (subscriptionId: string) => (message: Message) =>
  message[0] === "EOSE" && message[1] === subscriptionId;
const eventIdsOf = (messages: Message[], subscriptionId: string) =>
  messages
    .filter(
      (message) => message[0] === "EVENT" && message[1] === subscriptionId,
    )
    .map((message) => (message[2] as { id: string }).id);

describe("EVENT persisted by the default repository", () => {
  it("replies OK to a duplicate regular event", async () => {
    const event = finalizeEvent(
      {
        kind: ShortTextNote,
        content: "duplicate",
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
      },
      generateSecretKey(),
    );
    const client = await connect();

    client.send(["EVENT", event]);
    expect(await client.waitFor(ok(event.id))).toEqual([
      "OK",
      event.id,
      true,
      "",
    ]);

    client.messages.length = 0;
    client.send(["EVENT", event]);
    expect(await client.waitFor(ok(event.id))).toEqual([
      "OK",
      event.id,
      true,
      "duplicate: already have this event",
    ]);

    client.send(["REQ", "check", { ids: [event.id] }]);
    await client.waitFor(eose("check"));
    expect(eventIdsOf(client.messages, "check")).toEqual([event.id]);
  });

  it("does not broadcast a duplicate regular event again", async () => {
    const event = finalizeEvent(
      {
        kind: ShortTextNote,
        content: "broadcast once",
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
      },
      generateSecretKey(),
    );
    const subscriber = await connect();
    const publisher = await connect();

    subscriber.send(["REQ", "live", { authors: [event.pubkey], limit: 0 }]);
    await subscriber.waitFor(eose("live"));

    publisher.send(["EVENT", event]);
    await publisher.waitFor(ok(event.id));
    await subscriber.waitFor(
      (message) => message[0] === "EVENT" && message[1] === "live",
    );

    publisher.messages.length = 0;
    publisher.send(["EVENT", event]);
    await publisher.waitFor(ok(event.id));

    subscriber.send(["REQ", "sync", { limit: 0 }]);
    await subscriber.waitFor(eose("sync"));
    expect(eventIdsOf(subscriber.messages, "live")).toEqual([event.id]);
  });
});
