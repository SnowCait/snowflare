import { Nip11 } from "nostr-typedef";
import defaultConfig from "../config/default";
import overrideConfig from "../config/override";

export type Config = {
  nip11?: Nip11.RelayInfo;
  auth_timeout?: number;
};

export const nip11 = { ...defaultConfig.nip11, ...overrideConfig.nip11 };
export const authTimeout = { ...defaultConfig, ...overrideConfig }.auth_timeout;
