# Pokket Pizza Developer Guide

Last updated: 2026-10-20
Audience: frontend, backend, and DevOps contributors working in this repository.

---

## 1. What this project is

Pokket Pizza is a full-stack ordering website for a single pizza restaurant.

It contains:

- A customer storefront: menu, cart, checkout, order status, invoice, account, saved addresses, preferences.
- An admin panel: live order board, order history, menu manager, sales summary.
- A REST API: public menu/order endpoints plus admin and customer-authenticated endpoints.
- A PostgreSQL database hosted on Neon.
- Optional WhatsApp notifications through Twilio.
- A Cloudflare deployment: one Worker for the Next.js/vinext frontend and one Worker for the API.

There is no separate admin deployment. The admin panel is part of the same frontend Worker at `/admin/*`.

Production entry points:

- Customer site: `https://pokket-pizza-web.pokket-pizza-backend.workers.dev`
- Admin login: `https://pokket-pizza-web.pokket-pizza-backend.workers.dev/admin/login`
- API Worker: `https://pokket-pizza-api.pokket-pizza-backend.workers.dev`
- API health: `https://pokket-pizza-api.pokket-pizza-backend.workers.dev/health`

---

## 2. Architecture at a glance

### 2.1 Production topology

```text
Browser
  |
  | HTTPS, first-party cookies
  v
pokket-pizza-web (Cloudflare Worker)
  - Next.js 16.3.5 rendered through vinext
  - static assets via ASSETS binding
  - /api/* proxy route
  - /admin/* and customer pages
  |
  | Service binding env.API (worker-to-worker)
  v
pokket-pizza-api (Cloudflare Worker)
  - Hono application
  - Express-style controllers via an adapter
  - Prisma 7 client using the Neon serverless adapter
  |
  | PostgreSQL over HTTPS
  v
Neon PostgreSQL
```

Why the `/api/*` proxy exists:

- The browser calls the same origin that served the page, so `Set-Cookie` and `Cookie` stay first-party.
- The `__Host-` auth cookies work without cross-site cookie rules.
- The proxy forwards the request to the API Worker through a Cloudflare service binding, not a public `*.workers.dev` fetch. Same-zone worker-to-worker fetches over `*.workers.dev` fail with Cloudflare error 1042.

### 2.2 Local topology

There are two supported local modes.

Node mode:

```text
Browser -> Next.js dev server (localhost:3000)
        -> direct API calls to Hono on Node (localhost:4000)
        -> Neon/PostgreSQL through PrismaPg
```

Workers-like mode:

```text
Browser -> vite/vinext dev server (localhost:3001)
        -> API calls to API_ORIGIN (default http://localhost:4000)
        -> either Node API on 4000 or wrangler dev API on 8787
```

Local development has no service binding, so the proxy falls back to a plain `fetch` using `API_ORIGIN`.

### 2.3 Core design decisions

- Same-origin `/api/*` proxy in production, backed by a service binding.
- No access or refresh token in JavaScript-accessible storage; auth uses httpOnly cookies.
- Server recomputes every price and total. Client cart totals are display-only.
- Refresh tokens are stored and rotated server-side with reuse detection.
- Passwords are bcrypt-hashed inside PostgreSQL via pgcrypto, not in Worker JavaScript.
- One Prisma client per request on Workers because workerd forbids reusing I/O objects across request contexts.
- Next.js is built for Cloudflare with vinext; the Worker entry is custom so route handlers can read bindings without importing `cloudflare:workers`.
- The shared contract (`shared/contract/contract.ts`) is the API type source of truth and is treated as frozen.

---

## 3. Tech stack

### 3.1 Frontend

| Package / tool | Version | Purpose |
|---|---:|---|
| `next` | 16.3.5 | App Router, routing, SSR/RSC, build |
| `react`, `react-dom` | ^19.3.1 | UI runtime |
| `vinext` | ^1.2.1 | Next.js runtime for Cloudflare/Vite |
| `@vinext/cloudflare` | ^1.1.1 | Cloudflare deploy integration |
| `cf` | ^1.0.0-beta.18 | Cloudflare build/deploy CLI used by vinext |
| `@cloudflare/vite-plugin` | ^2.0.0-beta.v.2 | Cloudflare Vite environment |
| `vite` | ^8.3.0 | Build/dev server for the Worker build |
| `@vitejs/plugin-react` | ^6.1.2 | React transform |
| `@vitejs/plugin-rsc` | ^0.5.38 | RSC transform |
| `tailwindcss`, `@tailwindcss/postcss` | ^4 | Styling |
| `@tanstack/react-query` | ^5.103.1 | Server-state fetching, caching, mutations |
| `zustand` | ^5.0.15 | Persisted client cart state |
| `react-hook-form` | ^7.88.0 | Forms |
| `@hookform/resolvers` | ^5.9.1 | Zod resolver integration |
| `zod` | ^4.6.5 | Frontend form validation |
| `clsx`, `tailwind-merge` | ^2.1.1, ^3.7.0 | Class-name composition |
| `typescript` | ^5 | Type checking |
| `eslint`, `eslint-config-next` | ^9, 16.3.5 | Linting |

Notes:

- Tailwind is configured through PostCSS and CSS custom properties in `frontend/src/app/globals.css`. There is no `tailwind.config.ts`.
- `next/font` loads Inter and Outfit.
- `frontend/next.config.ts` allows remote images from `res.cloudinary.com` and `images.unsplash.com`.
- The Next config sets `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin`. It deliberately omits `X-Frame-Options` because the Contact page embeds Google Maps.
- `frontend/AGENTS.md` warns that this Next.js version has breaking changes and that the bundled docs under `node_modules/next/dist/docs/` should be read before changing Next-specific behaviour.

### 3.2 Backend

| Package / tool | Version | Purpose |
|---|---:|---|
| `hono` | ^4.13.13 | HTTP router/runtime for Node and Workers |
| `@hono/node-server` | ^2.1.5 | Node HTTP server adapter |
| `@prisma/client`, `prisma` | ^7.10.0 | ORM and migrations |
| `@prisma/adapter-neon` | ^7.10.1 | Prisma adapter for Workers/Neon |
| `@prisma/adapter-pg` | ^7.10.0 | Prisma adapter for Node |
| `@neondatabase/serverless` | ^1.2.0 | Neon serverless driver |
| `pg` | ^8.23.0 | Node PostgreSQL driver |
| `jose` | ^5.9.0 | JWT signing/verification |
| `zod` | ^3.23.0 | Backend validation and env schema |
| `dotenv` | ^16.4.5 | Node env loading |
| `wrangler` | ^4.151.2 | Workers dev/deploy |
| `tsx` | ^4.19.0 | TS dev runner |
| `typescript` | ^5.6.0 | Type checking and build |
| `@types/express` | ^4.17.21 | Types for the Express-style adapter |
| `prettier` | ^3.3.0 | Formatting |

Notes:

- The backend is Hono at the HTTP boundary. Most controllers are still written against Express-style `Request`/`Response` and run through `backend/src/http/express-adapter.ts`.
- `express` itself is no longer a runtime dependency. The adapter implements the subset of the Express request/response API the controllers use.
- `argon2`, `zxcvbn`, `twilio`, `pino`, `helmet`, `cors`, `cookie-parser`, and `express-rate-limit` were removed for Workers compatibility.
- The root contract package imports the root `zod` (v4), while backend-only validation uses the nested backend `zod` (v3). `error.middleware.ts` duck-types `ZodError` because `instanceof` fails across those copies.

