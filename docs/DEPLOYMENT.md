# Pokket Pizza Deployment Runbook

Last updated: 2026-10-20
Status: production deployment verified on Cloudflare Workers free plan.
Audience: anyone deploying, rotating secrets, applying migrations, or debugging the hosted environment.

For architecture, code structure, and local development, read `docs/DEVELOPER_GUIDE.md` first.

> Repository note: markdown files in `docs/` are tracked. Binary design assets and PDFs in that directory remain ignored by the root `.gitignore`.

---

## 1. Production inventory

| Item | Value |
|---|---|
| Web Worker | `pokket-pizza-web` |
| Web URL | `https://pokket-pizza-web.pokket-pizza-backend.workers.dev` |
| API Worker | `pokket-pizza-api` |
| API URL | `https://pokket-pizza-api.pokket-pizza-backend.workers.dev` |
| Cloudflare account subdomain | `pokket-pizza-backend` |
| Custom domain | None |
| Database | Neon PostgreSQL |
| Frontend runtime | Next.js 16.3.5 through vinext |
| API runtime | Hono on Cloudflare Workers and Node |
| Auth | First-party `__Host-` cookies through a same-origin `/api/*` proxy |
| Worker-to-worker transport | Cloudflare service binding `API` |
| Admin login | `https://pokket-pizza-web.pokket-pizza-backend.workers.dev/admin/login` |
| Admin login endpoint | `POST /api/v1/auth/login` |
| API health | `https://pokket-pizza-api.pokket-pizza-backend.workers.dev/health` |
| Twilio webhook | `https://pokket-pizza-api.pokket-pizza-backend.workers.dev/api/webhooks/twilio-status` |

Current production state:

- API Worker secrets `DATABASE_URL` and `JWT_SECRET` are set.
- Twilio secrets are not required for the app to run and may be unset.
- The web Worker uses the `API` service binding; it does not call the API over the public `*.workers.dev` URL.
- No custom domain is configured.
- `CORS_ORIGIN` in `backend/wrangler.jsonc` is still `http://localhost:3000`. The production proxy does not send an `Origin` header, so this does not affect normal traffic.
- The Neon database password should be rotated as part of routine secret hygiene. See section 12.

First deployment smoke results:

- `/api/v1/menu` through the web Worker: 200.
- `/`, `/menu`, `/admin/login`: 200.
- Admin login, admin ping, refresh, logout: 200.
- Customer signup, me, refresh, logout: 200.
- `GET /api/v1/auth/login`: 404, which is expected because login is POST-only.

---

## 2. Architecture and request path

```text
Browser
  |
  | https://pokket-pizza-web...workers.dev
  v
pokket-pizza-web Worker
  - serves Next.js pages and assets
  - /api/* route proxies to the API Worker
  - Sets no domain on cookies; cookies stay on the web origin
  |
  | env.API.fetch(...)
  | Cloudflare service binding
  v
pokket-pizza-api Worker
  - Hono API
  - Prisma + Neon adapter
  |
  v
Neon PostgreSQL
```

Critical rule: do not replace the service binding with a public `fetch` to the API Worker's `*.workers.dev` URL. Same-zone Worker-to-Worker fetches over `*.workers.dev` are blocked by Cloudflare with error 1042.

The proxy route uses plain `fetch` only when no binding exists, which is the local development case.

---

## 3. Prerequisites

Local machine:

- Node.js 20 LTS or newer (the repo declares `>=18`, but use a current LTS).
- npm.
- Git.
- PowerShell 5.1 or newer on Windows, or an equivalent shell on macOS/Linux.
- Access to the repository and the canonical `develop` branch.

Accounts and access:

- Cloudflare account with Workers access.
- Neon project with a PostgreSQL database.
- Optional Twilio account with WhatsApp Content templates.
- A password manager or secure secret store for production values.

CLI authentication:

```powershell
npx wrangler whoami
```

If not authenticated:

```powershell
npx wrangler login
# or, if using the cf CLI:
cf auth login
```

---

## 4. Configuration files

| File | Purpose |
|---|---|
| `backend/wrangler.jsonc` | API Worker name, entrypoint, compatibility, observability, non-secret vars |
| `frontend/cloudflare.config.ts` | Web Worker name, entrypoint, compatibility, assets, `API_ORIGIN`, `API` binding |
| `frontend/vite.config.ts` | vinext and Cloudflare Vite plugin |
| `frontend/worker/index.ts` | Custom Worker entry that exposes bindings on `globalThis.__CF_ENV__` |
| `frontend/src/app/api/[...path]/route.ts` | Same-origin proxy to the API |
| `backend/.env.example` | Node/local env template |
| `backend/.dev.vars.example` | Wrangler/local Worker env template |
| `prisma7.config.ts` | Prisma schema, migrations, seed, and datasource URL |
| `backend/src/config/env.ts` | Runtime env validation |
| `prisma/migrations/` | Database migration SQL |

Important build-time values:

