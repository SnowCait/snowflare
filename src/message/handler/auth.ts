import { Event } from "nostr-tools";
import { MessageHandler } from "../handler";
import { nip11 } from "../../config";
import { Auth } from "../../auth";
import { Connection, errorConnectionNotFound } from "../../connection";

export class AuthMessageHandler implements MessageHandler {
  #event: Event;
  #connections: Map<WebSocket, Connection>;

  constructor(event: Event, connections: Map<WebSocket, Connection>) {
    this.#event = event;
    this.#connections = connections;
  }

  handle(ws: WebSocket): void {
    if (!nip11.limitation.auth_required) {
      ws.send(JSON.stringify(["NOTICE", "unsupported: auth"]));
      return;
    }

    const connection = this.#connections.get(ws);
    if (connection === undefined) {
      errorConnectionNotFound();
      return;
    }
    if (
      connection.auth === undefined ||
      !Auth.Challenge.validate(this.#event, connection.auth, connection.url)
    ) {
      ws.send(JSON.stringify(["OK", this.#event.id, false, "invalid: auth"]));
      return;
    }

    connection.auth.pubkey = this.#event.pubkey;

    this.#connections.set(ws, connection);
    ws.serializeAttachment(connection);
    ws.send(JSON.stringify(["OK", this.#event.id, true, ""]));
  }
}
