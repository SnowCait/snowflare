# Snowflare

Nostr relay running on Cloudflare Workers.

## Install

```shell
npm install
```

### Repository: In memory

Nothing to do.

### Repository: KV + D1

```shell
npx wrangler kv namespace create accounts
npx wrangler kv namespace create events
npx wrangler d1 create snowflare-events
```

#### Local

```shell
npx wrangler d1 execute snowflare-events --local --file=./src/repository/kv/d1/schema.create.sql
```

#### Production

```shell
npx wrangler d1 execute snowflare-events --remote --file=./src/repository/kv/d1/schema.create.sql
```

## Development

Copy `config/default.ts` to `config/override.ts` and override them.

```shell
npm run dev
```

## Deploy

Cloudflare Workers Paid plan is required for [Durable Objects](https://developers.cloudflare.com/durable-objects/).

```shell
npm run deploy
```

## Assets

The icon by [jdecked/twemoji](https://github.com/jdecked/twemoji) is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