- `API_ORIGIN` is read by the proxy route at build time via `process.env.API_ORIGIN`.
- `deploy:vinext` re-runs the vinext build, so the value must be present on the deploy command itself.
- The `API_ORIGIN` text binding in `cloudflare.config.ts` is declarative and is not read by the current proxy route. Do not rely on changing only that binding.

---

## 5. Environment and secrets

### 5.1 API Worker non-secret vars

These live in `backend/wrangler.jsonc` and are deployed with the Worker:

| Variable | Production value |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_ISSUER` | `pokket-pizza` |
| `JWT_AUDIENCE` | `pokket-pizza-admin` |
| `ACCESS_TOKEN_TTL` | `7d` |
| `REFRESH_TOKEN_TTL_DAYS` | `30` |
| `COOKIE_DOMAIN` | empty |
| `CORS_ORIGIN` | `http://localhost:3000` (see note below) |
| `SHOP_LATITUDE` | `18.456165955627945` |
| `SHOP_LONGITUDE` | `73.86959266088635` |
| `LOG_LEVEL` | `info` |

Changing a var requires editing `backend/wrangler.jsonc` and redeploying the API Worker.

### 5.2 API Worker secrets

Set with Wrangler. These are encrypted and not stored in the repository.

| Secret | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Neon pooled PostgreSQL connection string |
| `JWT_SECRET` | Yes | At least 32 characters; use a random value |
| `TWILIO_ACCOUNT_SID` | No | Required for real WhatsApp sending |
| `TWILIO_AUTH_TOKEN` | No | Required for sending and webhook verification |
| `TWILIO_WHATSAPP_NUMBER` | No | WhatsApp-enabled sender |
| `CUSTOMER_TEMPLATE_SID` | No | Twilio Content template |
| `ADMIN_TEMPLATE_SID` | No | Twilio Content template |

Commands, from `backend/`:

```powershell
npx wrangler secret put DATABASE_URL
npx wrangler secret put JWT_SECRET
npx wrangler secret list
```

From the repository root with an explicit config:

```powershell
npx wrangler secret put DATABASE_URL --config backend/wrangler.jsonc
npx wrangler secret put JWT_SECRET --config backend/wrangler.jsonc
npx wrangler secret list --config backend/wrangler.jsonc
```

Generate a JWT secret locally:

```powershell
$bytes = New-Object byte[] 48
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

Do not put the generated value in shell history, chat, screenshots, or source control.

Secrets take effect for subsequent requests; a code redeploy is not normally required after `wrangler secret put`.

If `wrangler secret put` reports that the Worker does not exist, deploy the API Worker once first, then set secrets.

### 5.3 Web Worker vars and bindings

Declared in `frontend/cloudflare.config.ts`:

| Name | Type | Value |
|---|---|---|
| `ASSETS` | Assets binding | Generated by vinext |
| `API_ORIGIN` | Text binding | Build-time `API_ORIGIN`, default `http://localhost:4000` |
| `API` | Service binding | `pokket-pizza-api` |

Production build/deploy environment:

```powershell
$env:API_ORIGIN = "https://pokket-pizza-api.pokket-pizza-backend.workers.dev"
```

The browser-side API base defaults to `/api/v1` in production, which hits the proxy.

### 5.4 Local env files

| File | Used by |
|---|---|
| `backend/.env` | Node dev server, Prisma CLI, seed |
| `backend/.dev.vars` | `wrangler dev` |
| `backend/.env.example` | Template for `.env` |
| `backend/.dev.vars.example` | Template for `.dev.vars` |
| `frontend/.env*` | Frontend build/dev values, all gitignored |

Never commit `.env`, `.dev.vars`, or any file containing `DATABASE_URL`, `JWT_SECRET`, `TWILIO_AUTH_TOKEN`, or Cloudflare tokens.

### 5.5 CORS note

`CORS_ORIGIN` is a comma-separated allowlist. The production proxy forwards the request without an `Origin` header, so CORS does not normally apply in production.

If direct browser access to the API Worker is ever required, update `CORS_ORIGIN` in `backend/wrangler.jsonc` to the web origin and redeploy. Do not weaken it to `*` while credentials are enabled.

---

## 6. First-time deployment from scratch

This is the order that works. Do not deploy the web Worker before the API Worker exists, because the web Worker declares a service binding to it.

### 6.1 Install and verify locally

```powershell
npm install
npm run typecheck -w backend
npm test -w backend
npm run lint -w frontend
npm run build -w frontend
```

### 6.2 Create the database

1. Create a Neon project and database.
2. Copy the connection string.
3. Prefer the pooled connection string for the Worker runtime.
4. For migrations, use a direct/non-pooled connection if Neon exposes one; pooled connections can be less reliable for schema changes.
5. Store the connection string in a password manager.

Do not put it in `wrangler.jsonc`.

### 6.3 Apply migrations

Set the connection string in the shell:

