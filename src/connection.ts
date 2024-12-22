import { Filter } from "nostr-tools";
import { Auth } from "./auth";

export type Subscriptions = Map<string, Filter>;
export type Connection = { auth?: Auth.Session; subscriptions: Subscriptions };
