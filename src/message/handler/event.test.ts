import { describe, expect, it } from "vitest";
import { EventMessageHandler } from "./event";
import { finalizeEvent, generateSecretKey, NostrEvent } from "nostr-tools";
import { env } from "cloudflare:workers";
import { runInDurableObject } from "cloudflare:test";
import { Repost, ShortTextNote } from "nostr-tools/kinds";
import { InMemoryEventRepository } from "../../repository/in-memory/event";

describe("EventMessageHandler", () => {
  const seckey = generateSecretKey();
  it("should handle events correctly", async () => {
    const event = finalizeEvent(
      {
        kind: ShortTextNote,
        content: "",
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
      },
      seckey,
    );
    const eventsRepository = new InMemoryEventRepository();
    const handler = new EventMessageHandler(event, eventsRepository);
    const stub = env.RELAY.getByName("test");
    await runInDurableObject(stub, async (_, ctx) => {
      const { 0: client, 1: ws } = new WebSocketPair();
      ctx.acceptWebSocket(ws);
      client.accept();
      const messages: unknown[] = [];
      client.addEventListener("message", ({ data }) => {
        messages.push(JSON.parse(data as string));
      });
      ws.serializeAttachment({});
      await handler.handle(ctx, ws);
      await scheduler.wait(0); // Messages are delivered to the other end asynchronously
      const events = await eventsRepository.find({});
      expect(events).toHaveLength(1);
      expect(messages).toContainEqual(["OK", event.id, true, ""]);
    });
  });

  it("should reject invalid events", async () => {
    const signedEvent = finalizeEvent(
      {
        kind: ShortTextNote,
        content: "",
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
      },
      seckey,
    );
    // JSON drops the verification state nostr-tools caches on signed events
    const event = JSON.parse(
      JSON.stringify({ ...signedEvent, sig: "0".repeat(128) }),
    ) as NostrEvent;
    const eventsRepository = new InMemoryEventRepository();
    const handler = new EventMessageHandler(event, eventsRepository);
    const stub = env.RELAY.getByName("test");
    await runInDurableObject(stub, async (_, ctx) => {
      const { 0: client, 1: ws } = new WebSocketPair();
      ctx.acceptWebSocket(ws);
      client.accept();
      const messages: unknown[] = [];
      client.addEventListener("message", ({ data }) => {
        messages.push(JSON.parse(data as string));
      });
      ws.serializeAttachment({});
      await handler.handle(ctx, ws);
      await scheduler.wait(0); // Messages are delivered to the other end asynchronously
      expect(messages).toEqual([
        ["OK", event.id, false, "invalid: event id or signature is wrong"],
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
      const { 1: ws } = new WebSocketPair();
      ctx.acceptWebSocket(ws);
      ws.serializeAttachment({});
      await handler.handle(ctx, ws);
      const events = await eventsRepository.find({});
      expect(events).toHaveLength(0);
    });
  });
});
