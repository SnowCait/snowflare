import { DurableObject } from "cloudflare:workers";
import { MessageHandlerFactory } from "./message/factory";
import { Filter } from "nostr-tools";
import { Env } from "hono";
import { Connection } from "./connection";
import { nip11 } from "./config";
import { sendAuthChallenge } from "./message/sender/auth";

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

    const handler = MessageHandlerFactory.create(
      message,
      storeSubscription,
      getConnections,
    );
    handler?.handle(ws);
  }
}
