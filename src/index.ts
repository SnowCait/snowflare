import { Hono } from "hono";
import { Relay } from "./relay";
import { nip11 } from "./config";

type Bindings = {
  RELAY: DurableObjectNamespace<Relay>;
};

const app = new Hono<{ Bindings: Bindings }>();

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

export default app;

export { Relay };
