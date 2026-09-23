# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Hotel Management System — backend REST API only, no frontend. NestJS 12 training **Mock Project**
(reviewed by a mentor, never deployed). Project documents are written in Vietnamese with English
headings, column names and identifiers; keep that split.

## Commands

```bash
docker compose up -d          # Postgres 17 (:5432, hotel/hotel), Redis 8 (:6379), Mailpit (UI :8025)
cp .env.example .env          # local config; CI injects its own env (see .github/workflows/quality-gate.yml)

npm run start:dev             # watch mode
npm run build                 # nest build → dist/
npm run lint                  # oxlint --type-aware src/ test/
npm run format                # oxfmt (config: .oxfmtrc.json — sorts imports, ignores *.md and project/)
npm run format:check
npm test                      # vitest, unit: **/*.spec.ts
npm run test:e2e              # vitest, e2e: **/*.e2e-spec.ts — needs the docker stack up; runs against `hotel_test`
                              # (.env.test), applies migrations first, refuses any DB not named *_test
npm run test:cov

npx vitest run src/auth/activation-token.spec.ts                  # one unit file
npx vitest run -t "should return"                                 # by test name
npx vitest run --config vitest.config.e2e.ts test/health.e2e-spec.ts # one e2e file
npm run migration:generate -- src/database/migrations/CreateUsers      # then migration:run | revert | show

curl -s localhost:8025/api/v1/messages                            # what Mailpit received
curl -s "localhost:8025/api/v1/search?query=to%3Aa@example.com"   # find one; /api/v1/message/{id} for the body
curl -s localhost:8025/api/v1/message/{id}/html-check             # client-compatibility score
```

Node 24 (`.nvmrc`). CI (`Quality gate`) runs lint → format:check → build → unit → e2e on every push and PR.

Testing: e2e over HTTP against real Postgres is primary (one file per module, `resetDb(app)` in `beforeEach`,
fixtures via fishery + faker in `test/support/factories/`); unit specs only for pure functions. No mocked repositories.
e2e shares Redis db 0, the `mail` queue and Mailpit with `npm run start:dev`, so a run clears your dev inbox
(`clearMailbox()` in `beforeEach`). Give e2e its own queue name / Redis db when that starts to hurt.

## Module layout

`src/<module>/`: module, controllers, services, strategies flat; `entities/`, `schemas/`, `guards/`,
`decorators/` get folders whenever the module has any. Specs sit beside their source.
An entity belongs to the module whose service INSERTs the row — hence `user_email_verifications`
lives in `src/auth/`, not `src/users/`. Injected properties are named after their class:
`authService`, `usersRepository`, `envService`.

## Stack decisions already made

- **ESM** (`"type": "module"`, `nodenext`): relative imports need the `.js` extension (`./app.module.js`).
- **Validation = Zod through NestJS 12's native Standard Schema support** — `@Body({ schema })`,
  `@Query({ schema })`, global `StandardSchemaValidationPipe`, response filtering by
  `StandardSchemaSerializerInterceptor` (declared per route with `@RespondsWith`, see below).
  `class-validator` / `class-transformer` were removed on purpose; do not reintroduce them.
- **Auth is on by default**: `JwtAuthGuard` is registered as `APP_GUARD`, so every route needs a bearer
  token unless it carries `@Public()` (register, activate, login, health). `RolesGuard` (second
  `APP_GUARD`, after `JwtAuthGuard`) enforces `@Roles(...)`; a route without it is open to every role.
- **TypeORM + Postgres**, migrations only (`synchronize: false`); every migration needs a working
  `down` (NFR-006). Enums are `varchar` + `CHECK`, never Postgres native enums.
  `migration:generate` diffs entities against the DB named in `.env` and **drops any index entity
  metadata does not know about** — so no hand-written indexes.
- **BullMQ** (Redis) for mail jobs, `@nestjs-modules/mailer` (Mailpit locally, Gmail SMTP for demo),
  `@nestjs/schedule` for the hold-expiry cron and month-end report, JWT via `passport-jwt`,
  `nestjs-i18n`, `@nestjs/swagger` generates OpenAPI from code (not hand-written); the UI is Scalar (`@scalar/nestjs-api-reference`) at `/api/docs`, no `docs-json` route.
- **Mail** is MJML compiled from Handlebars (`MjmlAdapter`): one `src/mail/templates/layout.hbs` plus a
  `.mjml` per message, with the queue and worker from `MailerQueueModule` — which needs `ioredis`
  installed (optional peer; without it the worker retry-loops until Node runs out of heap). Two traps:
  `layout` / `partials` are read from the mailer's **top-level** `options`, not `template.options`; and
  `mj-text` defaults to `padding: 10px 25px`, so buttons and dividers must repeat that 25px or they
  hang off the left edge of the copy.
