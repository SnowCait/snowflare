import { Relay } from "./relay";

export type Bindings = {
  RELAY: DurableObjectNamespace<Relay>;
  events: KVNamespace;
  accounts: KVNamespace;
  DB: D1Database;
};

export type Variables = {
  pubkey: string;
};

export type Env = {
  Bindings: Bindings;
  Variables: Variables;
};
