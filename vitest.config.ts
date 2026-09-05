import { fileURLToPath, URL } from "node:url";
import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "../config/override": fileURLToPath(
        new URL("./config/test.ts", import.meta.url),
      ),
    },
  },
  test: {
    testTimeout: 30_000,
  },
  plugins: [
    cloudflareTest({
      wrangler: {
        configPath: "./wrangler.jsonc",
      },
    }),
  ],
});
