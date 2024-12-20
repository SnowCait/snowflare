export interface MessageHandler {
  handle(ws: WebSocket): void;
}
