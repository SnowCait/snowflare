import { Nip11 } from "nostr-typedef";
import defaultConfig from "../config/default";
import overrideConfig from "../config/override";

export type Config = {
  nip11?: Nip11.RelayInfo;
  auth_timeout?: number;
  default_limit?: number;
};

export const config = { ...defaultConfig, ...overrideConfig };
export const nip11 = { ...defaultConfig.nip11, ...overrideConfig.nip11 };
