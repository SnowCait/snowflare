import { Hono } from "hono";
import { Relay } from "./relay";
import { nip11 } from "./config";
import { Register } from "./register";
import { Bindings, Variables } from "./app";
import { HTTPException } from "hono/http-exception";
import { nip98 } from "nostr-tools";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.get("/", (c) => {
  if (c.req.header("Upgrade") === "websocket") {
    const id = c.env.RELAY.idFromName("relay");
    const stub = c.env.RELAY.get(id);
    return stub.fetch(c.req.raw);
  } else if (c.req.header("Accept") === "application/nostr+json") {
    c.header("Access-Control-Allow-Origin", "*");
    return c.json(nip11);
  } else {
    return c.text("Hello Hono!");
  }
});

app.options("/", (c) => {
  c.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  return new Response(null, {
    status: 204,
  });
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
  const id = c.env.REGISTER.idFromName("register");
  const stub = c.env.REGISTER.get(id);
  return new Response(null, { status: (await stub.has(pubkey)) ? 204 : 404 });
});

app.put("/register", async (c) => {
  const pubkey = c.get("pubkey");
  const id = c.env.REGISTER.idFromName("register");
  const stub = c.env.REGISTER.get(id);
  if (await stub.has(pubkey)) {
    return new Response(null, { status: 204 });
  } else {
    await stub.set(pubkey);
    return new Response(null, { status: 201 });
  }
});

app.delete("/register", async (c) => {
  const pubkey = c.get("pubkey");
  const id = c.env.REGISTER.idFromName("register");
  const stub = c.env.REGISTER.get(id);
  await stub.delete(pubkey);
  return new Response(null, { status: 204 });
});

export default app;

export { Relay, Register };