```powershell
$env:DATABASE_URL = "<neon connection string>"
npx prisma migrate deploy --config prisma7.config.ts
npx prisma migrate status --config prisma7.config.ts
```

The chain includes `20261020120000_pgcrypto`, which is required for password hashing:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

If `crypt()` or `gen_salt()` is missing later, this migration did not apply.

### 6.4 Initialize data

The repository seed is destructive and development-only. It refuses to run when `NODE_ENV=production` or when `ALLOW_DATABASE_RESET` is not `true`.

For a development or staging database:

```powershell
$env:NODE_ENV = "development"
$env:ALLOW_DATABASE_RESET = "true"
$env:ADMIN_PASSWORD = "<strong admin password>"
npx tsx prisma/seed.ts
```

The seed creates:

- Restaurant: Pokket Pizza.
- Admin: `admin@pokketpizza.com`.
- Categories, menu items, variants, add-ons.
- Demo customers and orders.

For a new production database, do not disable the guard and do not run the destructive reset. Use a reviewed bootstrap script or migration that inserts the restaurant and admin with a pgcrypto hash. The existing production database was initialized during the project migration; treat it as live data.

### 6.5 Authenticate to Cloudflare

```powershell
npx wrangler whoami
# If needed:
npx wrangler login
```

### 6.6 Deploy the API Worker

From the repository root:

```powershell
npm run deploy -w backend
```

This runs:

1. `prisma generate --config ../prisma7.config.ts`
2. `wrangler deploy`

It does not run migrations.

If this is the first deployment and the Worker did not exist, set secrets now:

```powershell
npx wrangler secret put DATABASE_URL --config backend/wrangler.jsonc
npx wrangler secret put JWT_SECRET --config backend/wrangler.jsonc
```

Or from `backend/`:

```powershell
npx wrangler secret put DATABASE_URL
npx wrangler secret put JWT_SECRET
```

Verify the Worker:

```powershell
Invoke-RestMethod "https://pokket-pizza-api.pokket-pizza-backend.workers.dev/health"
```

Expected:

```json
{ "success": true, "data": { "status": "ok" }, "requestId": "req_..." }
```

A 500 here usually means `JWT_SECRET` is missing or too short, because env validation runs at module load. A 500 on menu/DB requests usually means `DATABASE_URL` is missing or wrong.

### 6.7 Deploy the web Worker

The API Worker must already exist.

```powershell
$env:API_ORIGIN = "https://pokket-pizza-api.pokket-pizza-backend.workers.dev"
npm run deploy:vinext -w frontend
```

This re-runs the vinext build and deploys `pokket-pizza-web`.

Do not deploy with `API_ORIGIN` left at its default `http://localhost:4000`. The production transport uses the service binding, but a correct build-time origin keeps the fallback and generated config coherent and avoids debugging confusion.

### 6.8 Verify the binding

1. Cloudflare dashboard -> Workers & Pages -> `pokket-pizza-web` -> Settings -> Bindings.
2. Confirm a service binding named `API` points at `pokket-pizza-api`.
3. Confirm `ASSETS` is present.
4. Confirm the Worker URL resolves.

Runtime verification:

```powershell
Invoke-RestMethod "https://pokket-pizza-web.pokket-pizza-backend.workers.dev/api/v1/menu"
```

Expected: 200 with the menu envelope.

If this fails with error 1042 or a generic 500, the proxy is not using the binding. See section 14.

---

## 7. Routine deployment

### 7.1 Deploy only the API

Use when backend code, API vars, or Prisma generation changes.

```powershell
npm run deploy -w backend
```

Run migrations first if the schema changed. See section 8.

### 7.2 Deploy only the web Worker

Use when frontend code, `cloudflare.config.ts`, the worker entry, or the binding changes.

```powershell
$env:API_ORIGIN = "https://pokket-pizza-api.pokket-pizza-backend.workers.dev"
npm run deploy:vinext -w frontend
```

### 7.3 Deploy both

Recommended order:

1. Back up or branch the database.
2. Apply migrations.
3. Deploy the API.
4. Verify API health and menu.
5. Deploy the web Worker.
6. Run the smoke tests.

### 7.4 Changing the API Worker name

If `backend/wrangler.jsonc` changes `name`:

1. Deploy the API Worker under the new name.
2. Update the service binding worker name in `frontend/cloudflare.config.ts`.
3. Update `API_ORIGIN` to the new URL.
4. Redeploy the web Worker.
5. Verify `/api/v1/menu`.

A stale binding produces a "worker not found" style error or a 500 from the proxy.

---

## 8. Database migrations and seed

### 8.1 Before migrating

- Create a Neon branch, snapshot, or backup.
- Confirm `DATABASE_URL` points at the intended database.
- Review the migration SQL.
- Keep schema changes backwards compatible for rolling deploys when possible.

### 8.2 Apply

From the repository root:

```powershell
$env:DATABASE_URL = "<connection string>"
npx prisma migrate deploy --config prisma7.config.ts
npx prisma migrate status --config prisma7.config.ts
```

