import { describe, expect, it } from "vitest";
import { EventMessageHandler } from "./event";
import { finalizeEvent, generateSecretKey } from "nostr-tools";
import { env, runInDurableObject } from "cloudflare:test";
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
      const { 1: ws } = new WebSocketPair();
      ctx.acceptWebSocket(ws);
      ws.serializeAttachment({});
      await handler.handle(ctx, ws);
      const events = await eventsRepository.find({});
      expect(events).toHaveLength(1);
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
