<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

A demo copy runs on [Railway](https://railway.com) for mentor review. It is short-lived and
holds no real data. The deploy itself is `.github/workflows/deploy.yml`; the service settings
below live in the Railway dashboard (Railway retires `railway.json` on 2026-12-01).

**How a change ships:** a merge (any push) to `main` runs the `Quality gate` workflow → once it
passes, the `Deploy` workflow uploads that exact commit with `railway up` → Railway builds it,
the pre-deploy command migrates the database, and the new version takes traffic after
`/api/health` answers → `Deploy` goes green only when the deployment reaches `SUCCESS`. A red
Quality gate deploys nothing; a failed migration or health check stops the deploy, the old
version keeps running, and `Deploy` goes red.

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

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

To add it to this project:

```bash
$ npm install @nestjs/observe
```

Then follow the [setup guide](https://docs.nestjs.com/observability/overview) - it takes a single import and an app key.

The free plan needs no payment details and covers 300,000 events a month. You can also browse the [live demo](https://www.observe-demo.nestjs.com/dashboard) first - the whole dashboard over a busy service's data, with nothing to install.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observe](https://observe.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
