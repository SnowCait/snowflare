import { Bindings } from "../app";
import { Connection, Connections } from "../connection";

export interface MessageHandler {
  handle(
    ctx: DurableObjectState,
    ws: WebSocket,
    connections: Connections,
    storeConnection: (connection: Connection) => void,
    env?: Bindings,
  ): void | Promise<void>;
}