If the URL is stored in `backend/.dev.vars`:

```powershell
$line = Get-Content backend\.dev.vars | Where-Object { $_ -like 'DATABASE_URL=*' } | Select-Object -First 1
$env:DATABASE_URL = $line -replace '^DATABASE_URL=', ''
npx prisma migrate deploy --config prisma7.config.ts
```

`prisma7.config.ts` also loads `backend/.env`, so the shell variable is optional if that file is configured.

### 8.3 Seed

Development/staging only:

```powershell
$env:NODE_ENV = "development"
$env:ALLOW_DATABASE_RESET = "true"
$env:ADMIN_PASSWORD = "<strong admin password>"
npx tsx prisma/seed.ts
```

Never run this against production data. It deletes orders, customers, addresses, menu data, admins, and the restaurant before recreating them.

### 8.4 Migration rollback policy

Prisma migrations are forward-only. There are no down migrations in this repository.

To recover:

- Restore a Neon branch/backup to a point before the migration, or
- Write and apply a new forward migration that repairs the schema/data.

Coordinate the database and Worker rollback. An older Worker may not understand a newer schema, and a newer Worker may require columns the old schema lacks.

---

## 9. Smoke tests

Run these after every production deployment.

### 9.1 Expected results

| Check | Expected |
|---|---|
| `GET $ApiBase/health` | 200, `{ status: "ok" }` |
| `GET $WebBase/api/v1/menu` | 200 |
| `GET $WebBase/` | 200 |
| `GET $WebBase/menu` | 200 |
| `GET $WebBase/admin/login` | 200 |
| `POST $WebBase/api/v1/auth/login` | 200, admin cookies |
| `GET $WebBase/api/v1/admin/ping` | 200 |
| `POST $WebBase/api/v1/auth/refresh` | 200, rotated cookies |
| `POST $WebBase/api/v1/auth/logout` | 200, cookies cleared |
| `POST $WebBase/api/v1/auth/customer/signup` with a unique phone | 201, customer cookies |
| `GET $WebBase/api/v1/auth/customer/me` | 200 |
| `POST $WebBase/api/v1/auth/customer/refresh` | 200 |
| `POST $WebBase/api/v1/auth/customer/logout` | 200 |
| `GET $WebBase/api/v1/auth/login` | 404 (POST-only route) |

Admin cookies expected:

- `__Host-admin_access`
- `__Host-admin_refresh`

Customer cookies expected:

- `__Host-customer_access`
- `__Host-customer_refresh`

All should be `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, and have no `Domain`.

### 9.2 PowerShell smoke script

Save as a local file or run interactively. Replace the admin password with an environment value; never commit a real password.

```powershell
param(
  [string]$WebBase = "https://pokket-pizza-web.pokket-pizza-backend.workers.dev",
  [string]$ApiBase = "https://pokket-pizza-api.pokket-pizza-backend.workers.dev",
  [string]$AdminEmail = "admin@pokketpizza.com",
  [string]$AdminPassword = $env:ADMIN_PASSWORD
)

$ErrorActionPreference = "Stop"

function Show-Result([string]$Name, $Value) {
  Write-Host ("[OK] {0}: {1}" -f $Name, $Value)
}

if (-not $AdminPassword) {
  throw "Set ADMIN_PASSWORD before running the smoke test."
}

# Public health
$health = Invoke-RestMethod "$ApiBase/health"
if (-not $health.success) { throw "API health failed" }
Show-Result "API health" $health.data.status

# Menu through the web proxy (verifies the service binding and DB)
$menu = Invoke-RestMethod "$WebBase/api/v1/menu"
if (-not $menu.success) { throw "Menu request failed" }
Show-Result "Menu via web proxy" $menu.data.categories.Count

# Public pages
$pages = @("/", "/menu", "/cart", "/checkout", "/login", "/signup", "/profile", "/settings", "/admin/login", "/admin/dashboard")
foreach ($page in $pages) {
  $response = Invoke-WebRequest -Uri "$WebBase$page" -UseBasicParsing
  if ($response.StatusCode -ne 200) { throw "Page $page returned $($response.StatusCode)" }
  Show-Result "Page $page" $response.StatusCode
}

# Admin session through the proxy
$adminSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$adminBody = @{ email = $AdminEmail; password = $AdminPassword } | ConvertTo-Json
$adminLogin = Invoke-RestMethod -Method Post -Uri "$WebBase/api/v1/auth/login" `
  -WebSession $adminSession -ContentType "application/json" -Body $adminBody
if (-not $adminLogin.success) { throw "Admin login failed" }
Show-Result "Admin login" $adminLogin.data.admin.email

$ping = Invoke-RestMethod "$WebBase/api/v1/admin/ping" -WebSession $adminSession
if (-not $ping.success) { throw "Admin ping failed" }
Show-Result "Admin ping" $ping.data.ok

$adminRefresh = Invoke-RestMethod -Method Post -Uri "$WebBase/api/v1/auth/refresh" `
  -WebSession $adminSession -ContentType "application/json" -Body "{}"
