# Hotel Management API

REST API for a hotel's room bookings — backend only, no frontend. Visitors browse room types and
search what is free for a date range; registered users raise booking requests, pay through Stripe
Checkout and review their stays; admins approve or reject requests, moderate reviews and manage
users and room types.

A NestJS training **Mock Project**, reviewed by a mentor. The requirements and the design written
before the code are in [`project/`](project) (in Vietnamese).

**Live demo:** <https://hotel-management-api-production-915b.up.railway.app/api/docs> — short-lived,
see [Deployment](#deployment).

## Stack

| Concern | Choice |
| --- | --- |
| Runtime | Node 24 (`.nvmrc`), ESM, TypeScript |
| Framework | NestJS 12 |
| Validation | Zod through Nest's Standard Schema support (request bodies, queries, responses) |
| Database | PostgreSQL via TypeORM, schema changed by migrations only |
| Queue | BullMQ on Redis (outgoing mail) |
| Mail | `@nestjs-modules/mailer`, MJML templates, English and Vietnamese |
| Payments | Stripe Checkout (hosted page) confirmed by a signed webhook |
| Auth | JWT bearer tokens; every route is guarded unless marked public |
| API docs | OpenAPI generated from code, rendered by Scalar at `/api/docs` |
| Tests | Vitest — unit specs for pure functions, e2e over HTTP against real Postgres |

## Getting started

Needs Node 24 and Docker.

```bash
npm ci
cp .env.example .env              # local config; defaults match docker-compose.yml
docker compose up -d              # Postgres, Redis, Mailpit, stripe-mock
npm run migration:run
npm run seed                      # optional demo data
npm run start:dev
```

| URL | What |
| --- | --- |
| <http://localhost:3000/api> | The API (base path `/api`) |
| <http://localhost:3000/api/docs> | Interactive API reference |
| <http://localhost:8025> | Mailpit: every mail the app sends lands here |

The seed creates an admin `admin@hotel.local` and a set of guests (`an.nguyen@example.com`, …),
all with the password `Password123`, plus a year of bookings, payments and reviews.

**Payments in development** use a Stripe sandbox: put its `sk_test_…` key in `STRIPE_SECRET_KEY`,
then forward Checkout events to the local webhook with

```bash
docker compose --profile stripe up -d stripe-cli
docker compose logs stripe-cli    # prints the whsec_… for STRIPE_WEBHOOK_SECRET
```

## Commands

| Command | Does |
| --- | --- |
| `npm run start:dev` | Run with watch mode |
| `npm run build` / `npm run start:prod` | Compile to `dist/` / run the compiled app |
| `npm run lint` | oxlint (type-aware) |
| `npm run format` / `npm run format:check` | oxfmt |
| `npm test` | Unit tests (`**/*.spec.ts`) |
| `npm run test:e2e` | e2e tests (`test/**/*.e2e-spec.ts`); needs the Docker stack, runs against `hotel_test` |
| `npm run test:cov` | Unit tests with coverage |
| `npm run migration:generate -- src/database/migrations/<Name>` | Diff entities against the DB into a new migration |
| `npm run migration:run` / `migration:revert` / `migration:show` | Apply / undo the last / list migrations |
| `npm run seed` | Load demo data |

The e2e suite applies migrations itself and refuses any database not named `*_test`. It shares
Redis and Mailpit with `start:dev`, so a run clears your development inbox.

Every push and pull request runs the **Quality gate** workflow: lint → format check → build →
unit → e2e.

## Project layout

```text
src/
  <module>/            one per resource: auth, users, room-types, amenities,
                       booking-requests, payment-sessions, reviews, …
    <transition>/      one folder per state change that records an outcome
                       (e.g. booking-requests/approval/, users/deactivation/)
  common/              shared decorators, schemas, API-doc helpers
  config/              environment schema, validated at boot
  database/            TypeORM setup, migrations, seeders
  mail/                mail queue and MJML templates
test/                  e2e specs mirroring src/, factories and helpers
project/               requirements and basic design documents
```

## Deployment

A demo copy runs on [Railway](https://railway.com) for mentor review. It is short-lived and
holds no real data. The deploy itself is `.github/workflows/deploy.yml`; the service settings
below live in the Railway dashboard (Railway retires `railway.json` on 2026-12-01).

**How a change ships:** a pull request passes the `Quality gate` and is merged → the push to
`main` starts the `Deploy` workflow at once, which uploads the commit with `railway up` → Railway
builds it, the pre-deploy command migrates the database, and the new version takes traffic after
`/api/health` answers → `Deploy` goes green only when the deployment reaches `SUCCESS`. A failed
migration or health check stops the deploy, the old version keeps running, and `Deploy` goes red.
Every run is recorded under the `railway` environment, so the repo's **Deployments** panel shows
what is live and links to the demo.

`Deploy` does not wait for the `Quality gate` that also runs on `main`; the pull request's gate is
the check. Code that no gate tested can therefore ship when a branch merges behind `main` or a
commit is pushed to `main` directly. Branch protection closes both: require pull requests, and
require branches to be up to date before merging.

The Railway service has no GitHub source connected, so the workflow is the only way code
reaches it. It authenticates with the `RAILWAY_TOKEN` repository secret: a Railway project token
for the `production` environment (Project settings → Tokens).

### Services (one Railway project)

| Service | Source | Notes |
| --- | --- | --- |
| `hotel-management-api` | none — code arrives from the `Deploy` workflow | Built by Railpack (Node from `.nvmrc`); public domain |
| `Postgres` | Railway Postgres template | |
| `Redis` | Railway Redis template | Password-protected, hence `REDIS_PASSWORD` |
| `Mailpit` | image `axllent/mailpit` | Catches all mail. Public domain on port `8025` for the inbox; SMTP `1025` stays private |

### `hotel-management-api` settings

| Setting | Value |
| --- | --- |
| Start command | `npm run start:prod` |
| Pre-deploy command | `npx typeorm -d dist/database/data-source.js migration:run` |
| Healthcheck path | `/api/health` |
| Replicas | `1` — the hold-expiry cron and the mail worker run in-process |
| Public domain | target port `3000` |

### `hotel-management-api` variables

Values in `${{...}}` are Railway reference variables; the rest are entered by hand.

```bash
NODE_ENV=staging                      # deployed, but keeps /api/docs; `production` hides it
PORT=3000                             # the port the public domain targets
APP_BASE_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}

DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_USERNAME=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
DB_NAME=${{Postgres.PGDATABASE}}

REDIS_HOST=${{Redis.REDISHOST}}
REDIS_PORT=${{Redis.REDISPORT}}
REDIS_PASSWORD=${{Redis.REDISPASSWORD}}

MAIL_HOST=${{Mailpit.RAILWAY_PRIVATE_DOMAIN}}
MAIL_PORT=1025

JWT_SECRET=                           # a fresh random string, never the local one
STRIPE_SECRET_KEY=sk_test_...         # sandbox only
STRIPE_WEBHOOK_SECRET=whsec_...       # from the Stripe webhook endpoint, see below
PAYMENT_SUCCESS_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}/api/health
PAYMENT_CANCEL_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}/api/health
```

Set `MP_UI_AUTH=<user>:<password>` on `Mailpit`: its inbox shows every activation link.

### Stripe webhook

Railway gives the API a public address, so Stripe calls it directly; the `stripe-cli` container is
for local development only. In the Stripe sandbox, add a webhook endpoint at
`https://<api domain>/api/payment-sessions/stripe-webhook` for the events
`checkout.session.completed` and `checkout.session.expired`, and copy its signing secret into
`STRIPE_WEBHOOK_SECRET`. That secret differs from the one `stripe-cli` prints locally.

The app refuses to boot without `STRIPE_WEBHOOK_SECRET`, and the endpoint needs the domain, so
the first deploy runs with a placeholder (`whsec_placeholder`), then the real value replaces it.

Local and Railway share the sandbox, so each receives the other's events; an unknown session is
logged and acknowledged with 200, never recorded.

## License

Unlicensed — a private training project.