### 3.3 Shared contract

`shared/contract/contract.ts` contains the frozen request/response types and Zod schemas used by both frontend and backend. It is part of the `@pokket-pizza/contract` workspace package.

Rules:

- All money crosses the wire as decimal strings, for example `"399.00"`.
- Responses use one of two envelopes:
  - Success: `{ success: true, data, requestId }`
  - Error: `{ success: false, error: { code, message, details? }, requestId }`
- The contract header says `FROZEN`. Any change requires a standup announcement and sign-off from both frontend and backend owners.
- Some frontend-only types are still defined locally where the frozen contract does not yet cover them:
  - Customer auth types in `frontend/src/lib/api/customerAuth.ts`.
  - Phone-order list type in `frontend/src/lib/api/orders.ts`.

### 3.4 Infrastructure and tooling

- Cloudflare Workers, free plan, `*.workers.dev` subdomain, no custom domain.
- Cloudflare service bindings for web-to-API traffic.
- Neon PostgreSQL.
- Twilio WhatsApp Content API (optional).
- npm workspaces: `frontend`, `backend`, `shared/*`.
- Root scripts orchestrate the workspaces with `concurrently`.
- No CI workflows are currently present in `.github/workflows`.
- Backend tests use the Node test runner only.

---

## 4. Repository layout

```text
PocketPizza-Website/
  backend/
    .env.example
    .dev.vars.example
    wrangler.jsonc
    src/
      app.ts                  Hono app, middleware, route mounting
      server.ts               Node entry point
      worker.ts               Cloudflare Workers entry point
      config/
        env.ts                Zod-validated environment
        database.ts           runtime-aware Prisma client factory
      http/
        express-adapter.ts    Express-style req/res -> Hono bridge
      middleware/
        auth.middleware.ts    admin/customer JWT guards
        error.middleware.ts   Zod/AppError/Prisma error mapping
        rateLimit.middleware.ts in-memory limiters and login lockout support
      modules/
        auth/                 admin and customer auth, refresh-token rotation
        admin/                admin route composition
        menu/                 public and admin menu
        orders/               quote, create, status, invoice, admin status
        customer/             profile, preferences, addresses, password, deletion request
        reports/              sales summary
        restaurant/           public site content
        notifications/        Twilio dispatch and signed status webhook
      utils/
        password.ts           pgcrypto bcrypt helpers
        passwordPolicy.ts     guessable-password checks
        deliveryDistance.ts   Haversine delivery fee
        logger.ts             JSON logger
        errors.ts             AppError hierarchy
        response.ts           success/error envelope helpers
        decimal.ts, phone.ts
      generated/              Prisma clients (generated, do not edit)
  frontend/
    lib/api.ts                canonical typed API client
    worker/index.ts           custom Cloudflare Worker entry
    vite.config.ts            vinext + Cloudflare Vite plugin
    cloudflare.config.ts      Worker name, entrypoint, bindings, assets
    next.config.ts            Next config, headers, image hosts
    src/
      app/
        (customer)/           customer route group
        admin/                admin route group
        api/[...path]/route.ts same-origin API proxy
        layout.tsx            root providers
      components/             layout, menu, cart, admin, UI primitives
      hooks/                  quote and cart reconciliation hooks
      lib/
        api/                  React Query hooks by domain
        cart/                 Zustand cart
        order/                status labels and polling policy
        checkout/             checkout form schema
        ...
  prisma/
    schema.prisma             data model + dual generators
    migrations/               SQL migrations
    seed.ts                   destructive development seed
  prisma7.config.ts           Prisma 7 config, loads backend/.env
  shared/
    contract/contract.ts      frozen API contract
    contracts.ts              shared helper constants
  docs/
    DEVELOPER_GUIDE.md        this file
    DEPLOYMENT.md             deployment runbook
  .github/
    PULL_REQUEST_TEMPLATE.md
    CODEOWNERS
    ISSUE_TEMPLATE/
```

---

## 5. Runtime architecture

### 5.1 Frontend

#### Routing

The frontend uses the Next.js App Router with two route groups:

Customer routes under `frontend/src/app/(customer)/`:

- `/`
- `/about`
- `/contact`
- `/menu`
- `/cart`
- `/checkout`
- `/login`
- `/signup`
- `/profile`
- `/settings`
- `/order/[publicToken]`
- `/order/[publicToken]/invoice`
- `/invoice`

Admin routes under `frontend/src/app/admin/`:

- `/admin/login`
- `/admin/dashboard` - live order board
- `/admin/orders/history` - completed/cancelled history
- `/admin/orders/[id]` - order detail
- `/admin/menu-manager` - menu management

There is no `/admin` index page. Use `/admin/dashboard`.

#### Providers and layout

`frontend/src/app/layout.tsx` wraps the app in:

- `QueryProvider` - TanStack Query client with `staleTime: 5 minutes` and `retry: 1`.
- `GlobalLoadingBar` - thin top bar for first loads and mutations only, shown after a 150 ms delay.
- `ToastProvider` - app-wide notifications.

The customer layout adds the navbar, footer, and WhatsApp floating action button. The admin layout checks the admin session on every non-login admin page and redirects to `/admin/login?reason=expired` on a genuine auth failure.

#### API client

`frontend/lib/api.ts` is the canonical client. `frontend/src/lib/api/client.ts` re-exports it, and `frontend/src/lib/api.ts` re-exports from `frontend/lib/api.ts`.

`apiFetch<T>()`:

- Uses `NEXT_PUBLIC_API_BASE_URL` when set.
- Otherwise uses `/api/v1` in production and `http://localhost:4000/api/v1` in development.
- Always sends `credentials: "include"`.
- Sends JSON content type except for `FormData`.
- Parses the shared success/error envelope.
- Logs `requestId` on errors and masks 10-digit phone numbers in logged URLs.
- On a 401 from an `/admin/*` request with `AUTHENTICATION_REQUIRED` or `AUTHENTICATION_INVALID`, hard-redirects to `/admin/login?reason=expired&redirectTo=...`.
- Exposes `ApiError` with `status`, `code`, `details`, and `requestId`.

React Query hooks by domain:

- `frontend/src/lib/api/auth.ts` - admin login, refresh, logout, session probe.
- `frontend/src/lib/api/customerAuth.ts` - customer signup, login, logout, session.
- `frontend/src/lib/api/customer.ts` - profile, preferences, addresses, password, deletion.
- `frontend/src/lib/api/admin.ts` - admin orders, menu, reports, status transitions.
- `frontend/src/lib/api/orders.ts` - quote, preflight quote, create order, current orders, order status, invoice.
- `frontend/src/lib/api/site.ts` - restaurant/site content.
- `frontend/src/lib/api/useMenu.ts` - menu and product queries.

Admin session probe detail: there is no admin `/me` endpoint. `useAdminSession` calls `GET /admin/orders?page=1&pageSize=1` and treats only a genuine 401 auth error as logged out. A 404/500/network error does not force a logout.

#### Cart and checkout

- The cart lives in `frontend/src/lib/cart/store.ts`, persisted to localStorage with Zustand.
- Limits: 20 per line, 50 lines per cart, 20 add-ons per line. These are stricter than or equal to the contract caps.
- Display names and prices are UI snapshots only. They are never trusted by the server.
- `useOrderQuote` keeps the live checkout summary up to date.
- `usePreflightQuote` runs a second, independent quote immediately before `POST /orders` so the customer cannot confirm a stale price.
- `POST /orders` carries an idempotency key generated by `newIdempotencyKey()`.
- Delivery coordinates are captured client-side only for DELIVERY orders.

