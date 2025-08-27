import { Auth } from "./auth";

export type Connection = {
  id: string;
  ipAddress: string | null;
  url: string;
  auth?: Auth.Session;
};
export type Connections = Map<WebSocket, Connection>;
