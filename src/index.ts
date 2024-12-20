import { Hono } from "hono";
import { Relay } from "./relay";

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
    return c.json({});
  } else {
    return c.text("Hello Hono!");
  }
});

export default app;

export { Relay };
