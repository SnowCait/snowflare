import { DurableObject } from "cloudflare:workers";
import { Connection } from "./connection";
import { config, nip11 } from "./config";
import { sendAuthChallenge } from "./message/sender/auth";
import { sendClosed } from "./message/sender/closed";
import { sendNotice } from "./message/sender/notice";
import { MessageHandlerFactory } from "./message/factory";
import { Bindings } from "./app";
import { EventRepository } from "./repository/event";
import { RepositoryFactory } from "./repository/factory";
import { Filter } from "nostr-tools/filter";

export class Relay extends DurableObject<Bindings> {
  #eventsRepository: EventRepository;

  constructor(ctx: DurableObjectState, env: Bindings) {
    console.debug("[relay constructor]");

    super(ctx, env);

    this.#eventsRepository = RepositoryFactory.create(
      config.repository_type,
      this.env,
    );
  }

  async fetch(request: Request): Promise<Response> {
    console.debug("[relay fetch]");

    const maintenance = await this.ctx.storage.get<boolean>("maintenance");
    if (maintenance) {
      return new Response(null, {
        status: 503,
        headers: { "Retry-After": `${3600}` }, // seconds
      });
    }

    const webSocketPair = new WebSocketPair();
    const { 0: client, 1: server } = webSocketPair;
    this.ctx.acceptWebSocket(server);

    const ipAddress = request.headers.get("CF-Connecting-IP");
    const connectionId = crypto.randomUUID();

    if (nip11.limitation.auth_required) {
      const challenge = sendAuthChallenge(server);
      const connection = {
        id: connectionId,
        ipAddress,
        url: this.#convertToWebSocketUrl(request.url),
        auth: {
          challenge,
          challengedAt: Date.now(),
        },
        pubkeys: new Set(),
      } satisfies Connection;
      server.serializeAttachment(connection);
    } else {
      const connection = {
        id: connectionId,
        ipAddress,
        url: this.#convertToWebSocketUrl(request.url),
        pubkeys: new Set(),
      } satisfies Connection;
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
    filters: number;
  }> {
    const subscriptionsMap =
      await this.ctx.storage.list<Map<string, Filter[]>>();
    const connectionIds = this.ctx
      .getWebSockets()
      .map((ws) => (ws.deserializeAttachment() as Connection).id);
    const subscriptionsList = subscriptionsMap
      .entries()
      .filter(([connectionId]) => connectionIds.includes(connectionId))
      .map(([, subscriptions]) => subscriptions)
      .toArray();
    return {
      connections: connectionIds.length,
      subscriptions: subscriptionsList
        .map((subscriptions) => subscriptions.size)
        .reduce((sum, value) => sum + value, 0),
      filters: subscriptionsList
        .flatMap((subscriptions) =>
          [...subscriptions].map(([, filters]) => filters.length),
        )
        .reduce((sum, value) => sum + value, 0),
    };
  }

  async prune(): Promise<number> {
    const connections = await this.ctx.storage.list<Map<string, Filter[]>>();
    connections.delete("maintenance"); // Exclude non-connections
    const availableConnectionIds = this.ctx
      .getWebSockets()
      .map((ws) => (ws.deserializeAttachment() as Connection).id);
    console.debug("[prune]", connections.size, availableConnectionIds.length);
    let deleted = 0;
    for (const [id] of connections) {
      if (availableConnectionIds.includes(id)) {
        continue;
      }
      await this.ctx.storage.delete(id);
      deleted++;
    }
    return deleted;
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

    const handler = MessageHandlerFactory.create(
      message,
      this.#eventsRepository,
    );
    await handler?.handle(this.ctx, ws, this.env);
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
    const { id } = ws.deserializeAttachment() as Connection;
    await this.ctx.storage.delete(id);
  }

  webSocketError(ws: WebSocket, error: unknown): void | Promise<void> {
    console.error("[ws error]", ws.readyState, error);
  }

  //#region Maintenance

  async enableMaintenance(): Promise<void> {
    console.debug("[maintenance]", "enable");
    const subscriptionsMap =
      await this.ctx.storage.list<Map<string, Filter[]>>();
    await this.ctx.storage.deleteAll();
    await this.ctx.storage.put("maintenance", true);

    for (const ws of this.ctx.getWebSockets()) {
      const { id } = ws.deserializeAttachment() as Connection;
      const subscriptions = subscriptionsMap.get(id);
      if (subscriptions !== undefined) {
        for (const [id] of subscriptions) {
          sendClosed(ws, id, "error", "closed due to maintenance");
        }
      }
      sendNotice(ws, "disconnected due to maintenance");
      ws.close();
    }
  }

  async disableMaintenance(): Promise<void> {
    console.debug("[maintenance]", "disable");
    await this.ctx.storage.delete("maintenance");
  }

  //#endregion
}
