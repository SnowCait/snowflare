import { Auth } from "./auth";

type SubscriptionId = string;
type SubscriptionKey = string;

export type Connection = {
  ipAddress: string | null;
  url: string;
  auth?: Auth.Session;
  subscriptions: Map<SubscriptionId, SubscriptionKey>;
};
export type Connections = Map<WebSocket, Connection>;
