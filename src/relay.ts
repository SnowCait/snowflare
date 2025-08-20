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
      server.serializeAttachment(connection);
    } else {
      const connection = {
        ipAddress,
        url: this.#convertToWebSocketUrl(request.url),
        subscriptions: new Map(),
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
    const filters = await this.ctx.storage.list();
    const wss = this.ctx.getWebSockets();
    return {
      connections: wss.length,
      subscriptions: wss
        .map(
          (ws) => (ws.deserializeAttachment() as Connection).subscriptions.size,
        )
        .reduce((sum, value) => sum + value, 0),
      filters: filters.size,
    };
  }

  async prune(): Promise<number> {
    const filters = await this.ctx.storage.list({ limit: 2000 });
    const availableKeys = this.ctx
      .getWebSockets()
      .flatMap((ws) => [
        ...(ws.deserializeAttachment() as Connection).subscriptions.values(),
      ]);
    console.debug("[prune]", filters.size, availableKeys.length);
    let deleted = 0;
    for (const [key] of filters) {
      if (
        !availableKeys.includes(key) &&
        typeof filters.get(key) === "object"
      ) {
        await this.ctx.storage.delete(key);
        deleted++;
      }
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

    console.debug("[ws message]", message);

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
    const { subscriptions } = ws.deserializeAttachment() as Connection;
    console.debug("[delete subscriptions]", { subscriptions });
    for (const [, key] of subscriptions) {
      await this.ctx.storage.delete(key);
    }
  }

  webSocketError(ws: WebSocket, error: unknown): void | Promise<void> {
    console.error("[ws error]", ws.readyState, error);
  }

  //#region Maintenance

  async enableMaintenance(): Promise<void> {
    console.debug("[maintenance]", "enable");
    await this.ctx.storage.put("maintenance", true);

    for (const ws of this.ctx.getWebSockets()) {
      const { subscriptions } = ws.deserializeAttachment() as Connection;
      for (const [id] of subscriptions) {
        sendClosed(ws, id, "error", "closed due to maintenance");
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
