import { Event } from "nostr-tools";
import { MessageHandler } from "../handler";
import { nip11 } from "../../config";
import { Auth } from "../../auth";
import { Connection } from "../../connection";

export class AuthMessageHandler implements MessageHandler {
  #event: Event;

  constructor(event: Event) {
    this.#event = event;
  }

  handle(ws: WebSocket): void {
    if (!nip11.limitation.auth_required) {
      ws.send(JSON.stringify(["NOTICE", "unsupported: auth"]));
      return;
    }

    const session = ws.deserializeAttachment() as Connection;
    if (
      session.auth === undefined ||
      !Auth.Challenge.validate(this.#event, session.auth)
    ) {
      ws.send(JSON.stringify(["OK", this.#event.id, false, "invalid: auth"]));
      return;
    }

    session.auth.pubkey = this.#event.pubkey;
    ws.serializeAttachment(session);
    ws.send(JSON.stringify(["OK", this.#event.id, true, ""]));
  }
}
