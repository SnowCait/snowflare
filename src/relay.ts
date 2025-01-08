import { DurableObject } from "cloudflare:workers";
import { Connection } from "./connection";
import { nip11 } from "./config";
import { sendAuthChallenge } from "./message/sender/auth";
import { MessageHandlerFactory } from "./message/factory";
import { Bindings } from "./app";
import { KvD1EventRepository } from "./repository/kv/d1/event";
import { EventRepository } from "./repository/event";

export class Relay extends DurableObject<Bindings> {
  #connections = new Map<WebSocket, Connection>();

  #eventsRepository: EventRepository;

  constructor(ctx: DurableObjectState, env: Bindings) {
    super(ctx, env);

    this.#eventsRepository = new KvD1EventRepository(env);

    const restoreConnections = () => {
      for (const ws of this.ctx.getWebSockets()) {
        const connections = ws.deserializeAttachment();
        this.#connections.set(ws, connections);
      }
    };

    restoreConnections();
  }

  fetch(request: Request): Response {
    const webSocketPair = new WebSocketPair();
    const { 0: client, 1: server } = webSocketPair;
    this.ctx.acceptWebSocket(server);

    if (nip11.limitation.auth_required) {
      const challenge = sendAuthChallenge(server);
      const connection = {
        url: this.#convertToWebSocketUrl(request.url),
        auth: {
          challenge,
          challengedAt: Date.now(),
        },
        subscriptions: new Map(),
      } satisfies Connection;
      this.#connections.set(server, connection);
      server.serializeAttachment(connection);
    } else {
      const connection = {
        url: this.#convertToWebSocketUrl(request.url),
        subscriptions: new Map(),
      } satisfies Connection;
      this.#connections.set(server, connection);
      server.serializeAttachment(connection);
    }

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  #convertToWebSocketUrl(url: string): string {
    const u = new URL(url);
    u.protocol = u.protocol === "http:" ? "ws:" : "wss:";
    return u.href;
  }

  webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer,
  ): void | Promise<void> {
    if (message instanceof ArrayBuffer) {
      return;
    }

    const storeConnection = (connection: Connection): void => {
      this.#connections.set(ws, connection);
      ws.serializeAttachment(connection);
    };

    const id = this.env.REGISTER.idFromName("register");
    const register = this.env.REGISTER.get(id);

    const handler = MessageHandlerFactory.create(
      message,
      this.#eventsRepository,
    );
    handler?.handle(ws, this.#connections, storeConnection, register);
  }

  webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean,
  ): void | Promise<void> {
    console.debug("[ws close]", code, reason, wasClean);
  }
}