#### Order tracking

- `frontend/src/lib/order/status.ts` owns customer-facing status labels, hints, order type labels, and polling policy.
- The status page polls every 15 seconds and stops at `COMPLETED` or `CANCELLED`.
- Admin order lists poll every 12 seconds.

### 5.2 Backend

#### Hono application

`backend/src/app.ts` is the single Hono app used by both runtime entry points.

Middleware order:

1. Per-request database scope on Workers (`runWithRequestDatabase`).
2. `secureHeaders()`.
3. CORS with a comma-separated allowlist from `CORS_ORIGIN`, credentials enabled.
4. Request ID and structured access log. Order tokens and phone numbers are redacted from logged URLs.
5. Global rate limit.
6. Routes.
7. 404 handler and error handler.

Route mounting:

- `/health` and `/health/db` are outside `/api/v1`.
  - `/health` is public.
  - `/health/db` requires admin auth.
- `/api/v1/auth` - admin auth plus customer auth sub-router.
- `/api/v1/admin/*` - admin JWT guard, then admin menu/order/report routers.
- `/api/v1/customer/*` - customer JWT guard, then profile/preferences/address/deletion routes.
- `/api/v1` - public menu, order, and restaurant routers.
- `/api/webhooks/twilio-status` - Twilio signature validation, no cookie auth.

#### Express adapter

`backend/src/http/express-adapter.ts` builds a minimal Express-like request and response around a Hono context.

It supports:

- `req.id`, `method`, `url`, `originalUrl`, `path`, `protocol`, `ip`, `params`, `query`, `cookies`, `get()`, `header()`, `body`.
- `res.status()`, `statusCode`, `setHeader()`, `getHeader()`, `json()`, `cookie()`, `clearCookie()`, `end()`.
- Multiple `Set-Cookie` headers, which matters because login sets both access and refresh cookies.
- A 100 KB request body limit with `413 PAYLOAD_TOO_LARGE`.
- Malformed JSON mapping to `400 INVALID_JSON`.
- Error mapping through the existing Express error middleware.

New routes can be written directly in Hono or through the adapter. Match the surrounding module style.

#### Runtime entry points

- Node: `backend/src/server.ts` uses `@hono/node-server`, logs startup, and drains in-flight requests before disconnecting Prisma on SIGTERM/SIGINT.
- Workers: `backend/src/worker.ts` exports `{ fetch: app.fetch }`.
- Node build: `prisma generate` plus `tsc`, output in `backend/dist`.
- Worker deploy: `prisma generate` plus `wrangler deploy`.

#### Module pattern

Most modules follow:

```text
routes -> controller -> service -> repository -> Prisma
```

Validation lives in `*.validation.ts`, shared shapes in `*.types.ts`, and contracts in the shared package. Controllers stay thin; business rules and Prisma access stay in services and repositories.

### 5.3 Database

#### Prisma 7 with two generated clients

`prisma/schema.prisma` declares two generators:

- `client` - `runtime = "workerd"`, output `backend/src/generated/prisma`.
- `clientNode` - `runtime = "nodejs"`, output `backend/src/generated/prisma-node`.

Why:

- The workerd client imports its query compiler with a `?module` suffix that only Wrangler understands.
- The Node client is needed for `server.ts`, scripts, and `tsx`.
- The Node client is loaded with a runtime dynamic import so Wrangler does not bundle the Node client and its WASM into the Worker.

#### Per-request clients on Workers

`backend/src/config/database.ts`:

- Detects Workers with `WebSocketPair`.
- On Workers, creates a Prisma client per request with `PrismaNeon({ max: 1 })`.
- Stores it in `AsyncLocalStorage` and disconnects after the request.
- On Node, keeps a module-scoped pooled client with `PrismaPg` (`max: 3`).
- `configureDatabase()` allows a connection-string override.

This is required because workerd forbids using an I/O object from a different request context.

#### Data model

| Model | Purpose |
|---|---|
| `Restaurant` | Shop identity, contact details, delivery fee, public site content, map pin |
| `AdminUser` | Admin account with bcrypt hash and role |
| `RefreshToken` | Server-side refresh-token family for admin and customer sessions |
| `Category` | Menu category with sort order and active flag |
| `MenuItem` | Product, base price, tax rate, image, veg flag, active flag |
| `ItemVariant` | Size/variant with price delta and tax rate |
| `ItemAddOn` | Add-on with price, tax rate, active flag |
| `Customer` | Customer account, phone, optional email/password, preferences, deletion request |
| `Address` | Saved customer address, maximum 10 per account |
| `Order` | Order header, public token, idempotency key, pricing, delivery distance, status |
| `OrderItem` | Immutable item snapshots at order time |
| `OrderStatusHistory` | Audit trail for admin status changes |
| `Notification` | WhatsApp/Twilio dispatch record per order |

#### Migrations

Migrations live in `prisma/migrations/`. The Cloudflare migration adds:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

That extension enables `crypt()` and `gen_salt('bf', 12)`, which are used for bcrypt password hashing inside PostgreSQL.

### 5.4 Auth and security

#### Cookies

Admin:

- `__Host-admin_access` - JWT access token, 7-day cookie max age.
- `__Host-admin_refresh` - JWT refresh token, 30-day cookie max age.

Customer:

- `__Host-customer_access` - JWT access token, session cookie (no explicit max age).
- `__Host-customer_refresh` - JWT refresh token, session cookie (no explicit max age).

All four are:

- `httpOnly: true`
- `secure: true`
- `sameSite: "strict"`
- `path: "/"`
- No `Domain` attribute, as required by the `__Host-` prefix.

The token lifetimes come from `ACCESS_TOKEN_TTL` (default `7d`) and `REFRESH_TOKEN_TTL_DAYS` (default `30`).

#### JWT and sessions

- JWT algorithm: HS256 via `jose`.
- Issuer and audience come from `JWT_ISSUER` and `JWT_AUDIENCE`.
- Access token claims include `typ`, `sub`, `role`/`restaurantId` for admin, and `restaurantId` for customer.
- Every protected request verifies the JWT and reloads the principal from the database, so deletions and role changes take effect immediately.
- Refresh tokens are stored by `jti` in `RefreshToken`, grouped by `familyId`.
- Refresh rotates the token inside a transaction with a PostgreSQL advisory lock.
- Reuse of an already-consumed refresh token revokes the whole family (RFC 9700 behaviour).
- Logout revokes the refresh family best-effort and always clears cookies.

#### Passwords

- Hashing and verification happen in PostgreSQL with pgcrypto bcrypt cost 12.
- `hashPassword()` uses `crypt(password, gen_salt('bf', 12))`.
- `verifyPassword()` compares with `crypt(password, stored_hash)`.
- The dummy hash path equalizes timing for unknown accounts.
- Password policy (`passwordPolicy.ts`) rejects:
  - A small common-password list.
  - All-digit passwords of 8+ characters.
  - A character repeated 8+ times.
  - Passwords containing the user's name, phone, or email.
- There is no OTP/phone-possession proof in the current MVP. Signup can claim a guest customer row created by an earlier guest checkout; the stored name wins.

#### Login lockout and rate limits

All limits are in-memory and per Worker isolate. They are best-effort, not globally consistent across isolates.

