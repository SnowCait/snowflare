import { Register } from "./register";
import { Relay } from "./relay";

export type Bindings = {
  RELAY: DurableObjectNamespace<Relay>;
  REGISTER: DurableObjectNamespace<Register>;
};

export type Variables = {
  pubkey: string;
};
