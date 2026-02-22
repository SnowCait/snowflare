import { NostrEvent } from "nostr-tools/core";
import { MessageHandler } from "../handler";
import { config, nip11 } from "../../config";
import { Auth } from "../../auth";
import { Connection } from "../../connection";
import { Account } from "../../Account";
import { Bindings } from "../../app";

export class AuthMessageHandler implements MessageHandler {
  #event: NostrEvent;

  constructor(event: NostrEvent) {
    this.#event = event;
  }

  async handle(
    _: DurableObjectState,
    ws: WebSocket,
    env: Bindings,
  ): Promise<void> {
    const connection = ws.deserializeAttachment() as Connection;

    if (connection.pubkeys.has(this.#event.pubkey)) {
      ws.send(
        JSON.stringify([
          "OK",
          this.#event.id,
          true,
          "duplicate: already authenticated",
        ]),
      );
      return;
    }

    const limit = config.auth_limit;
    if (connection.pubkeys.size >= limit) {
      console.debug("[AUTH too many]", connection.pubkeys.size);
      ws.send(
        JSON.stringify(["NOTICE", `too many authentications (> ${limit})`]),
      );
      return;
    }

    if (
      connection.auth === undefined ||
      !Auth.Challenge.validate(this.#event, connection.auth, connection.url)
    ) {
      console.debug("[AUTH invalid]", { event: this.#event });
      ws.send(JSON.stringify(["OK", this.#event.id, false, "invalid: auth"]));
      return;
    }

    if (nip11.limitation.auth_required || nip11.limitation.restricted_writes) {
      const registered = await new Account(this.#event.pubkey, env).exists();
      if (!registered) {
        console.debug("[AUTH restricted]", { event: this.#event });
        ws.send(
          JSON.stringify([
            "OK",
            this.#event.id,
            false,
            "restricted: required to register",
          ]),
        );
        return;
      }
    }

    connection.pubkeys.add(this.#event.pubkey);
    ws.serializeAttachment(connection);
    ws.send(JSON.stringify(["OK", this.#event.id, true, ""]));
  }
}
