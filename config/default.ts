import { Config } from "../src/config";

export default {
  nip11: {
    name: "Snowflare",
    description: "",
    icon: "",
    pubkey: "",
    contact: "",
    supported_nips: [1, 11],
    software: "https://github.com/SnowCait/snowflare",
    version: "0.1.0",
  },
} as const satisfies Config;
