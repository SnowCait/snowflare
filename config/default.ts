import { Config } from "../src/config";

export default {
  nip11: {
    name: "Snowflare",
    description: "",
    icon: "",
    pubkey: "",
    contact: "",
    supported_nips: [1, 11, 42],
    software: "https://github.com/SnowCait/snowflare",
    version: "0.1.0",
    limitation: {
      max_limit: 500,
      auth_required: true,
    },
  },
  auth_timeout: 600,
} as const satisfies Config;
