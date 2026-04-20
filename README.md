# Crypto-Signal-Pro

AI-powered SMC trading signals platform.

## Stack

- **Frontend:** Vite + React 18 + TypeScript + Tailwind + shadcn-ui
- **Backend:** Supabase (Postgres + Auth + Edge Functions em Deno)
- **Pagamentos:** Stripe (Free / Basic / Pro)
- **Deploy:** Vercel
- **i18n:** EN / PT / ES

## Development

Prerequisites: Node 20+, npm.

```sh
npm install          # install dependencies
npm run dev          # start dev server
npm run build        # production build
npm test             # run tests
npx tsc --noEmit     # type check
```

## Architecture

- `src/` — React app (components, pages, hooks, integrations).
- `supabase/functions/` — Deno edge functions (signal generation, alerts, etc.).
- `supabase/migrations/` — SQL migrations (append-only; **never edit applied migrations**).

## Environment variables

Copy `.env.example` to `.env` and fill in the values. All values are public (prefixed `VITE_`).

See [CLAUDE.md](./CLAUDE.md) for project rules.
