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

Database:

```shell
npx wrangler d1 migrations apply snowflare-events --local
```

Environment variables:

Create `.dev.vars` file and set your API Token, Account ID and KV ID of events to use [Cloudflare API](https://developers.cloudflare.com/api/resources/kv/subresources/namespaces/subresources/keys/methods/bulk_get/).

```
API_TOKEN=
ACCOUNT_ID=
KV_ID_EVENTS=
LOCAL=true
```

#### Production

Database:

```shell
npx wrangler d1 migrations apply snowflare-events --remote
```

Environment variables:

```shell
npx wrangler secret put API_TOKEN
npx wrangler secret put ACCOUNT_ID
npx wrangler secret put KV_ID_EVENTS
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

## Export

```shell
npx wrangler d1 export snowflare-events --local --output=./backup.local.sql
```

When running in production, replace `local` with `remote`. Note that there will be rows read.

## Assets and libraries

The icon by [jdecked/twemoji](https://github.com/jdecked/twemoji) is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).  
[Simple.css](https://github.com/kevquirk/simple.css) is licensed under [MIT](https://github.com/kevquirk/simple.css/blob/main/LICENSE).  
[Nostr-Login](https://github.com/nostrband/nostr-login) is licensed under [MIT](https://github.com/nostrband/nostr-login/blob/main/LICENSE).  
See [package.json](package.json) for other libraries.
