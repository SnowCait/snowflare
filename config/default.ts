import { Config } from "../src/config";

export default {
  nip11: {
    name: "Snowflare",
    description: "",
    icon: "https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/2744.png",
    pubkey: "",
    contact: "",
    supported_nips: [1, 9, 11, 42, 70],
    software: "https://github.com/SnowCait/snowflare",
    version: "0.1.0",
    limitation: {
      max_subscriptions: 20,
      max_filters: 1,
      max_limit: 500,
      max_subid_length: 50,
      auth_required: true,
    },
  },
  auth_timeout: 600, // seconds
  default_limit: 50,
  repository_type: "kv-d1",
} as const satisfies Config;
