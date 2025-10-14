import { Event } from "nostr-tools";
import { MessageHandler } from "../handler";
import { nip11 } from "../../config";
import { Auth } from "../../auth";
import { Connection } from "../../connection";
import { Account } from "../../Account";
import { Bindings } from "../../app";

export class AuthMessageHandler implements MessageHandler {
  #event: Event;

  constructor(event: Event) {
    this.#event = event;
  }

  async handle(
    _: DurableObjectState,
    ws: WebSocket,
    env: Bindings,
  ): Promise<void> {
    console.debug("[AUTH]", { event: this.#event });

    const connection = ws.deserializeAttachment() as Connection;
    if (
      connection.auth === undefined ||
      !Auth.Challenge.validate(this.#event, connection.auth, connection.url)
    ) {
      ws.send(JSON.stringify(["OK", this.#event.id, false, "invalid: auth"]));
      return;
    }

    if (nip11.limitation.auth_required || nip11.limitation.restricted_writes) {
      const registered = await new Account(this.#event.pubkey, env).exists();
      if (!registered) {
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

    connection.auth.pubkey = this.#event.pubkey;
    ws.serializeAttachment(connection);
    ws.send(JSON.stringify(["OK", this.#event.id, true, ""]));
  }
}
