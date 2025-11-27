import { Auth } from "./auth";

// Limited to 2,048 bytes
export type Connection = {
  id: string; // UUID: 36 bytes
  ipAddress: string | null; // IPv4: 15 bytes, IPv6: 39 bytes
  url: string;
  auth?: Auth.Session; // { challenge: 36 bytes UUID, challengedAt: 8 bytes timestamp }
  pubkeys: Set<string>; // pubkey: 64 bytes
};
export type Connections = Map<WebSocket, Connection>;