if (-not $adminRefresh.success) { throw "Admin refresh failed" }
Show-Result "Admin refresh" $adminRefresh.data.admin.email

$adminLogout = Invoke-RestMethod -Method Post -Uri "$WebBase/api/v1/auth/logout" `
  -WebSession $adminSession -ContentType "application/json" -Body "{}"
if (-not $adminLogout.success) { throw "Admin logout failed" }
Show-Result "Admin logout" $adminLogout.data.ok

# Customer session with unique phone and a strong non-guessable password
$customerSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$phone = "9" + (Get-Random -Minimum 100000000 -Maximum 999999999)
$customerBody = @{
  name = "Smoke Test"
  phone = $phone
  password = "Zq7!vLm2#Rtx9"
} | ConvertTo-Json

$signup = Invoke-RestMethod -Method Post -Uri "$WebBase/api/v1/auth/customer/signup" `
  -WebSession $customerSession -ContentType "application/json" -Body $customerBody
if (-not $signup.success) { throw "Customer signup failed" }
Show-Result "Customer signup" $signup.data.customer.phone

$me = Invoke-RestMethod "$WebBase/api/v1/auth/customer/me" -WebSession $customerSession
if (-not $me.success) { throw "Customer me failed" }
Show-Result "Customer me" $me.data.customer.phone

$customerRefresh = Invoke-RestMethod -Method Post -Uri "$WebBase/api/v1/auth/customer/refresh" `
  -WebSession $customerSession -ContentType "application/json" -Body "{}"
if (-not $customerRefresh.success) { throw "Customer refresh failed" }
Show-Result "Customer refresh" $customerRefresh.data.customer.phone

$customerLogout = Invoke-RestMethod -Method Post -Uri "$WebBase/api/v1/auth/customer/logout" `
  -WebSession $customerSession -ContentType "application/json" -Body "{}"
if (-not $customerLogout.success) { throw "Customer logout failed" }
Show-Result "Customer logout" $customerLogout.data.ok

# Admin login must be POST-only
try {
  Invoke-RestMethod "$WebBase/api/v1/auth/login" | Out-Null
  throw "Expected GET /api/v1/auth/login to fail"
} catch {
  if ([int]$_.Exception.Response.StatusCode -ne 404) { throw }
  Show-Result "GET /api/v1/auth/login" 404
}

Write-Host "Smoke test completed."
```

Notes:

- The customer password policy rejects names, phone numbers, email addresses, common passwords, all-digit strings, and repeated characters. Use a random strong value.
- A guest row can be claimed by signup, so a signup can return 200 instead of 201 if the phone already exists without a credential. The script uses a fresh random phone and expects 201.
- `Invoke-WebRequest` behavior differs slightly across PowerShell versions. If a page check throws on redirect behavior, inspect the actual status and URL manually.

### 9.3 Optional database check

`GET /health/db` requires an admin session on the API origin. Logging in through the web proxy sets the cookie on the web origin, so a direct API `/health/db` call will not receive it.

For a DB check, use the menu endpoint through the proxy, or log in directly against `$ApiBase` with a separate web session:

```powershell
$apiSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body = @{ email = "admin@pokketpizza.com"; password = $env:ADMIN_PASSWORD } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$ApiBase/api/v1/auth/login" `
  -WebSession $apiSession -ContentType "application/json" -Body $body
