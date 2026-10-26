# Loyalty Pass

Multi-shop digital stamp cards. Each shop owner creates an account and receives an isolated shop workspace. The app server is stateless; PostgreSQL stores shop data and server-side sessions.

## Current MVP rules

- A counter QR is signed and expires after five minutes.
- A customer can claim a given QR once per shop card.
- Each customer can collect one stamp every 12 hours at the same shop.
- Ten stamps earn one reward. Staff must confirm delivery and redeem that reward in the counter screen.
- Phone numbers identify cards within one shop; they are not shared between shops.
- A new customer verifies their phone by SMS before a card is created. Returning customers enter their card PIN.
- Customer PINs are hashed on the server and never saved by the browser.

These are initial platform-wide rules. Shop-specific reward programs, staff invitations, owner email verification, customer PIN recovery, and billing are not implemented yet.

## Local setup

Requirements: Node.js 20 or later and PostgreSQL 15 or later.

1. Create a PostgreSQL database and a non-superuser role for the app.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`, a random `APP_SECRET` of at least 32 bytes, and MSG91 credentials for customer phone verification.
3. Install packages and initialize the schema:

   ```powershell
   npm ci
   npm run migrate
   npm start
   ```

4. Open `http://localhost:3000` to create the first shop owner account.

The app refuses to start without PostgreSQL and `APP_SECRET`. In production, it also requires MSG91 credentials and a canonical HTTPS `PUBLIC_BASE_URL`. Migrations are run separately from the web process. Do not use the PostgreSQL superuser as the app connection role. The schema applies PostgreSQL row-level security to customers, stamp events, QR reuse records, verified phones, and reward redemptions. All application queries for those records set a transaction-scoped shop ID.

For MSG91, configure an account, approved OTP template and valid DLT registration for the countries where messages will be sent. Keep the auth key and template ID in the host's secret manager. The app fails startup in production if either required MSG91 setting is missing. Review the [MSG91 OTP API documentation](https://docs.msg91.com/otp) and test OTP delivery and mobile-number formatting using MSG91's test/sandbox configuration before real customer use.

## Configuration

| Variable | Required | Purpose |
|---|---:|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string for the app or migration command |
| `APP_SECRET` | Yes | Persistent HMAC key for QR signatures; generate at least 32 random bytes |
| `NODE_ENV` | No | Set to `production` to enable secure-only session cookies and HSTS |
| `PORT` | No | HTTP listener port; defaults to `3000` |
| `PUBLIC_BASE_URL` | Production | Canonical HTTPS origin encoded into counter QR codes |
| `TRUST_PROXY` | Production behind proxy | Set to `true` only when the app is behind your trusted HTTPS proxy |
| `DATABASE_SSL` | Provider-specific | Set to `true` when the database provider requires TLS |
| `DB_POOL_MAX` | No | PostgreSQL connection pool size; defaults to `10` |
| `MSG91_AUTH_KEY` | Production | Secret auth key from MSG91 |
| `MSG91_OTP_TEMPLATE_ID` | Production | Approved MSG91 OTP template ID |
| `MSG91_COUNTRY_CODE` | No | Default dialing code for numbers entered without `+`; defaults to India (`91`) |
| `MSG91_OTP_LENGTH` | No | OTP digits, from 4 to 8; defaults to `6` |
| `MSG91_OTP_EXPIRY_MINUTES` | No | Provider OTP expiry from 1 to 60 minutes; defaults to `5` |

Generate a secret with PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Set the result in the hosting provider's secret manager. Do not commit `.env`, MSG91 credentials, or production customer data.
Production database URLs must use PostgreSQL and a password of at least 24 characters. The server validates the database URL, `APP_SECRET`, public HTTPS origin, and provider settings before serving traffic.

## Container deployment

`Dockerfile` runs the app as the unprivileged Node.js user. `compose.yaml` keeps PostgreSQL off the public host ports, persists its data in a named volume, binds the app only to host loopback, and provides separate readiness/liveness checks. Put a TLS reverse proxy in front of the app; configure it to be the one trusted proxy hop.

For a single-host deployment or staging environment:

1. Copy `.env.compose.example` to `.env`. Set a real HTTPS domain, MSG91 credentials, an `APP_SECRET` generated with at least 32 random bytes, and a random hexadecimal `DB_PASSWORD` (hex avoids URL-escaping issues in `DATABASE_URL`).
   Generate the two random values in PowerShell:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Build the image and apply the schema before starting the app:

   ```powershell
   docker compose --profile tools run --rm migrate
   docker compose up -d --build app
   docker compose ps
   ```

3. Configure a host-level TLS reverse proxy to `http://127.0.0.1:3000`. Restrict access to the host and database volume, and keep `.env` readable only by the deployment account.

The Compose database is a single-host PostgreSQL instance, not a highly available or managed database. For a public production launch, use a managed PostgreSQL service with private networking, TLS, automated off-host backups, and tested restore procedures. Configure `DATABASE_URL` and `DATABASE_SSL=true` for that service, and adapt the Compose database dependency/networking to the hosting platform. Run the migration job before each app release; app startup checks that the expected schema exists but does not run migrations automatically.

## Deployment shape

Run the Node.js app as a separately managed web service and PostgreSQL as a separately managed database. Keep the database private, allow connections only from the app, enable provider-managed backups and TLS, and use a non-superuser database identity. Set `PUBLIC_BASE_URL` to the stable HTTPS site origin. Run `npm run migrate` as a release step before deploying the new app version. `/health/live` is the liveness probe; `/health/ready` and the backward-compatible `/api/health` check database/schema readiness.

Multiple app instances can share the same PostgreSQL database: sessions, cooldowns, QR replay records, and rate-limit buckets are stored in PostgreSQL, not process memory. Do not run multiple services against one production database until the schema is migrated and the database connection limits are planned.

## Data and migration

`database.json` is legacy prototype data and is no longer read by the app. It is not imported automatically because those records have no verified shop ownership. Back it up securely and decide which real shop owns each record before any manual import. Do not upload test or sample customer data into production.

## Checks

```powershell
npm test
node --check server.js
node --check migrate.js
```

Before onboarding paying shops, test the hosted configuration, cross-shop access isolation, database backup restoration, account recovery, reward redemption, SMS delivery, and monitoring/alert delivery. The current MVP is not a substitute for privacy terms, a data retention policy, tax/accounting review, payment billing setup, or a live end-to-end acceptance test. It is not production-launch ready until those operational checks and real provider configuration are complete.
