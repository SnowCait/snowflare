import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  return c.html(
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Snowflare</title>
        <meta property="og:title" content="Snowflare" />
        <meta
          property="og:description"
          content="This is a Nostr relay which requires registration to write."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="icon"
          href="https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/2744.png"
        />
        <link
          rel="stylesheet"
          href="https://cdn.simplecss.org/simple.min.css"
        />
        <link rel="stylesheet" href="/index.css" />
        <script
          src="https://www.unpkg.com/nostr-login@latest/dist/unpkg.js"
          data-methods="connect,extension,local"
          data-no-banner="true"
        ></script>
        <script src="https://unpkg.com/nostr-tools@2.10.4/lib/nostr.bundle.js"></script>
        <script src="/index.js"></script>
      </head>

      <body>
        <main>
          <section>
            <h1>Snowflare</h1>
            <p>
              <code>wss://snowflare.cc/</code>
              <button id="copy">📋</button> is a Nostr relay which requires
              registration to write.
            </p>
            <p>
              By registering, you are deemed to have agreed to the Terms of
              Service and Privacy Policy.
            </p>
            <button id="register">Register</button>
            <p id="registered" hidden>
              Registered.
            </p>
          </section>
          <section>
            <h3>Terms of Service</h3>
            <p>
              This service is provided as is without warranty of any kind.
              <br />
              The administrator does not take any responsibility.
              <br />
              The administrator may delete data or restrict access at their
              discretion.
              <br />
              In addition to illegal activities, nuisance activities such as
              spam are also prohibited.
            </p>
            <h3>Privacy Policy</h3>
            <p>
              Transmitted data and sender information (such as the IP address)
              will be stored.
              <br /> Transmitted data will be made public. If encrypted, it will
              be made public in its encrypted state.
              <br /> Sender information will not be made public, but may be
              provided to the police, etc. if necessary.
            </p>
          </section>
        </main>
      </body>
    </html>,
  );
});

export default app;