| Limiter | Window | Limit | Key |
|---|---:|---:|---|
| Global | 15 min | 1000 | IP |
| Admin login | 15 min | 10 | IP + email |
| Admin login lockout | 15 min | 10 failures -> 15 min lock | IP + email |
| Customer signup | 60 min | 30 | IP |
| Customer login (IP) | 15 min | 100 | IP |
| Customer login (phone) | 15 min | 30 | Phone |
| Customer login (combined) | 15 min | 30 | IP + phone |
| Customer login lockout | 15 min | 10 failures -> 15 min lock | IP + phone |
| Refresh | 60 min | 30 | IP |
| Order create | 60 min | 20 | IP |
| Order token lookup | 15 min | 30 | IP |
| Phone order lookup (IP) | 15 min | 60 | IP |
| Phone order lookup (phone) | 15 min | 30 | IP + phone |

Successful customer logins are not counted by the customer login limiters (`skipSuccessfulRequests`).

#### Other security controls

- Twilio status callbacks are verified with HMAC-SHA1 over the sorted POST params and the exact callback URL, using `X-Twilio-Signature`.
- PII-bearing order responses set `Cache-Control: no-store`.
- API access logs redact order tokens and phone numbers.
- Request bodies are capped at 100 KB by the adapter.
- The API sends Hono secure headers; Next sends nosniff and referrer policy headers.
- CORS is an allowlist with credentials. In production the proxy does not send an `Origin` header, so CORS is mainly relevant to direct browser access or local development.

### 5.5 Orders, pricing, and notifications

#### Quote and create

`POST /api/v1/orders/quote`:

- Resolves restaurant pricing.
- Validates that menu items exist, are active, belong to the restaurant, and that variants/add-ons belong to the item.
- Recomputes subtotal, tax, delivery fee, and total.
- Returns decimal strings.

`POST /api/v1/orders`:

- Repeats the same server-side resolution and pricing.
- Requires an address for DELIVERY and a 6-digit pincode.
- Rejects order values above the Decimal(10,2) range with a clean 400.
- Uses an optional idempotency key. A replay returns the original order only if phone, order type, and item/variant/add-on/quantity fingerprint match. Otherwise it returns a data-free 409.
- Creates the order and status history in a transaction.
- Generates a 48-hex-character `publicToken`.
- Dispatches notifications after commit, fire-and-forget.

#### Delivery fee

`backend/src/utils/deliveryDistance.ts` uses the Haversine great-circle distance, not road distance and not a Maps API.

- Non-delivery orders: delivery fee 0.
- DELIVERY with customer coordinates and configured shop pin:
  - Free at or below 1.5 km.
  - INR 30 (₹30) beyond 1.5 km, based on unrounded distance.
  - Stored/reported distance is rounded to 2 decimals.
- DELIVERY without customer coordinates: the restaurant's configured flat delivery fee.
- DELIVERY with coordinates but no shop pin: returns `500 DELIVERY_PRICING_UNAVAILABLE` rather than guessing.

#### Order status transitions

| From | Allowed to |
|---|---|
| `NEW` | `CONFIRMED`, `CANCELLED` |
| `CONFIRMED` | `PREPARING`, `CANCELLED` |
| `PREPARING` | `READY`, `CANCELLED` |
| `READY` | `OUT_FOR_DELIVERY` (DELIVERY only), `COMPLETED` (PICKUP/DINE_IN only), `CANCELLED` |
| `OUT_FOR_DELIVERY` | `COMPLETED`, `CANCELLED` |
| `COMPLETED` | none |
| `CANCELLED` | none |

The server enforces these rules. The admin UI mirrors them for UX.

#### Public order lookup

- `GET /orders/:publicToken` returns status and item snapshots, not the order by order number.
- `GET /orders/:publicToken/invoice` returns invoice data.
- `GET /orders/phone/:phone` returns the current (non-terminal) orders for a phone, newest first, with an opaque cursor. It is rate-limited because a phone number is the only lookup secret in this flow.
- Notification destinations are masked in public responses.

#### WhatsApp notifications

- Twilio Content API templates: `order_confirmation` and `new_order_alert`.
- Provider calls are raw `fetch` to Twilio's REST API with Basic auth and a timeout.
- Errors are classified as retryable or non-retryable.
- Dispatch is post-commit and never awaited by the order request. A failed WhatsApp send cannot roll back or invalidate an order.
- Without Twilio credentials the app still runs and notifications are skipped.
- Status callbacks go to `/api/webhooks/twilio-status` and update the `Notification` row.

#### Reports

`GET /api/v1/admin/reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD`:

- Sales metrics count `COMPLETED` orders only.
- Order counts include all statuses in the range.
- Day windows are IST, matching order-number day windows.
- Returns total sales, average order value, counts, and top 5 items.

---

## 6. API reference

Base path for application endpoints: `/api/v1`. Health endpoints are at `/health` and `/health/db`.

Legend for auth:

- Public - no auth.
- Admin - `__Host-admin_access` cookie.
- Customer - `__Host-customer_access` cookie.
- Twilio - `X-Twilio-Signature`.

### 6.1 Health

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | Public | `{ status: "ok" }` |
| GET | `/health/db` | Admin | Restaurant + category/menu/customer counts |

### 6.2 Admin auth

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/auth/login` | Public | Body `{ email, password }`; sets admin cookies |
| POST | `/api/v1/auth/refresh` | Refresh cookie | Rotates admin tokens |
| POST | `/api/v1/auth/logout` | Public | Revokes refresh family if present; clears cookies |
| GET | `/api/v1/admin/ping` | Admin | `{ ok: true, adminId }` |
| GET | `/api/v1/admin/orders?page=1&pageSize=1` | Admin | Used as the admin session probe |

`GET /api/v1/auth/login` is not a route. Admin login is `POST /api/v1/auth/login`, not `/api/v1/admin/login`.

### 6.3 Customer auth

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/auth/customer/signup` | Public | Body `{ name, phone, password, email? }`; 201 on new account, 200 when claiming a guest row |
| POST | `/api/v1/auth/customer/login` | Public | Body `{ phone, password }` |
| POST | `/api/v1/auth/customer/refresh` | Refresh cookie | Rotates customer tokens |
| POST | `/api/v1/auth/customer/logout` | Public | Revokes family and clears cookies |
| GET | `/api/v1/auth/customer/me` | Customer | Customer + preferences session payload |

### 6.4 Customer account

All routes require the customer access cookie.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/customer/me` | Profile, preferences, addresses |
| PATCH | `/api/v1/customer/me` | Update name and/or preferences |
| GET | `/api/v1/customer/me/preferences` | Read preferences |
| PATCH | `/api/v1/customer/me/preferences` | Update preferences |
| GET | `/api/v1/customer/me/addresses` | List saved addresses |
| POST | `/api/v1/customer/me/addresses` | Create address (max 10) |
| PATCH | `/api/v1/customer/me/addresses/:id` | Update address |
| DELETE | `/api/v1/customer/me/addresses/:id` | Delete address |
| PATCH | `/api/v1/customer/me/password` | Change password |
| POST | `/api/v1/customer/me/deletion-request` | Record deletion request |
| DELETE | `/api/v1/customer/me/deletion-request` | Cancel deletion request |

Account deletion is a recorded request, not a hard delete. Orders and addresses restrict hard deletion, so operations handle it out of band.

### 6.5 Public menu and site content

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/menu` | Active categories and items, variants, add-ons |
| GET | `/api/v1/products/:id` | Active product detail |
| GET | `/api/v1/restaurant` | Public site content, hours, social links, map |

