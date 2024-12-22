import { Filter } from "nostr-tools";
import { Auth } from "./auth";

export type Subscriptions = Map<string, Filter>;
export type Connection = {
  url: string;
  auth?: Auth.Session;
  subscriptions: Subscriptions;
};
export type Connections = Map<WebSocket, Connection>;

export function errorConnectionNotFound() {
  console.error({ message: "connection is undefined" });
}
