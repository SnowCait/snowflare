import { Relay } from "./relay";

export type Bindings = {
  RELAY: DurableObjectNamespace<Relay>;
  events: KVNamespace;
  accounts: KVNamespace;
  DB: D1Database;
  API_TOKEN: string;
  ACCOUNT_ID: string;
  KV_ID_EVENTS: string;
  LOCAL?: string;
};

export type Variables = {
  pubkey: string;
};

export type Env = {
  Bindings: Bindings;
  Variables: Variables;
};
