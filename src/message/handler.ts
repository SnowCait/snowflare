export interface MessageHandler {
  handle(
    ctx: DurableObjectState,
    ws: WebSocket,
    env?: Env,
  ): void | Promise<void>;
}