Invoke-RestMethod "$ApiBase/health/db" -WebSession $apiSession
```

---

## 10. Observability and verification

### 10.1 Logs

API Worker:

```powershell
npx wrangler tail pokket-pizza-api --format pretty
```

Web Worker:

```powershell
npx wrangler tail pokket-pizza-web --format pretty
```

Both are also available in the Cloudflare dashboard under Workers & Pages -> the Worker -> Logs.

The API Worker has observability enabled in `backend/wrangler.jsonc`.

### 10.2 Request IDs

API error responses include a `requestId` such as `req_ab12cd34ef56`. The same ID appears in the structured JSON access/error logs. Use it to correlate a browser/API error with Worker logs.

### 10.3 Log safety

- Access logs redact order tokens and phone numbers in URLs.
- Do not log cookies, authorization headers, passwords, JWTs, or full connection strings.
- The custom logger serializes errors but not request headers.
- When sharing logs in a bug report, remove PII and any tokens.

### 10.4 Health checks

- `/health` verifies the Worker is running.
- `/health/db` verifies database connectivity and requires admin auth.
- `/api/v1/menu` through the web Worker verifies the full path: web Worker -> proxy -> service binding -> API -> Neon.

---

## 11. Rollback and recovery

### 11.1 Web Worker rollback

Use Cloudflare dashboard -> Workers & Pages -> `pokket-pizza-web` -> Deployments -> select a previous deployment -> Rollback.

Or use Wrangler from the repository root:

```powershell
npx wrangler rollback --name pokket-pizza-web
```

### 11.2 API Worker rollback

Use Cloudflare dashboard -> Workers & Pages -> `pokket-pizza-api` -> Deployments -> Rollback.

Or from the repository root:

```powershell
npx wrangler rollback --name pokket-pizza-api
```

### 11.3 Database rollback

There are no down migrations. Use one of:

- Neon branch/snapshot restore to a point before the migration.
- A new forward migration that repairs the schema or data.
- A backup restore into a fresh database and repoint `DATABASE_URL`.

Do not roll back the database by deleting migrations from `_prisma_migrations`.

### 11.4 Coordinating rollbacks

- Web-only bug: roll back the web Worker; the API can stay.
- API-only bug: roll back the API Worker; the web Worker can stay.
- Schema change: roll back Worker code and database together, or ensure the older Worker is compatible with the newer schema.
- Secret mistake: re-put the previous secret value; no code rollback needed.

### 11.5 Recovering a deleted Worker

1. Recreate it with the deploy command.
2. Re-set all secrets.
3. Re-create the service binding if the web Worker's binding target changed.
4. Run migrations if the database is also new.
5. Run the smoke tests.

---

## 12. Security operations

### 12.1 Rotate the Neon database password

Rotate this password on a regular schedule or after any suspected exposure.

1. In Neon, reset the role password or create a new role.
2. Copy the new pooled connection string.
3. Update the Worker secret:

```powershell
npx wrangler secret put DATABASE_URL --config backend/wrangler.jsonc
```

4. Verify:

```powershell
Invoke-RestMethod "https://pokket-pizza-web.pokket-pizza-backend.workers.dev/api/v1/menu"
```

5. Update local `.env`/`.dev.vars` if needed.
6. Remove the old connection string from any local notes or password manager entries.

Old database connections may remain briefly; verify before deleting the old role.

### 12.2 Rotate `JWT_SECRET`

Rotating this secret invalidates all admin and customer sessions.

```powershell
$bytes = New-Object byte[] 48
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$newSecret = [Convert]::ToBase64String($bytes)
$newSecret | npx wrangler secret put JWT_SECRET --config backend/wrangler.jsonc
```

After rotation, all users must log in again. Refresh-token rows remain but can no longer be verified, which is expected.

### 12.3 Rotate Twilio credentials

1. Rotate the auth token in Twilio.
2. Update `TWILIO_AUTH_TOKEN` with `wrangler secret put`.
3. Confirm the status callback URL is still:
   `https://pokket-pizza-api.pokket-pizza-backend.workers.dev/api/webhooks/twilio-status`
4. Send a test order and confirm notification rows and webhook updates.
5. If the token is missing, the webhook returns `503 WEBHOOK_NOT_CONFIGURED`; invalid signatures return 403.

### 12.4 Rotate the admin password

There is no admin password-change endpoint. Options:

- Use a controlled SQL update with pgcrypto on the `AdminUser` row, or
- Re-seed a non-production database with a new `ADMIN_PASSWORD`.

If using SQL, run it through the Neon SQL editor or a reviewed script, not in a shell history that is shared. The hash must be generated with:

```sql
crypt('<new password>', gen_salt('bf', 12))
```

Do not store the plaintext password in the database or repository.

### 12.5 Rotate Cloudflare credentials

- Revoke old API tokens in the Cloudflare dashboard.
- Re-authenticate Wrangler with `npx wrangler login`.
- Do not commit `.wrangler/` state or tokens.
- If the account subdomain or Worker names change, update `frontend/cloudflare.config.ts`, `backend/wrangler.jsonc`, `API_ORIGIN`, and the service binding together.

---