### 6.6 Orders

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/orders/quote` | Public | Server-priced quote |
| POST | `/api/v1/orders` | Public | Create order; 201 new, 200 idempotent replay |
| GET | `/api/v1/orders/phone/:phone` | Public | Current orders by phone; cursor pagination |
| GET | `/api/v1/orders/:publicToken` | Public | Order status |
| GET | `/api/v1/orders/:publicToken/invoice` | Public | Invoice |

Order routes set `Cache-Control: no-store`.

### 6.7 Admin menu

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/admin/menu` | All categories/items including inactive |
| POST | `/api/v1/admin/products` | Create product |
| PATCH | `/api/v1/admin/products/:id` | Partial update |
| PATCH | `/api/v1/admin/products/:id/status` | Toggle active status |

There is no DELETE product endpoint; deactivation is the supported operation.

### 6.8 Admin orders and reports

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/admin/orders` | Filters: status, dateFrom, dateTo, type, page, pageSize |
| GET | `/api/v1/admin/orders/:id` | Order detail with status history |
| PATCH | `/api/v1/admin/orders/:id/status` | Enforces transition table; reason is logged, not stored |
| GET | `/api/v1/admin/reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` | IST day windows |

### 6.9 Webhooks

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/webhooks/twilio-status` | Twilio signature | Twilio status callback |

If `TWILIO_AUTH_TOKEN` is absent, the webhook returns `503 WEBHOOK_NOT_CONFIGURED`. Missing/invalid signatures return 401/403.

---

## 7. Environment and local development

### 7.1 Prerequisites

- Node.js 20 LTS or newer is recommended. The root and backend `engines` fields still say `>=18`, but Next 16 and Vite 8 are safest on a current LTS.
- npm (the repo uses npm workspaces).
- Access to a PostgreSQL database, normally Neon.
- Cloudflare account access for deployment.
- Optional Twilio account for WhatsApp.

### 7.2 Environment files

Backend:

- `backend/.env` - used by Node dev, Prisma CLI, and seed. Gitignored.
- `backend/.dev.vars` - used by `wrangler dev`. Gitignored.
- `backend/.env.example` - documented template.
- `backend/.dev.vars.example` - documented template.

Frontend:

- `.env*` is gitignored by `frontend/.gitignore`.
- Frontend variables must be `NEXT_PUBLIC_*` to reach browser code.
- `API_ORIGIN` is a build-time variable used by the proxy route. It is not a secret.

### 7.3 Backend environment variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | Yes at runtime | empty | Neon/PostgreSQL connection string |
| `JWT_SECRET` | Yes | none | Minimum 32 characters; use a random secret |
| `NODE_ENV` | No | `development` | `development`, `production`, `test` |
| `PORT` | No | `4000` | Node server only |
| `JWT_ISSUER` | No | `pokket-pizza` | Must match between sign and verify |
| `JWT_AUDIENCE` | No | `pokket-pizza-admin` | Must match between sign and verify |
| `ACCESS_TOKEN_TTL` | No | `7d` | `jose` time string |
| `REFRESH_TOKEN_TTL_DAYS` | No | `30` | Days |
| `COOKIE_DOMAIN` | No | empty | Leave empty for `__Host-` cookies |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Comma-separated allowlist |
| `SHOP_LATITUDE` | No | none | Shop pin latitude |
| `SHOP_LONGITUDE` | No | none | Shop pin longitude |
| `TWILIO_ACCOUNT_SID` | No | empty | Required for real WhatsApp sending |
| `TWILIO_AUTH_TOKEN` | No | empty | Required for real sending and webhook verification |
| `TWILIO_WHATSAPP_NUMBER` | No | empty | WhatsApp-enabled sender |
| `CUSTOMER_TEMPLATE_SID` | No | empty | Twilio Content SID |
| `ADMIN_TEMPLATE_SID` | No | empty | Twilio Content SID |
| `LOG_LEVEL` | No | `info` | `trace`/`debug`/`info`/`warn`/`error`/`fatal` |

`backend/src/config/env.ts` validates these at boot with Zod. Invalid values fail fast. `JWT_SECRET` is mandatory even when Twilio is disabled.

### 7.4 Frontend environment variables

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | No | Overrides the API base; inlined at build time |
| `API_ORIGIN` | Production build | Proxy fallback origin; inlined at build time |
| `NEXT_PUBLIC_DEV_ORIGIN` | No | Extra allowed dev origin in `next.config.ts` |

Production defaults:

- `NEXT_PUBLIC_API_BASE_URL` unset -> `/api/v1` -> same-origin proxy.
- `API_ORIGIN` set to the API Worker URL at build/deploy time.
- In production the proxy uses the `API` service binding, so traffic does not depend on the public `API_ORIGIN` host.

Local defaults:

- `NEXT_PUBLIC_API_BASE_URL` unset -> `http://localhost:4000/api/v1`.
- `API_ORIGIN` unset -> `http://localhost:4000`.
- The proxy route is only exercised when the browser API base points at `/api/v1` or when another request hits `/api/*` on the frontend server.

Important subtlety: `frontend/src/app/api/[...path]/route.ts` reads `process.env.API_ORIGIN` at module scope. That value is inlined at build time. Changing only the `API_ORIGIN` text binding in `cloudflare.config.ts` does not change the proxy target; set the environment variable during build/deploy.

### 7.5 Initial setup

```powershell
npm install

Copy-Item backend\.env.example backend\.env
# Edit backend\.env:
#   DATABASE_URL=...
#   JWT_SECRET=<at least 32 random characters>

# Apply migrations
$env:DATABASE_URL = "<connection string>"
npx prisma migrate deploy --config prisma7.config.ts

# Seed a development database (destructive)
$env:ALLOW_DATABASE_RESET = "true"
$env:ADMIN_PASSWORD = "<choose a strong admin password>"
npx tsx prisma/seed.ts
```

The seed creates the restaurant, admin `admin@pokketpizza.com`, categories, menu, demo customers, and demo orders. It refuses to run when `NODE_ENV=production` or when `ALLOW_DATABASE_RESET` is not `true`.

### 7.6 Running locally

Install from the repository root.

Plain Next.js plus Node API:

```powershell
npm run dev
```

This runs:

- `npm run dev -w frontend` -> Next dev server on `http://localhost:3000`
- `npm run dev -w backend` -> Hono on Node at `http://localhost:4000`

Run them separately when you need cleaner logs:

```powershell
npm run dev -w backend
npm run dev -w frontend
```

Workers-like frontend:

```powershell
npm run dev:vinext -w frontend
```

This runs Vite/vinext on port 3001. Set `API_ORIGIN` before starting if the API is not on port 4000.

Worker API:

```powershell
npm run dev:worker -w backend
```

This runs `wrangler dev` using `backend/wrangler.jsonc` and loads secrets from `backend/.dev.vars`.

Local URLs:

- Customer: `http://localhost:3000` (or 3001 with vinext)
- Admin: `http://localhost:3000/admin/login`
- API: `http://localhost:4000` (or 8787 with wrangler)
- API health: `http://localhost:4000/health`

The default CORS allowlist in `.env.example` includes ports 3000, 3001, 5500, and 5501.

---

## 8. Database workflow

### 8.1 Generate Prisma clients

```powershell
npx prisma generate --config prisma7.config.ts
```

This regenerates both:

- `backend/src/generated/prisma` (workerd)
- `backend/src/generated/prisma-node` (Node.js)

Do not edit generated files by hand. The backend `build` and `deploy` scripts run generation automatically.

### 8.2 Create a migration

```powershell
npx prisma migrate dev --config prisma7.config.ts --name <migration_name>
```

