# Snowflare

Nostr relay running on Cloudflare Workers.

## Development

Copy `config/default.ts` to `config/override.ts` and override them.

```
npm install
npm run dev
```

## Deploy

Cloudflare Workers Paid plan is required for [Durable Objects](https://developers.cloudflare.com/durable-objects/).

```
npm run deploy
```
