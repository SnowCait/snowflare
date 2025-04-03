import { Bindings } from "../app";

export interface MessageHandler {
  handle(
    ctx: DurableObjectState,
    ws: WebSocket,
    env?: Bindings,
  ): void | Promise<void>;
}