Commit the generated SQL directory under `prisma/migrations/`. Do not rewrite migrations that have already been applied to shared or production databases.

Current migration chain:

- `20260921185131_init_full_schema`
- `20260927100502_add_order_public_token_idempotency_payment`
- `20260930143033_add_refresh_tokens`
- `20261001091109_add_restaurant_site_content`
- `20261001163435_customer_auth`
- `20261006124611_add_customer_preferences`
- `20261009184419_add_menu_item_tax_rate`
- `20261010081114_add_variant_and_addon_tax_rates`
- `20261016112125_add_deletion_request`
- `20261017114254_add_delivery_distance_fee`
- `20261020120000_pgcrypto`

### 8.3 Apply migrations

```powershell
$env:DATABASE_URL = "<connection string>"
npx prisma migrate deploy --config prisma7.config.ts
npx prisma migrate status --config prisma7.config.ts
```

`prisma7.config.ts` also loads `backend/.env`, so the shell variable is optional if that file is configured.

### 8.4 Seed

```powershell
$env:ALLOW_DATABASE_RESET = "true"
$env:ADMIN_PASSWORD = "<strong password>"
npx tsx prisma/seed.ts
```

The seed is destructive and development-only. It deletes orders, customers, addresses, menu data, admins, and the restaurant before recreating them. Never run it against production data.

### 8.5 Reset

Prefer creating a fresh database/branch and migrating it. If you must reset a development database:

```powershell
npx prisma migrate reset --config prisma7.config.ts
```

This is destructive and re-runs the seed hook configured in `prisma7.config.ts`.

---

## 9. Testing and quality gates

There is no frontend unit test suite and no root test script. Backend tests use the Node test runner and currently cover delivery distance only.

### 9.1 Commands

```powershell
# Frontend
npm run lint -w frontend
npm run build -w frontend
npx tsc --noEmit -p frontend/tsconfig.json
npm run build:vinext -w frontend

# Backend
npm run typecheck -w backend
npm test -w backend
npm run build -w backend
```

Expected current state:

- Frontend lint: 0 problems.
- Frontend Next build: passes.
- Frontend typecheck: passes after a Next build.
- Backend typecheck: passes.
- Backend tests: 12/12 pass.

### 9.2 Ordering gotcha

Run `npm run build -w frontend` before `npx tsc --noEmit -p frontend/tsconfig.json`.

Reason: `build:vinext` overwrites `.next/types/routes.d.ts` with vinext-specific types. Next's generated `.next/types/validator.ts` then becomes inconsistent until the next `next build`. If you run a standalone `tsc` after a vinext build and see type errors about routes, run the Next build first.

Recommended order:

1. `npm run lint -w frontend`
2. `npm run build -w frontend`
3. `npx tsc --noEmit -p frontend/tsconfig.json`
4. `npm run build:vinext -w frontend` (if working on Cloudflare output)
5. `npm run typecheck -w backend`
6. `npm test -w backend`

### 9.3 Manual smoke test

Minimum after a deployment-affecting change:

- `GET /health` on the API.
- `GET /api/v1/menu` through the web Worker.
- Load `/`, `/menu`, `/cart`, `/checkout`, `/login`, `/signup`, `/profile`, `/settings`.
- Load `/admin/login`, log in, load `/admin/dashboard`, `/admin/orders/history`, `/admin/menu-manager`.
- Refresh admin session and log out.
- Sign up a customer with a unique phone number and strong password, load `/profile`, refresh, log out.
- Place a small order and open its status and invoice pages.

The deployment runbook contains a PowerShell smoke-test script.

---

## 10. Code change log: Cloudflare migration and recent fixes

This section records the work that took the project from a Node/Express + Vercel-style frontend to the current Cloudflare deployment. It is intended to help reviewers understand the diff.

### 10.1 Backend runtime: Express -> Hono

Changed:

- `backend/src/app.ts` now creates a Hono app instead of an Express app.
- Middleware moved to Hono equivalents:
  - `helmet` -> `secureHeaders`.
  - `cors` -> `hono/cors`.
  - `cookie-parser` -> adapter cookie parsing.
  - `express-rate-limit` -> custom in-memory limiter.
  - `pino`/`pino-http` -> custom JSON logger plus Hono access log.
- Added `backend/src/http/express-adapter.ts` so existing controllers keep their Express signatures.
- Added `backend/src/worker.ts` for the Workers fetch handler.
- `backend/src/server.ts` now uses `@hono/node-server` and keeps graceful shutdown.
- Deleted `backend/src/utils/async-handler.ts`; the adapter handles async errors.
- Every `*.routes.ts` file was converted to a Hono router.

Removed dependencies:

- `express`, `cookie-parser`, `cors`, `helmet`, `express-rate-limit`
- `pino`, `pino-http`
- `argon2`, `@zxcvbn-ts/*`
- `twilio`

Added dependencies:

- `hono`, `@hono/node-server`
- `@neondatabase/serverless`, `@prisma/adapter-neon`
- `wrangler`

### 10.2 Workers compatibility

- `backend/src/config/database.ts` gained runtime detection and per-request Prisma clients via `AsyncLocalStorage`.
- `backend/src/config/env.ts` validates Worker env.
- `backend/src/utils/logger.ts` was rewritten as a dependency-free JSON logger so it works in workerd.
- `backend/src/utils/errors.ts` guards `Error.captureStackTrace`, which is not available in all Workers runtimes.
- `backend/wrangler.jsonc` added with `nodejs_compat`, compatibility date `2026-10-01`, observability, and non-secret vars.
- `backend/.dev.vars.example` added.
- Prisma schema gained the `clientNode` generator so Node and Workers can use separate runtime targets.

### 10.3 Password hashing: argon2 -> pgcrypto

Changed:

- `backend/src/utils/password.ts` added.
  - `hashPassword()` uses `crypt(password, gen_salt('bf', 12))`.
  - `verifyPassword()` uses `crypt(password, stored_hash)`.
  - `getDummyPasswordHash()` supports timing equalization.
- `backend/src/utils/passwordPolicy.ts` added.
  - Replaces zxcvbn with a local common-password/repetition/substring policy.
- Admin auth, customer auth, customer password change, and seed now use these helpers.
- `prisma/migrations/20261020120000_pgcrypto/migration.sql` adds the extension.
- `prisma/seed.ts` hashes `ADMIN_PASSWORD` with pgcrypto.

Reason: argon2 and zxcvbn are CPU-heavy and the Workers free plan allows about 10 ms CPU per request. bcrypt inside PostgreSQL moves the cost off the Worker.

### 10.4 Twilio provider: SDK -> fetch

Changed:

- `backend/src/modules/notifications/twilio.provider.ts` sends Content API messages with `fetch` and Basic auth.
- Added an `AbortSignal.timeout` to bound sends.
- Error classification no longer depends on the Twilio SDK's error shape.
- `backend/src/modules/notifications/notification.routes.ts` validates signatures with `node:crypto` HMAC-SHA1 instead of Express middleware.

### 10.5 Frontend: Cloudflare build with vinext

Added:

- `frontend/vite.config.ts` with `vinext()` and `@cloudflare/vite-plugin`.
- `frontend/cloudflare.config.ts`:
  - Worker name `pokket-pizza-web`.
  - Entrypoint `./worker/index.ts`.
  - Compatibility date `2026-10-20`.
  - `nodejs_compat`.
  - `ASSETS` binding.
  - `API_ORIGIN` text binding.
  - `API` service binding to `pokket-pizza-api`.
