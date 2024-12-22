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

    const restoreSubscriptions = () => {
      for (const ws of this.ctx.getWebSockets()) {
        const connections = ws.deserializeAttachment();
        this.#connections.set(ws, connections);
      }
    };

    restoreSubscriptions();
  }

  fetch(): Response | Promise<Response> {
    const webSocketPair = new WebSocketPair();
    const { 0: client, 1: server } = webSocketPair;
    this.ctx.acceptWebSocket(server);

    if (nip11.limitation.auth_required) {
      const challenge = sendAuthChallenge(server);
      const connection = {
        auth: {
          challenge,
          challengedAt: Date.now(),
        },
        subscriptions: new Map(),
      } satisfies Connection;
      this.#connections.set(server, connection);
      server.serializeAttachment(connection);
    } else {
      const connection = { subscriptions: new Map() } satisfies Connection;
      this.#connections.set(server, connection);
      server.serializeAttachment(connection);
    }

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
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
    const storeSubscription = (
      subscriptionId: string,
      filter: Filter,
    ): void => {
      const connection = this.#connections.get(ws);
      if (connection === undefined) {
        console.error({ message: "connection is undefined" });
        return;
      } else {
        const { subscriptions } = connection;
        subscriptions.set(subscriptionId, filter);
        const newConnection = { ...connection, subscriptions };
        this.#connections.set(ws, newConnection);
        ws.serializeAttachment(newConnection);
      }
    };

    const getConnections = (): Map<WebSocket, Connection> => {
      return this.#connections;
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
          const handler = new EventMessageHandler(idOrEvent, getConnections);
          handler.handle(ws);
          break;
        }
        case "REQ": {
          if (typeof idOrEvent !== "string" || typeof filter !== "object") {
            return;
          }
          storeSubscription(idOrEvent, filter);
          const handler = new ReqMessageHandler(idOrEvent, filter);
          handler.handle(ws);
          break;
        }
        case "CLOSE": {
          if (typeof idOrEvent !== "string") {
            return;
          }
          const handler = new CloseMessageHandler(idOrEvent, getConnections);
          handler.handle(ws);
          break;
        }
        case "AUTH": {
          if (typeof idOrEvent !== "object") {
            return;
          }
          const handler = new AuthMessageHandler(idOrEvent);
          handler.handle(ws);
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
