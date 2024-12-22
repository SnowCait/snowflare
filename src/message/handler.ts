import { Connection, Connections } from "../connection";

export interface MessageHandler {
  handle(
    ws: WebSocket,
    connections: Connections,
    storeConnection: (connection: Connection) => void,
  ): void;
}
