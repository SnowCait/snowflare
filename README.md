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

```shell
npm run deploy
```

## Assets and libraries

The icon by [jdecked/twemoji](https://github.com/jdecked/twemoji) is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
[Simple.css](https://github.com/kevquirk/simple.css) is licensed under [MIT](https://github.com/kevquirk/simple.css/blob/main/LICENSE).
[Nostr-Login](https://github.com/nostrband/nostr-login) is licensed under [MIT](https://github.com/nostrband/nostr-login/blob/main/LICENSE).
See [package.json](package.json) for other libraries.
