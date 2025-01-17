import { Connection, Connections } from "../connection";
import { Register } from "../register";

export interface MessageHandler {
  handle(
    ws: WebSocket,
    connections: Connections,
    storeConnection: (connection: Connection) => void,
    register?: DurableObjectStub<Register>,
  ): void | Promise<void>;
}
