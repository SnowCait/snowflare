import { DurableObject } from "cloudflare:workers";
import { Event, Filter } from "nostr-tools";
import { Env } from "hono";
import { Connection } from "./connection";
import { nip11 } from "./config";
import { sendAuthChallenge } from "./message/sender/auth";
import { EventMessageHandler } from "./message/handler/event";
import { ReqMessageHandler } from "./message/handler/req";
import { CloseMessageHandler } from "./message/handler/close";
import { AuthMessageHandler } from "./message/handler/auth";

export class Relay extends DurableObject {
  #connections = new Map<WebSocket, Connection>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    const restoreConnections = () => {
      for (const ws of this.ctx.getWebSockets()) {
        const connections = ws.deserializeAttachment();
        this.#connections.set(ws, connections);
      }
    };

    restoreConnections();
  }

  fetch(request: Request): Response | Promise<Response> {
    const webSocketPair = new WebSocketPair();
    const { 0: client, 1: server } = webSocketPair;
    this.ctx.acceptWebSocket(server);

    if (nip11.limitation.auth_required) {
      const challenge = sendAuthChallenge(server);
      const connection = {
        url: this.convertToWebSocketUrl(request.url),
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
        url: this.convertToWebSocketUrl(request.url),
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

  private convertToWebSocketUrl(url: string): string {
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

    this.handleMessage(ws, message);
  }

  private handleMessage(ws: WebSocket, message: string): void {
    const storeConnection = (connection: Connection): void => {
      this.#connections.set(ws, connection);
      ws.serializeAttachment(connection);
    };

    try {
      const [type, idOrEvent, filter] = JSON.parse(message) as [
        string,
        string | Event,
        Filter,
      ];
      switch (type) {
        case "EVENT": {
          if (typeof idOrEvent !== "object") {
            return;
          }
          const handler = new EventMessageHandler(idOrEvent);
          handler.handle(ws, this.#connections);
          break;
        }
        case "REQ": {
          if (typeof idOrEvent !== "string" || typeof filter !== "object") {
            return;
          }
          const handler = new ReqMessageHandler(idOrEvent, filter);
          handler.handle(ws, this.#connections, storeConnection);
          break;
        }
        case "CLOSE": {
          if (typeof idOrEvent !== "string") {
            return;
          }
          const handler = new CloseMessageHandler(idOrEvent);
          handler.handle(ws, this.#connections, storeConnection);
          break;
        }
        case "AUTH": {
          if (typeof idOrEvent !== "object") {
            return;
          }
          const handler = new AuthMessageHandler(idOrEvent);
          handler.handle(ws, this.#connections, storeConnection);
          break;
        }
        default: {
          return;
        }
      }
    } catch {
      return;
    }
  }
}
