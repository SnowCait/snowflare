import { Register } from "./register";
import { Relay } from "./relay";

export type Bindings = {
  RELAY: DurableObjectNamespace<Relay>;
  REGISTER: DurableObjectNamespace<Register>;
  events: KVNamespace;
};

export type Variables = {
  pubkey: string;
};

export type Env = {
  Bindings: Bindings;
  Variables: Variables;
};
