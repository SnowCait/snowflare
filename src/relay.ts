import { DurableObject } from "cloudflare:workers";
import { MessageHandlerFactory } from "./message/factory";
import { Filter } from "nostr-tools";
import { Env } from "hono";
import { Subscriptions } from "./subscriptions";

export class Relay extends DurableObject {
  #subscriptions = new Map<WebSocket, Subscriptions>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    const restoreSubscriptions = () => {
      for (const ws of this.ctx.getWebSockets()) {
        const subscriptions = ws.deserializeAttachment();
        this.#subscriptions.set(ws, new Map(subscriptions));
      }
    };

    restoreSubscriptions();
  }

  fetch(): Response | Promise<Response> {
    const webSocketPair = new WebSocketPair();
    const { 0: client, 1: server } = webSocketPair;
    this.ctx.acceptWebSocket(server);
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
      const subscriptions = this.#subscriptions.get(ws);
      if (subscriptions === undefined) {
        this.#subscriptions.set(ws, new Map([[subscriptionId, filter]]));
      } else {
        subscriptions.set(subscriptionId, filter);
        this.#subscriptions.set(ws, subscriptions);
        ws.serializeAttachment(subscriptions);
      }
    };

    const getSubscriptions = (): Map<WebSocket, Subscriptions> => {
      return this.#subscriptions;
    };

    const handler = MessageHandlerFactory.create(
      message,
      storeSubscription,
      getSubscriptions,
    );
    handler?.handle(ws);
  }
}
