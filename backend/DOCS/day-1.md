# Backend Conventions

> **Source of truth** for naming, security, and patterns across the backend.
> Every team member must follow these. Update this file when conventions change.

---

## Table of Contents

1. [File Naming](#1-file-naming)
2. [Type & Interface Naming](#2-type--interface-naming)
3. [Function Naming](#3-function-naming)
4. [Variable Naming](#4-variable-naming)
5. [Error Codes](#5-error-codes)
6. [Money Conventions](#6-money-conventions)
7. [API Conventions](#7-api-conventions)
8. [Security Conventions](#8-security-conventions)
9. [Gotchas & Anti-patterns](#9-gotchas--anti-patterns)
10. [Glossary](#10-glossary)

---

## 1. File Naming

Every file has one responsibility. The name tells you what it does.

### Config

| Pattern | Example | Why |
|---------|---------|-----|
| `camelCase.ts` | `env.ts`, `database.ts` | Simple, descriptive, no suffix needed |

### Middleware

| Pattern | Example | Why |
|---------|---------|-----|
| `camelCase.middleware.ts` | `error.middleware.ts` | Suffix separates middleware from other utils |

### Utilities

| Pattern | Example | Why |
|---------|---------|-----|
| `camelCase.ts` | `response.ts`, `errors.ts` | Pure helpers, no side effects |

### Module files (Day 2+)

| Pattern | Example | Responsibility |
|---------|---------|----------------|
| `{module}.routes.ts` | `auth.routes.ts` | HTTP layer — route definitions only |
| `{module}.controller.ts` | `auth.controller.ts` | Thin adapter — reads request, calls service, sends response |
| `{module}.service.ts` | `auth.service.ts` | Business logic — never touches Express req/res |
| `{module}.repository.ts` | `auth.repository.ts` | Database access — Prisma queries only |
| `{module}.validation.ts` | `auth.validation.ts` | Zod schemas for request validation |
| `{module}.types.ts` | `auth.types.ts` | Domain types — interfaces, enums, DTOs |

### Specialized services

| Pattern | Example | When to use |
|---------|---------|-------------|
| `{domain}.{qualifier}.service.ts` | `pricing.service.ts`, `order-status.service.ts` | When one service file grows beyond ~200 lines |

---

## 2. Type & Interface Naming

| What | Convention | Example | Notes |
|------|-----------|---------|-------|
| Types / Interfaces | `PascalCase` | `QuoteRequest`, `OrderStatus` | Always PascalCase, even for simple types |
| Enum values (unions) | `SCREAMING_SNAKE_CASE` | `DELIVERY`, `PICKUP`, `DINE_IN` | String literal unions, not TS enums |
| Zod schemas | `camelCase` + `Schema` | `loginSchema`, `quoteSchema` | Suffix makes it clear this is a validator, not a type |

---

## 3. Function Naming

### Controllers

```ts
// Pattern: verbNoun
loginController(req, res)    // POST /auth/login
getMenu(req, res)            // GET /menu
createOrder(req, res)        // POST /orders
```

### Services

```ts
// Pattern: verbNoun
createOrder(input)           // Business logic for order creation
computePricing(cart)         // Price calculation
validateTransition(from, to) // State machine check
```

### Repositories

```ts
// Pattern: findByX / createX / updateX
findAdminByEmail(email)
createRefreshSession(data)
updateOrderStatus(id, status)
revokeSession(id)
```

### Helpers / Utilities

```ts
// Pattern: verbNoun
normalizeIndianPhone(raw)
toDecimal(value)
sendSuccess(res, data)
```

### Middleware

```ts
// Pattern: adjective or noun (no verb prefix)
authMiddleware(req, res, next)
errorHandler(err, req, res, next)
globalRateLimit(req, res, next)
```

---

## 4. Variable Naming

| What | Convention | Example | Notes |
|------|-----------|---------|-------|
| Variables | `camelCase` | `orderTotal`, `menuItem` | Standard JS/TS |
| Constants | `SCREAMING_SNAKE_CASE` | `ALLOWED_TRANSITIONS`, `COOKIE_FLAGS` | Only for true constants |
| Classes | `PascalCase` | `AppError`, `ValidationError` | Always PascalCase |
| Function params | `camelCase` | `restaurantId`, `rawPhone` | Descriptive, not abbreviated |
| Boolean vars | `is` / `has` / `should` prefix | `isActive`, `hasVariants`, `shouldRetry` | Readable as English |

---

## 5. Error Codes

Fixed set — never invent new codes without updating `shared/contract.ts`.

| Code | HTTP | When to use |
|------|------|-------------|
| `VALIDATION_ERROR` | 400 | Zod validation failure |
| `ORDER_INVALID` | 400 | Cart references unavailable item |
| `ORDER_INVALID_TRANSITION` | 400 | State machine violation |
| `AUTHENTICATION_REQUIRED` | 401 | Missing or invalid access cookie |
| `AUTHENTICATION_INVALID` | 401 | Login failed (wrong credentials) |
| `FORBIDDEN` | 403 | Role or tenant violation |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Unique violation or state conflict |
| `RATE_LIMITED` | 429 | Rate limiter triggered |
| `INTERNAL_ERROR` | 500 | Unhandled server error |

---

## 6. Money Conventions

> **Rule:** Never use `Number`, `float`, or `int` for money. Ever.

| Where | Format | Example |
|-------|--------|---------|
| In code (calculation) | Integer paise | `39900` = ₹399.00 |
| On the wire (JSON) | Decimal string | `"399.00"` |
| In database | `Prisma.Decimal(10,2)` | Exact decimal type |

**Why:** JavaScript floats lose precision. `0.1 + 0.2 = 0.30000000000000004`. Integer arithmetic eliminates this.

**Using `src/utils/decimal.ts`:**

```ts
import { toDecimal, add, multiply, sum, toFixed2 } from '../utils/decimal';

const price = toDecimal("399");           // create from string
const total = add("100", "200");           // → "300"
const lineTotal = multiply("399", 2);      // → "798"
const subtotal = sum(["100", "200", "300"]);// → "600"
const wire = toFixed2("399");              // → "399.00"
```

Never round before the final total.

---

## 7. API Conventions

### Response envelope

Every response uses this shape — no exceptions:

**Success:**
```json
{
  "success": true,
  "data": { },
  "requestId": "req_abc123"
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": ["field: reason"]
  },
  "requestId": "req_abc123"
}
```

### Request IDs

- Generated per request via `crypto.randomUUID()`
- Prefixed with `req_`
- Included in every response and log line
- Never used as auth tokens

### Public vs Admin endpoints

| Type | Auth | Lookup key | Notes |
|------|------|-----------|-------|
| Public | None | `publicToken` (cuid) | Customer-facing |
| Admin | JWT cookie | `id` (cuid) | Staff-facing |

### Cookie naming

| Cookie | Purpose | Flags |
|--------|---------|-------|
| `__Host-admin_access` | JWT access token | HttpOnly, Secure (prod), SameSite=Strict, Path=/ |
| `__Host-admin_refresh` | Refresh token | HttpOnly, Secure (prod), SameSite=Strict, Path=/ |

> `__Host-` prefix uses **two** underscores. Never `_Host-`.

---

## 8. Security Conventions

### Trust proxy

```ts
app.set('trust proxy', 1);
```

Set this in `app.ts` **before** middleware. Without it, `req.ip` returns the proxy IP instead of the client IP, breaking rate limiting and logging.

Behind a reverse proxy (nginx, Cloudflare, Railway, Render), all clients appear as one IP.

### Rate limiting

| Route | Limit | Window | Key |
|-------|-------|--------|-----|
| Global | 100 | 15 min | IP |
| Login | 10 | 15 min | IP + email |
| Order create | 20 | 1 hour | IP |
| Refresh | 30 | 1 hour | IP |

- In-memory store — single instance only
- If email is missing from login body, key defaults to `'unknown'` (prevents bucket bypass)

### Secret handling

| Rule | Why |
|------|-----|
| Never log passwords, tokens, hashes | Pino redaction covers these paths |
| Never return secrets in responses | Error messages are generic in production |
| `.env` is gitignored from commit one | Prevents accidental credential exposure |
| `JWT_SECRET`: min 32 characters | Prevents brute-force signing |
| Use `env` object, not `process.env` | Centralized validation at startup |

### Input validation

- Zod on every body, query, and path parameter
- Reject extra keys with `.strict()`
- CUID validation before DB hits (prevents enumeration)
- Phone numbers normalized before storage (no `+91`, spaces, dashes)

### Error messages

| Environment | Behavior |
|-------------|----------|
| Development | Full error message returned (for debugging) |
| Production | Generic "Internal server error" for unhandled errors |

Never expose: stack traces, file paths, DB error text, secret names.

### CORS

- Explicit origin allow-list from `CORS_ORIGIN` env var
- `credentials: true` for cookie auth
- No wildcard `*` in production

### Security audit findings (2026-09-18)

These were found during the Day 1 security review and fixed:

| Finding | Severity | Fix applied |
|---------|----------|-------------|
| `parseFloat` used for money arithmetic | Critical | Replaced with integer paise in `decimal.ts` |
| Missing `trust proxy` config | High | Added `app.set('trust proxy', 1)` in `app.ts` |
| Login rate limit key defaults to empty string | Medium | Default changed to `'unknown'` |
| Redundant phone regex check | Low | Simplified to single validation |

---

## 9. Gotchas & Anti-patterns

| Don't | Why | Do instead |
|-------|-----|-----------|
| Use `parseFloat` for money | Precision loss | Use integer paise or `decimal.js` |
| Trust `req.ip` without proxy config | All clients share one IP | Set `trust proxy` |
| Default rate limit key to empty string | Creates bypass bucket | Default to `'unknown'` |
| Throw generic `Error` from services | No HTTP status, no error code | Throw `AppError` subclass |
| Log before env is loaded | Env might be invalid | Use `console.error` in `loadEnv()` |
| Use `_Host-` cookie prefix | Browser rejects it | Use `__Host-` (two underscores) |
| Edit `schema.prisma` directly | DB team owns it | Request change via DB team |
| Use `DELETE` endpoints | Breaks historical order data | Toggle `isActive` only |
| Send client-submitted totals to DB | Client can tamper | Recompute server-side |

---

## 10. Glossary

| Term | Definition |
|------|------------|
| **Argon2id** | Password hashing algorithm, preferred over bcrypt (OWASP recommendation). Memory-hard, resistant to GPU attacks. |
| **BSP** | Business Solution Provider — intermediary for WhatsApp Business API (e.g., AiSensy, Interakt). Handles template approval and delivery. |
| **CUID** | Collision-resistant unique identifier. Used for `id`, `publicToken`. URL-safe, ordered. |
| **Decimal string** | Money formatted as `"399.00"` on the wire. Never a JS float. |
| **Envelope** | Standard response shape: `{ success, data?, error?, requestId }`. Every response uses this. |
| **Idempotency** | Safe to retry without duplicate side effects. Client sends `idempotencyKey`; server returns existing order on duplicate. |
| **KOT** | Kitchen Order Ticket — shop's WhatsApp alert with full order details. |
| **MVP** | Minimum Viable Product — the first releasable version with core features. |
| **publicToken** | CUID on `Order` — used for public invoice/status lookup. Not the same as `orderNumber`. |
| **orderNumber** | Display-only string like `ORD-20260918-001`. Human-readable, not a lookup key. |
| **Paise** | Indian currency subunit — 100 paise = 1 rupee. Money stored as integer paise in code. |
| **Prisma** | ORM for PostgreSQL — type-safe database access with migrations. |
| **Prisma.Decimal** | Prisma's decimal type — stores exact decimal values, not floats. Used in schema. |
| **Rate limiter** | Middleware that blocks IPs after too many requests. In-memory for MVP (single instance). |
| **Soft delete** | Toggle `isActive` to false instead of deleting rows. Preserves historical order data. |
| **State machine** | Order status transitions with strict rules: `NEW → CONFIRMED → PREPARING → READY → COMPLETED`. Invalid transitions rejected. |
| **Trust proxy** | Express setting (`app.set('trust proxy', 1)`) that reads `X-Forwarded-For` header for real client IP. |
| **Upsert** | Insert or update — if row exists, update it; if not, create it. Used for customer phone dedup. |
| **WhatsApp template** | Pre-approved message format sent via BSP. Must be approved by Meta before use. Takes days. |
| **Zod** | TypeScript-first validation library. Used for all request/response validation. Exports both types and runtime validators. |
