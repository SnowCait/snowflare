import { Event } from "nostr-tools";
import { MessageHandler } from "../handler";
import { nip11 } from "../../config";
import { Auth } from "../../auth";
import {
  Connection,
  Connections,
  errorConnectionNotFound,
} from "../../connection";
import { Register } from "../../register";

export class AuthMessageHandler implements MessageHandler {
  #event: Event;

  constructor(event: Event) {
    this.#event = event;
  }

  async handle(
    ws: WebSocket,
    connections: Connections,
    storeConnection: (connection: Connection) => void,
    register: DurableObjectStub<Register>,
  ): Promise<void> {
    if (!nip11.limitation.auth_required) {
      ws.send(JSON.stringify(["NOTICE", "unsupported: auth"]));
      return;
    }

    const connection = connections.get(ws);
    if (connection === undefined) {
      errorConnectionNotFound();
      return;
    }
    if (
      connection.auth === undefined ||
      !Auth.Challenge.validate(this.#event, connection.auth, connection.url)
    ) {
      ws.send(
        JSON.stringify(["OK", this.#event.id, false, "auth-required: invalid"]),
      );
      return;
    }

    if (!(await register.has(this.#event.pubkey))) {
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

    connection.auth.pubkey = this.#event.pubkey;
    storeConnection(connection);
    ws.send(JSON.stringify(["OK", this.#event.id, true, ""]));
  }
}
