import { DurableObject } from "cloudflare:workers";
import { Connection, errorConnectionNotFound } from "./connection";
import { config, nip11 } from "./config";
import { sendAuthChallenge } from "./message/sender/auth";
import { MessageHandlerFactory } from "./message/factory";
import { Bindings } from "./app";
import { EventRepository } from "./repository/event";
import { RepositoryFactory } from "./repository/factory";

export class Relay extends DurableObject<Bindings> {
  #connections = new Map<WebSocket, Connection>();

  #eventsRepository: EventRepository;

  constructor(ctx: DurableObjectState, env: Bindings) {
    super(ctx, env);

    this.#eventsRepository = RepositoryFactory.create(
      config.repository_type,
      this.env,
    );

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

    const ipAddress = request.headers.get("CF-Connecting-IP");

    if (nip11.limitation.auth_required) {
      const challenge = sendAuthChallenge(server);
      const connection = {
        ipAddress,
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
        ipAddress,
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

  async metrics(): Promise<{
    connections: number;
    subscriptions: number;
    // filters: number;
  }> {
    // const filters = await this.ctx.storage.list();
    return {
      connections: this.#connections.size,
      subscriptions: [...this.#connections]
        .map(([, connection]) => connection.subscriptions.size)
        .reduce((sum, value) => sum + value, 0),
      // filters: filters.size,
    };
  }

  async prune(): Promise<void> {
    const filters = await this.ctx.storage.list({ limit: 5000 });
    const availableKeys = [...this.#connections].flatMap(([, connection]) => [
      ...connection.subscriptions.values(),
    ]);
    console.debug("[prune]", filters.size, availableKeys.length);
    for (const [key] of filters) {
      if (
        !availableKeys.includes(key) &&
        typeof filters.get(key) === "object"
      ) {
        await this.ctx.storage.delete(key);
      }
    }
  }

  #convertToWebSocketUrl(url: string): string {
    const u = new URL(url);
    u.protocol = u.protocol === "http:" ? "ws:" : "wss:";
    return u.href;
  }

  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer,
  ): Promise<void> {
    if (message instanceof ArrayBuffer) {
      return;
    }

    const storeConnection = (connection: Connection): void => {
      this.#connections.set(ws, connection);
      ws.serializeAttachment(connection);
    };

    const handler = MessageHandlerFactory.create(
      message,
      this.#eventsRepository,
    );
    await handler?.handle(
      this.ctx,
      ws,
      this.#connections,
      storeConnection,
      this.env,
    );
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean,
  ): Promise<void> {
    console.debug("[ws close]", code, reason, wasClean, ws.readyState);
    this.#cleanUp(ws);
  }

  async #cleanUp(ws: WebSocket): Promise<void> {
    const connection = this.#connections.get(ws);
    if (connection === undefined) {
      errorConnectionNotFound();
      return;
    }
    console.debug("[delete subscriptions]", {
      subscriptions: connection.subscriptions,
    });
    for (const [, key] of connection.subscriptions) {
      await this.ctx.storage.delete(key);
    }
    this.#connections.delete(ws);
  }

  webSocketError(ws: WebSocket, error: unknown): void | Promise<void> {
    console.error("[ws error]", ws.readyState, error);
  }
}
