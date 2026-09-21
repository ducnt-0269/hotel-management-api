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
npm run test:e2e              # vitest, e2e: **/*.e2e-spec.ts — needs the docker stack up
npm run test:cov

npx vitest run src/app.controller.spec.ts                         # one unit file
npx vitest run -t "should return"                                 # by test name
npx vitest run --config vitest.config.e2e.ts test/app.e2e-spec.ts # one e2e file
```

Node 24 (`.nvmrc`). CI (`Quality gate`) runs lint → format:check → build → unit → e2e on every push and PR.

## Stack decisions already made

- **ESM** (`"type": "module"`, `nodenext`): relative imports need the `.js` extension (`./app.module.js`).
- **Validation = Zod through NestJS 12's native Standard Schema support** — `@Body({ schema })`,
  `@Query({ schema })`, global `StandardSchemaValidationPipe`, response filtering with
  `@SerializeOptions({ schema })` + `StandardSchemaSerializerInterceptor`. `class-validator` /
  `class-transformer` were removed on purpose; do not reintroduce them.
- **TypeORM + Postgres**, migrations only (`synchronize: false`); every migration needs a working
  `down` (NFR-006). Enums are `varchar` + `CHECK`, never Postgres native enums.
- **BullMQ** (Redis) for mail jobs, `@nestjs-modules/mailer` (Mailpit locally, Gmail SMTP for demo),
  `@nestjs/schedule` for the hold-expiry cron and month-end report, JWT via `passport-jwt`,
  `nestjs-i18n`, `@nestjs/swagger` generates OpenAPI from code (not hand-written); the UI is Scalar (`@scalar/nestjs-api-reference`) at `/api/docs`, no `docs-json` route.
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
  is refused if any single day would exceed `total_rooms` (NFR-005 requires the database, not only the
  service, to enforce this — mechanism still open, see `database-design.md` §7).
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