## 13. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Proxy returns 500; API logs show no request; Cloudflare error 1042 | Web Worker is fetching the API over the public `*.workers.dev` URL | Ensure `env.API` service binding exists and the proxy uses `globalThis.__CF_ENV__?.API` |
| `Worker "pokket-pizza-api" not found` during web deploy or request | API Worker not deployed, wrong name, or stale binding | Deploy API first; update the binding worker name; redeploy web |
| `/api/v1/menu` returns 500 | `DATABASE_URL` missing/wrong, pgcrypto missing, or Neon unreachable | Set secret; apply migrations; check Neon status |
| API returns 500 at boot with `JWT_SECRET must be at least 32 characters` | Secret missing or too short | `wrangler secret put JWT_SECRET` |
| `function crypt(...) does not exist` | pgcrypto migration not applied | Run `prisma migrate deploy` and verify `20261020120000_pgcrypto` |
| Prisma module/engine error on Workers | Stale or missing generated workerd client | Run `prisma generate`; deploy with `npm run deploy -w backend` |
| `No such module "cloudflare:workers"` during Next build/dev | A route imported the Workers-only module | Keep the custom worker entry and `globalThis.__CF_ENV__` bridge; do not import `cloudflare:workers` in app code |
| Admin login loops back to login | Cookies missing, blocked, or dropped by the proxy | Check both `__Host-admin_*` cookies; ensure HTTPS, `Path=/`, no `Domain`; confirm proxy uses `getSetCookie()` and re-appends every cookie |
| Only one auth cookie is set | `Headers` copy collapsed multiple `Set-Cookie` values | Preserve the proxy's `getSetCookie()` logic; do not replace it with a plain header copy |
| 401 on every admin API call after login | Wrong cookie origin or cookie not forwarded | Use the web origin for login; verify proxy forwards `cookie`; check `API_ORIGIN`/binding |
| Admin login page works but `/admin/dashboard` redirects | Admin session probe failed | Verify `GET /api/v1/admin/orders?page=1&pageSize=1` with the session; check 401 code |
| `GET /api/v1/auth/login` returns 404 | Login is POST-only | Use `POST`; this is expected |
| `API_ORIGIN` shows localhost in deployment | Web deployed without the environment variable | Set `$env:API_ORIGIN` and rerun `npm run deploy:vinext -w frontend` |
| Vinext/Next type errors after a build | `.next/types` was overwritten by a vinext build | Run `npm run build -w frontend` before standalone `tsc` |
| `wrangler` says not authenticated | CLI session expired | `npx wrangler login` or `cf auth login` |
| Twilio webhook returns 503 | `TWILIO_AUTH_TOKEN` not set | Set the secret; redeploy if needed |
| Twilio webhook returns 403 | Signature mismatch | Check the exact public URL, HTTPS, auth token, and POST params; do not add query strings Twilio did not sign |
| 429 responses under light traffic | Per-isolate limits or shared NAT | Check `Retry-After`; remember limits are per isolate, not global |
| Worker error 1102 / CPU exceeded | SSR or crypto work over free-plan CPU limits | Reduce work, keep bcrypt in PostgreSQL, or move to Workers Paid |
| CORS error when calling the API directly | Origin not in `CORS_ORIGIN` | Add the exact origin and redeploy; do not use `*` with credentials |
| Neon connection errors under load | Pool exhaustion or wrong connection string | Use the pooled URL; keep Workers at one connection per request; check Neon limits |
| Customer signup returns 400 `VALIDATION_ERROR` | Password contains name/phone/email or is too guessable | Use a random strong password |
| Customer signup returns 200 instead of 201 | Phone existed as a guest row and was claimed | Expected for that case |
| Customer login always fails for a guest row | Guest row has no password credential | Sign up with that phone to claim it |
| `prisma-node` module missing | Generated clients not created | `npx prisma generate --config prisma7.config.ts` |
| `docs/*.md` files missing from git | A broad ignore rule is masking the markdown exception | Keep `docs/*` plus `!docs/*.md`, or force-add the file explicitly |

---

## 14. Free plan limits and scaling

Current platform limits that matter:

- Cloudflare Workers Free: about 100,000 requests/day and 10 ms CPU per request.
- The API Worker uses `nodejs_compat`.
- Password hashing runs in PostgreSQL to avoid Worker CPU cost.
- Rate limits are in-memory per isolate, so they are not a global security boundary.
- Neon free tier has its own connection/compute/storage limits.
- Twilio WhatsApp messages are billed by Twilio.

If you see error 1102 or CPU exhaustion:

1. Confirm the workload is CPU, not a slow external call.
2. Avoid synchronous heavy work in the Worker.
3. Keep Prisma queries narrow.
4. Consider the Workers Paid plan (about $5/month) for a higher CPU budget.
5. Consider caching public menu/site content if traffic grows, but do not cache authenticated or PII responses.

The web Worker serves assets through the `ASSETS` binding. The API Worker does not serve static assets.

---

## 15. CI/CD recommendations

There are currently no GitHub Actions workflows. A safe pipeline would be:

1. Install with `npm ci`.
2. Frontend checks:
   - `npm run lint -w frontend`
   - `npm run build -w frontend`
   - `npx tsc --noEmit -p frontend/tsconfig.json`
3. Backend checks:
   - `npm run typecheck -w backend`
   - `npm test -w backend`
4. Build the Worker bundle:
   - `npm run build:vinext -w frontend`
5. Deploy API:
   - `npm run deploy -w backend`
   - Requires Cloudflare API token, account ID, and Worker secrets already configured.
6. Deploy web:
   - Set `API_ORIGIN`.
   - `npm run deploy:vinext -w frontend`
7. Run smoke tests against the deployed URLs.

Recommendations:

