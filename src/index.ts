import { Hono } from "hono";
import { Relay } from "./relay";
import { nip11 } from "./config";
import { Env } from "./app";
import { HTTPException } from "hono/http-exception";
import { nip98 } from "nostr-tools";
import client from "./client";
import { Account } from "./Account";

const app = new Hono<Env>();

app.get("/", (c) => {
  if (c.req.header("Upgrade") === "websocket") {
    const id = c.env.RELAY.idFromName("relay");
    const stub = c.env.RELAY.get(id);
    return stub.fetch(c.req.raw);
  } else if (c.req.header("Accept") === "application/nostr+json") {
    c.header("Access-Control-Allow-Origin", "*");
    return c.json(nip11);
  } else {
    return client.fetch(c.req.raw);
  }
});

app.options("/", (c) => {
  c.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  return new Response(null, {
    status: 204,
  });
});

app.get("/metrics", async (c) => {
  const id = c.env.RELAY.idFromName("relay");
  const stub = c.env.RELAY.get(id);
  const metrics = await stub.metrics();
  return c.json(metrics);
});

app.use("/register", async (c, next) => {
  const token = c.req.header("Authorization");
  if (token === undefined) {
    throw new HTTPException(401);
  }
  try {
    const event = await nip98.unpackEventFromToken(token);
    if (!(await nip98.validateEvent(event, c.req.url, c.req.method))) {
      throw Error();
    }
    c.set("pubkey", event.pubkey);
    await next();
  } catch {
    throw new HTTPException(401);
  }
});

app.get("/register", async (c) => {
  const pubkey = c.get("pubkey");
  const exists = await new Account(pubkey, c.env).exists();
  return new Response(null, { status: exists ? 204 : 404 });
});

app.put("/register", async (c) => {
  const pubkey = c.get("pubkey");
  const account = new Account(pubkey, c.env);
  if (await account.exists()) {
    return new Response(null, { status: 204 });
  } else {
    await account.register();
    return new Response(null, { status: 201 });
  }
});

app.delete("/register", async (c) => {
  const pubkey = c.get("pubkey");
  await new Account(pubkey, c.env).unregister();
  return new Response(null, { status: 204 });
});

export default app;

export { Relay };