- `frontend/worker/index.ts`.
- `frontend/src/app/api/[...path]/route.ts`.
- Frontend scripts:
  - `dev:vinext`, `build:vinext`, `start:vinext`, `deploy:vinext`.
- Dependencies:
  - `vinext`, `@vinext/cloudflare`, `cf`
  - `@cloudflare/vite-plugin`, `vite`, `@vitejs/plugin-react`, `@vitejs/plugin-rsc`
  - `react-server-dom-webpack`
- React/React DOM bumped to `^19.3.1`.
- `frontend/tsconfig.json` includes `.cloudflare/types/**/*.ts`.
- `frontend/eslint.config.mjs` ignores `.cloudflare/**`.
- `frontend/.gitignore` ignores `.vinext/`, `.cloudflare/`, and `/dist/`.

### 10.6 Same-origin proxy, service binding, and custom Worker entry

The first production attempt failed because of Cloudflare error 1042: a Worker cannot fetch another Worker on the same `*.workers.dev` zone over the public URL. The fix has three parts.

1. `frontend/cloudflare.config.ts` declares:

```ts
API: bindings.worker({ worker: "pokket-pizza-api" })
```

2. `frontend/src/app/api/[...path]/route.ts`:
   - Builds the upstream URL from `API_ORIGIN` and the incoming path/query.
   - Uses `globalThis.__CF_ENV__?.API` whenever present.
   - Falls back to plain `fetch` only for local development.
   - Forwards `content-type`, `authorization`, `cookie`, and `accept`.
   - Adds `x-forwarded-for`, `x-forwarded-host`, and `x-forwarded-proto`.
   - Re-appends each `Set-Cookie` value individually so both auth cookies survive.
   - Removes `content-encoding`, `content-length`, and `transfer-encoding` from the upstream response.

3. `frontend/worker/index.ts` wraps the vinext handler:

```ts
import handler from "vinext/server/fetch-handler";

export default {
  fetch(request, env, ctx) {
    globalThis.__CF_ENV__ = env;
    return handler.fetch(request, env, ctx);
  },
};
```

Why the custom entry:

- Importing `cloudflare:workers` inside a route handler breaks the plain Next.js build and dev server.
- Storing `env` on `globalThis` lets the route handler read the service binding without a runtime-specific import.
- `frontend/cloudflare.config.ts` therefore points at `./worker/index.ts`, not directly at `vinext/server/fetch-handler`.

Deployment consequence: `deploy:vinext` re-runs the vinext build, so `API_ORIGIN` must be set on the deploy command, not only in a config file:

```powershell
$env:API_ORIGIN = "https://pokket-pizza-api.pokket-pizza-backend.workers.dev"
npm run deploy:vinext -w frontend
```

### 10.7 Frontend lint and type fixes

The frontend previously had four ESLint errors and several warnings. All were fixed.

| File | Change |
|---|---|
| `frontend/src/app/admin/orders/history/page.tsx` | Removed effect-driven `setSelectedId`; derive `activeSelectedId` from the current result list instead |
| `frontend/src/components/layout/Navbar.tsx` | Removed effect that closed the menu on pathname change; existing click/outside handlers already close it |
| `frontend/src/components/menu/MenuSubNavbar.tsx` | Removed unused `useRef`; replaced `as any` with a typed cast |
| `frontend/src/components/ui/GlobalLoadingBar.tsx` | Replaced direct set-state-in-effect with a delayed timer that shows immediately only after 150 ms of busy state |
| `frontend/src/app/(customer)/checkout/page.tsx` | Added `setCustomerPhone` to a `useCallback` dependency array |
| `frontend/lib/api.ts` | Made the admin 401 redirect URL absolute and added a targeted lint disable |
| `frontend/src/components/admin/KanbanBoard.tsx` | Removed dead imports and unused transition props |
| `frontend/src/app/admin/dashboard/AdminDashboardContent.tsx` | Removed unused status-update handler/props; `isLoading` now uses `updateStatus.isPending` |
| `frontend/src/app/admin/menu-manager/page.tsx` | Suppressed `<img>` warnings with targeted comments; the project does not use `next/image` there |

Current result: `npm run lint -w frontend` is clean.

### 10.8 Configuration and repository changes

| File | Change |
|---|---|
| `package.json` | Removed the argon2 install allowlist entry |
| `.gitignore` | Added `.wrangler/`, `.dev.vars`, `.dev.vars.*`, and an exception for `.dev.vars.example` |
| `frontend/.gitignore` | Added `.vinext/`, `.cloudflare/`, `/dist/` |
| `frontend/package.json` | Added vinext/Cloudflare/Vite scripts and dependencies |
| `backend/package.json` | Added Worker scripts and dependencies; removed Express/argon2/Twilio/pino stack |
| `frontend/tsconfig.json` | Added generated Cloudflare types |
| `frontend/eslint.config.mjs` | Ignores generated `.cloudflare/**` |
| `prisma/schema.prisma` | Added workerd and Node generators |
| `prisma/seed.ts` | Uses pgcrypto; still destructive and guarded |
| `prisma/migrations/20261020120000_pgcrypto/migration.sql` | Adds pgcrypto |
| `docs/DEVELOPER_GUIDE.md`, `docs/DEPLOYMENT.md` | Developer and deployment runbooks |

### 10.9 File-by-file change map

Backend runtime and configuration:

- `backend/src/app.ts` - Hono app, middleware, mount points.
- `backend/src/server.ts` - Node server.
- `backend/src/worker.ts` - Workers entry.
- `backend/src/http/express-adapter.ts` - adapter.
- `backend/src/config/database.ts` - dual-runtime Prisma.
- `backend/src/config/env.ts` - env schema.
- `backend/src/middleware/rateLimit.middleware.ts` - in-memory limiter.
- `backend/src/middleware/auth.middleware.ts` - JWT guards (uses existing logic).
- `backend/src/utils/logger.ts` - JSON logger.
- `backend/src/utils/errors.ts` - Workers-safe stack capture.
- `backend/src/utils/password.ts` - pgcrypto helper.
- `backend/src/utils/passwordPolicy.ts` - password policy.
- `backend/src/utils/async-handler.ts` - deleted.
- `backend/src/modules/**/*.routes.ts` - Hono routers.
- `backend/src/modules/auth/auth.service.ts` - pgcrypto verification.
- `backend/src/modules/auth/auth.customer.service.ts` - pgcrypto + local policy.
- `backend/src/modules/customer/customer.service.ts` - pgcrypto password change.
- `backend/src/modules/notifications/twilio.provider.ts` - fetch-based provider.
- `backend/src/modules/notifications/notification.routes.ts` - HMAC signature middleware.
- `backend/wrangler.jsonc` - API Worker config.
- `backend/.dev.vars.example` - Worker env template.
- `backend/package.json` - scripts/dependencies.

Frontend:

- `frontend/lib/api.ts` - canonical client, absolute admin redirect.
- `frontend/src/lib/api.ts` - re-export shim.
- `frontend/src/lib/api/client.ts` - re-export shim.
- `frontend/worker/index.ts` - Worker entry and env bridge.
- `frontend/src/app/api/[...path]/route.ts` - proxy.
- `frontend/cloudflare.config.ts` - Worker config/bindings.
- `frontend/vite.config.ts` - vinext/Vite/Cloudflare.
- `frontend/package.json` - scripts/dependencies.
- `frontend/tsconfig.json` - generated types.
- `frontend/eslint.config.mjs` - ignore generated output.
- `frontend/.gitignore` - generated output.
- `frontend/src/app/admin/orders/history/page.tsx` - derived selected order.
- `frontend/src/components/layout/Navbar.tsx` - effect removed.
- `frontend/src/components/menu/MenuSubNavbar.tsx` - typing cleanup.
- `frontend/src/components/ui/GlobalLoadingBar.tsx` - timer-based visibility.
- `frontend/src/components/admin/KanbanBoard.tsx` - dead code removed.
- `frontend/src/app/admin/dashboard/AdminDashboardContent.tsx` - dead code removed.
- `frontend/src/app/admin/menu-manager/page.tsx` - lint suppressions.
- `frontend/src/app/(customer)/checkout/page.tsx` - hook dependency fix.

Database and docs:

- `prisma/schema.prisma` - dual generators.
- `prisma/seed.ts` - pgcrypto.
- `prisma/migrations/20261020120000_pgcrypto/migration.sql` - extension.
- `docs/DEVELOPER_GUIDE.md` - this guide.
- `docs/DEPLOYMENT.md` - deployment runbook.

Generated, untracked or ignored:

- `backend/src/generated/prisma/` - workerd client, ignored by root `.gitignore`.
- `backend/src/generated/prisma-node/` - Node client, ignored by root `.gitignore`; regenerated by `prisma generate`.
- `.wrangler/`, `.next/`, `.vinext/`, `.cloudflare/` - build/cache output.

---

## 11. Contribution and pull-request workflow

The repository uses a conventional-commit style history and PRs into `develop`.

### 11.1 Branching

Create a branch from the canonical `develop` branch:

```powershell
git fetch upstream
git switch -c feature/<short-name> upstream/develop
```

Use the prefixes named in the PR template:

- `feature/*`
- `fix/*`
- `hotfix/*`
- `release/*`

`origin` is the contributor fork; `upstream` is `KLN-Business-Solutions-in/PocketPizza-Website`. PRs should target the canonical `develop` branch unless the team says otherwise.

### 11.2 Commit messages

Follow the existing style:

```text
feat: add delivery fee note to order status
fix(frontend): preserve both auth cookies in the API proxy
chore(backend): remove unused Express dependency
docs: document Cloudflare deployment
```

Keep commits focused. Do not mix formatting-only changes with behaviour changes.

### 11.3 Before opening a PR

Run:

```powershell
npm run lint -w frontend
npm run build -w frontend
npx tsc --noEmit -p frontend/tsconfig.json
npm run typecheck -w backend
npm test -w backend
```

If you changed the Cloudflare output, also run:

```powershell
npm run build:vinext -w frontend
```

If you ran `build:vinext`, re-run `npm run build -w frontend` before a standalone `tsc` (see the typecheck ordering gotcha).

### 11.4 PR template

Fill in `.github/PULL_REQUEST_TEMPLATE.md`:

- Summary.
- Related issue (`Closes #...`).
- Type of change.
- Screenshots or recording for UI changes.
- Checklist: branch naming, mobile (375 px) and desktop (1440 px), no hardcoded colours, no `console.log`, accessibility, docs.
- Test type.

The template still mentions old paths such as `apps/customer/`, `apps/admin/`, and `packages/design-tokens`. The actual repo uses `frontend/`, `backend/`, and `shared/`; follow the intent, not the stale paths.

Code owners: `.github/CODEOWNERS` assigns all files to `@Rajal-ui`.

### 11.5 Contract changes

`shared/contract/contract.ts` is marked frozen. If a PR changes request/response shapes:

- Announce it in standup.
- Get sign-off from frontend and backend owners.
- Update both consumers in the same PR.
- Keep money as decimal strings.
- Keep the success/error envelopes.

### 11.6 Database changes

- Add a migration; do not edit an applied migration.
- Commit the migration SQL.
- Keep migrations backwards compatible for rolling deploys when possible.
- Run `prisma migrate deploy` before deploying API code that depends on the new schema.
- Never run the destructive seed against production.

### 11.7 Secrets and generated files

Do not commit:

- `backend/.env`
- `backend/.dev.vars`
- Any `.env*` or `.dev.vars*` secret file
- Cloudflare API tokens
- Neon passwords
- Twilio credentials
- `.wrangler/`, `.next/`, `.vinext/`, `.cloudflare/`

Use the `.example` files for documentation. Generated Prisma clients are build artifacts; do not hand-edit them.

### 11.8 Review checklist

Reviewers should confirm:

- No secret is exposed in code, logs, docs, or screenshots.
- Auth boundaries are unchanged or intentionally changed.
- Order pricing is still server-authoritative.
- New routes are mounted behind the correct middleware.
- Cookies remain `httpOnly`, `secure`, `sameSite=strict`, and `__Host-` compatible.
- New PII responses set `no-store`.
- Rate limits and body limits still apply.
- Any migration is safe and committed.
- The frontend proxy still forwards cookies and preserves multiple `Set-Cookie` values.
- Docs and `.env.example`/`.dev.vars.example` are updated for new configuration.

---

## 12. Known limitations and gotchas

- The root `README.md` is stale marketing copy. This guide is the current engineering overview.
- No frontend tests and no CI workflows exist yet.
- Backend tests cover only delivery distance (12 tests).
- Rate limits and login lockouts are in-memory per Worker isolate. They reset on cold starts and do not coordinate across isolates or regions.
- There is no OTP or phone-possession proof. A guest customer row can be claimed by signing up with that phone number.
- There is no admin `/me` endpoint; the session probe uses an admin order request.
- Customer access/refresh cookies are session cookies even though the JWT lifetimes are 7 and 30 days. Closing the browser drops the cookies.
- `COOKIE_DOMAIN` exists in the env schema but must stay empty for `__Host-` cookies.
- Production `CORS_ORIGIN` still points at localhost. The same-origin proxy does not send `Origin`, so CORS is irrelevant to normal production traffic; change it only if direct browser access to the API is needed.
- The `API_ORIGIN` text binding in `cloudflare.config.ts` is declarative; the proxy route reads `process.env.API_ORIGIN` at build time. Set the environment variable when building/deploying.
- `build:vinext` overwrites Next's generated route types; run a Next build before standalone `tsc`.
- Both generated Prisma clients are ignored and regenerated by `prisma generate`. Run generation before a standalone typecheck in a fresh clone or CI.
- Free-plan Workers allow about 10 ms CPU per request. Password hashing was moved into PostgreSQL to stay under it. Heavy SSR or traffic spikes may require the paid plan.
- Twilio is optional; without credentials the app runs and notifications are skipped.
- Neon database password rotation is still an operational task. See `docs/DEPLOYMENT.md`.
- The frozen contract does not yet include customer auth and phone-order types, so the frontend keeps local types for those endpoints.
- There is no OpenAPI document. The shared contract and this guide are the API reference.

---

## 13. Recommended onboarding reading order

1. This guide, sections 2-6.
2. `docs/DEPLOYMENT.md`.
3. `shared/contract/contract.ts`.
4. `prisma/schema.prisma`.
5. `backend/src/app.ts` and `backend/src/http/express-adapter.ts`.
6. The backend module you will touch (`modules/orders`, `modules/auth`, etc.).
7. `frontend/lib/api.ts` and the matching `frontend/src/lib/api/*` hook file.
8. The matching page/component under `frontend/src/app`.
9. The production smoke test and troubleshooting tables in `docs/DEPLOYMENT.md`.

When in doubt, verify behaviour against the production smoke tests rather than assuming the old README or sprint PDFs describe the current system.