- Keep production deploys behind a manual approval/environment gate.
- Store `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as GitHub secrets.
- Do not run production migrations automatically from every push. Use a separate, reviewed migration job.
- Pin Node 20 or 22 in CI.
- Cache npm downloads, not build output containing secrets.
- Add a post-deploy smoke job that fails the workflow on non-200 responses.

`cloudflare/wrangler-action` can run the deploy steps if you prefer not to call npm scripts directly.

---

## 16. Deployment checklist

Before deploying:

- [ ] `npm run lint -w frontend` passes.
- [ ] `npm run build -w frontend` passes.
- [ ] `npx tsc --noEmit -p frontend/tsconfig.json` passes after the Next build.
- [ ] `npm run typecheck -w backend` passes.
- [ ] `npm test -w backend` passes.
- [ ] Database backup/branch exists if migrations are involved.
- [ ] Migrations reviewed and applied.
- [ ] API secrets are present (`DATABASE_URL`, `JWT_SECRET`).
- [ ] Twilio secrets are present if notifications are expected.
- [ ] `API_ORIGIN` is set to the API Worker URL.
- [ ] Service binding `API` still points at `pokket-pizza-api`.
- [ ] No `.env`, `.dev.vars`, or token is staged for commit.

Deploy:

- [ ] `npm run deploy -w backend` (if API changed).
- [ ] `/health` returns 200.
- [ ] `npm run deploy:vinext -w frontend` with `API_ORIGIN` set (if web changed).
- [ ] `/api/v1/menu` through the web Worker returns 200.
- [ ] Admin login, ping, refresh, logout pass.
- [ ] Customer signup, me, refresh, logout pass.
- [ ] Key pages return 200.
- [ ] Worker logs show no unexpected 500s.
- [ ] Both auth cookies are present and configured correctly.

After deploying:

- [ ] Record the deployment time and Worker versions.
- [ ] Note any migration that was applied.
- [ ] Rotate any secret that was exposed.
- [ ] Update this runbook if the production topology, secrets, or commands changed.

---

## Appendix A: Command reference

```powershell
# Authentication
npx wrangler whoami
npx wrangler login
cf auth login

# Install and local checks
npm install
npm run lint -w frontend
npm run build -w frontend
npx tsc --noEmit -p frontend/tsconfig.json
npm run build:vinext -w frontend
npm run typecheck -w backend
npm test -w backend
npm run build -w backend

# Prisma
npx prisma generate --config prisma7.config.ts
npx prisma migrate deploy --config prisma7.config.ts
npx prisma migrate status --config prisma7.config.ts
npx prisma migrate dev --config prisma7.config.ts --name <name>
npx tsx prisma/seed.ts

# API Worker
npm run deploy -w backend
npx wrangler secret put DATABASE_URL
npx wrangler secret put JWT_SECRET
npx wrangler secret list
npx wrangler tail pokket-pizza-api --format pretty
npx wrangler rollback --name pokket-pizza-api

# Web Worker
$env:API_ORIGIN = "https://pokket-pizza-api.pokket-pizza-backend.workers.dev"
npm run deploy:vinext -w frontend
npx wrangler tail pokket-pizza-web --format pretty
npx wrangler rollback --name pokket-pizza-web

# Local development
npm run dev
npm run dev -w backend
npm run dev -w frontend
npm run dev:vinext -w frontend
npm run dev:worker -w backend
```

---

## Appendix B: Production URLs and endpoints

| Purpose | URL |
|---|---|
| Customer home | `https://pokket-pizza-web.pokket-pizza-backend.workers.dev/` |
| Menu | `https://pokket-pizza-web.pokket-pizza-backend.workers.dev/menu` |
| Cart | `https://pokket-pizza-web.pokket-pizza-backend.workers.dev/cart` |
| Checkout | `https://pokket-pizza-web.pokket-pizza-backend.workers.dev/checkout` |
| Customer login | `https://pokket-pizza-web.pokket-pizza-backend.workers.dev/login` |
| Customer signup | `https://pokket-pizza-web.pokket-pizza-backend.workers.dev/signup` |
| Admin login | `https://pokket-pizza-web.pokket-pizza-backend.workers.dev/admin/login` |
| Admin dashboard | `https://pokket-pizza-web.pokket-pizza-backend.workers.dev/admin/dashboard` |
| Admin order history | `https://pokket-pizza-web.pokket-pizza-backend.workers.dev/admin/orders/history` |
| Admin menu manager | `https://pokket-pizza-web.pokket-pizza-backend.workers.dev/admin/menu-manager` |
| Menu API via proxy | `https://pokket-pizza-web.pokket-pizza-backend.workers.dev/api/v1/menu` |
| Admin login API via proxy | `POST https://pokket-pizza-web.pokket-pizza-backend.workers.dev/api/v1/auth/login` |
| API health | `https://pokket-pizza-api.pokket-pizza-backend.workers.dev/health` |
| Twilio status webhook | `POST https://pokket-pizza-api.pokket-pizza-backend.workers.dev/api/webhooks/twilio-status` |

---

## Appendix C: Current follow-up items

1. Rotate the Neon database password and update the API Worker `DATABASE_URL` secret.
2. Configure Twilio secrets if real WhatsApp delivery is required.
3. Decide whether to keep `CORS_ORIGIN` at localhost or set it to the production web origin for direct API access.
4. Consider Workers Paid if SSR or traffic exceeds the free CPU budget.
5. Add CI workflows for the checks in section 15.
6. Add frontend tests and more backend tests if the project continues beyond the current scope.
