import { Nip11 } from "nostr-typedef";
import defaultConfig from "../config/default";
import overrideConfig from "../config/override";
import { RepositoryType } from "./repository/factory";

export type Config = {
  nip11?: Nip11.RelayInfo;
  auth_timeout?: number;
  auth_limit?: number;
  default_limit?: number;
  repository_type?: RepositoryType;
};

export const config = { ...defaultConfig, ...overrideConfig };
export const nip11 = { ...defaultConfig.nip11, ...overrideConfig.nip11 };
