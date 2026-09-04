import { describe, expect, it } from "vitest";
import { EventMessageHandler } from "./event";
import { finalizeEvent, generateSecretKey, NostrEvent } from "nostr-tools";
import { env, runInDurableObject } from "cloudflare:test";
import { Repost, ShortTextNote } from "nostr-tools/kinds";
import { InMemoryEventRepository } from "../../repository/in-memory/event";

// Events reach the relay as JSON, which drops the verification result nostr-tools caches on signed events
function receive(event: NostrEvent): NostrEvent {
  return JSON.parse(JSON.stringify(event)) as NostrEvent;
}

function acceptWebSocket(ctx: DurableObjectState): {
  ws: WebSocket;
  sentMessages: () => Promise<unknown[]>;
} {
  const { 0: client, 1: server } = new WebSocketPair();
  const messages: unknown[] = [];
  ctx.acceptWebSocket(server);
  client.accept();
  client.addEventListener("message", ({ data }) => {
    messages.push(JSON.parse(data as string));
  });
  return {
    ws: server,
    sentMessages: async () => {
      await scheduler.wait(0); // Messages are delivered to the other end asynchronously
      return messages;
    },
  };
}

function note(seckey: Uint8Array, content = ""): NostrEvent {
  return finalizeEvent(
    {
      kind: ShortTextNote,
      content,
      tags: [],
      created_at: Math.floor(Date.now() / 1000),
    },
    seckey,
  );
}

describe("EventMessageHandler", () => {
  const seckey = generateSecretKey();
  it("should handle events correctly", async () => {
    const event = note(seckey);
    const eventsRepository = new InMemoryEventRepository();
    const handler = new EventMessageHandler(event, eventsRepository);
    const stub = env.RELAY.getByName("test");
    await runInDurableObject(stub, async (_, ctx) => {
      const { ws, sentMessages } = acceptWebSocket(ctx);
      ws.serializeAttachment({});
      await handler.handle(ctx, ws);
      const events = await eventsRepository.find({});
      expect(events).toHaveLength(1);
      expect(await sentMessages()).toContainEqual(["OK", event.id, true, ""]);
    });
  });

  it("should reject events whose id does not match their content", async () => {
    const signedEvent = note(seckey);
    const event = receive({ ...signedEvent, content: "tampered" });
    const eventsRepository = new InMemoryEventRepository();
    const handler = new EventMessageHandler(event, eventsRepository);
    const stub = env.RELAY.getByName("test");
    await runInDurableObject(stub, async (_, ctx) => {
      const { ws, sentMessages } = acceptWebSocket(ctx);
      ws.serializeAttachment({});
      await handler.handle(ctx, ws);
      const events = await eventsRepository.find({});
      expect(events).toHaveLength(0);
      expect(await sentMessages()).toEqual([
        [
          "OK",
          signedEvent.id,
          false,
          "invalid: event id or signature is wrong",
        ],
      ]);
    });
  });

  it("should reject events with an invalid signature", async () => {
    const signedEvent = note(seckey);
    const event = receive({ ...signedEvent, sig: "0".repeat(128) });
    const eventsRepository = new InMemoryEventRepository();
    const handler = new EventMessageHandler(event, eventsRepository);
    const stub = env.RELAY.getByName("test");
    await runInDurableObject(stub, async (_, ctx) => {
      const { ws, sentMessages } = acceptWebSocket(ctx);
      ws.serializeAttachment({});
      await handler.handle(ctx, ws);
      const events = await eventsRepository.find({});
      expect(events).toHaveLength(0);
      expect(await sentMessages()).toEqual([
        [
          "OK",
          signedEvent.id,
          false,
          "invalid: event id or signature is wrong",
        ],
      ]);
    });
  });

  it("should block reposts that embed protected events", async () => {
    const protectedEvent = finalizeEvent(
      {
        kind: ShortTextNote,
        content: "",
        tags: [["-"]],
        created_at: Math.floor(Date.now() / 1000),
      },
      seckey,
    );
    const repostEvent = finalizeEvent(
      {
        kind: Repost,
        content: JSON.stringify(protectedEvent),
        tags: [["e", protectedEvent.id, "wss://example.com/"]],
        created_at: Math.floor(Date.now() / 1000),
      },
      seckey,
    );
    const eventsRepository = new InMemoryEventRepository();
    const handler = new EventMessageHandler(repostEvent, eventsRepository);
    const stub = env.RELAY.getByName("test");
    await runInDurableObject(stub, async (_, ctx) => {
      const { ws, sentMessages } = acceptWebSocket(ctx);
      ws.serializeAttachment({});
      await handler.handle(ctx, ws);
      const events = await eventsRepository.find({});
      expect(events).toHaveLength(0);
      expect(await sentMessages()).toContainEqual([
        "OK",
        repostEvent.id,
        false,
        "blocked: reposts can't embed protected events",
      ]);
    });
  });
});