- Errors use NestJS's default `{ statusCode, message, error }` shape — no custom filter.

## Documents: which ones are truth

```
project/02_requirements/   approved requirements — never edit silently; on conflict, ask
project/03_basic-design/   DESIGN INTENT written before any code (database-design.md, api-design/api-list.md, ERD)
plans/                     gitignored scratch: research reports, previews, BA/PM agent memory
docs/                      not yet used; reserved for code-derived docs (rebuild-spec)
```

**`03_basic-design` is a hypothesis, not an order.** It was designed without code. When implementing,
if the design is wrong, impossible, or clearly worse than an alternative: do not silently follow it and
do not silently diverge — surface the conflict with options, and after the decision append a row to
that document's `## Deviations` section (date · what changed · why) and fix the main text.

Key facts from the requirements that shape everything (see `project/02_requirements/`):

- The unit sold is a **room type**, not a physical room. There is no `rooms` table by design.
- Capacity is checked **per day** over the half-open range `[check_in_date, check_out_date)`; a request
  is refused if any single day would exceed `total_rooms` (NFR-005). Today the service checks it inside a transaction that
  first row-locks the `room_types` row (`FOR UPDATE`); a true DB-level constraint is still deferred
  (`database-design.md` §7). Any code that writes `room_types` waits behind that lock by design.
- Requests hold rooms while `pending` or `approved`; a pending hold expires at
  `min(created_at + 24h, 00:00 Asia/Saigon on check-in day)`.
- Business-rule numbers (1–5 rooms, ≤30 nights, ≤12 months ahead) live in app config/validation, not
  in DB constraints.

## Data model shape (Immutable Data Model)

Tables come in three kinds; the pattern repeats for booking requests, reviews and users:

| Kind | Tables | Rule |
| --- | --- | --- |
| Resource | `users`, `room_types`, `amenities`, `room_type_amenities`, `user_email_verification_tokens` | Normal UPDATE allowed |
| Long-term event | `booking_requests`, `reviews` | INSERT once; afterwards only `status` changes |
| Outcome | `booking_request_{approvals,rejections,cancellations,expirations}`, `payments`, `review_{approvals,rejections}`, `user_{email_verifications,deactivations,reactivations}` | **INSERT-only**, one timestamp, no nullable column |

`status` on the parent is a projection of its outcome tables. Every transition is one transaction in the
service layer (no DB trigger):

```sql
INSERT INTO <outcome_table> (...);
UPDATE <parent> SET status = '<new>' WHERE id = $1 AND status = '<expected>';  -- rowCount must be 1, else rollback → 409
```

Never write code that updates `status` without inserting the matching outcome row.

## API conventions

- Base path `/api`; JSON keys camelCase (DB is snake_case); dates `YYYY-MM-DD`, timestamps ISO 8601 UTC; money is integer VND.
- No `/admin` prefix: one resource path, guards per method, list scope by role (user sees own, admin sees all).
- State transitions are noun sub-resources mirroring the outcome tables:
  `POST /booking-requests/:id/approval | rejection | cancellation`, `POST /users/:id/deactivation | reactivation`.
- Lists: `?page&perPage` → `{ data, meta: { total, page, perPage } }`. Single objects are returned unwrapped.

## Documenting an endpoint

- `@RespondsWith(schema, { status, description })` does both jobs — response filtering and the
  documented body (via `z.toJSONSchema`). Do not also add `@SerializeOptions`.
- Every collection uses the `{ data, meta }` envelope, `paginatedSchema(item)` — never a bare array.
  Nest's serializer validates an array response element by element, so a top-level `z.array(...)`
  is checked against each element and throws; the envelope sidesteps that entirely.
- `@ApiErrorResponse(status, message)` per failure the route can produce; the message doubles as the
  description.
- 400 (route takes a body, or a validated path/query parameter) and 401 (route is guarded) are injected centrally in
  `src/common/api-docs/standard-error-responses.ts` — never declare those per route.
- Nest documents `@Query({ schema })` and `@Param('id', { schema })` from the schema itself, with the
  real constraints (`default`, `minimum`, `maximum`). **Do not add `@ApiQuery`** — it appends a second
  copy of the same parameter. Per-param prose goes on the Zod field via `.describe()`.
- Declaring any `@ApiResponse` removes Nest's implicit success entry, so state the success status too.
- `z.date()` has no JSON Schema form: date fields carry `.meta({ type: 'string', format: 'date-time' })`.
- To inspect the generated document: boot `AppModule` in a scratch script under `dist/`, call
  `SwaggerModule.createDocument` + `addStandardErrorResponses`, print `doc.paths`.
