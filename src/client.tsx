import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  return c.html(
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Snowflare</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="stylesheet"
          href="https://cdn.simplecss.org/simple.min.css"
        />
        <script src="https://unpkg.com/nostr-tools@2.10.4/lib/nostr.bundle.js"></script>
        <script src="/index.js"></script>
      </head>

      <body>
        <main>
          <h1>Snowflare</h1>

          <section>
            <button id="register">Register</button>
            <p id="registered" hidden>
              Registered.
            </p>
          </section>
        </main>
      </body>
    </html>,
  );
});

export default app;
