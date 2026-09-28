# Days 6 & 7 — Remaining Work (Customer UI, frontend-only scope)

**Auditor:** frontend
**Date:** 29 Sep 2026
**Baseline commit:** `1b31b00` "Merge branch 'KLN-Business-Solutions-in:develop'"
**Status:** items 1–5 of *Suggested order of work* are now **implemented and verified**. Everything
still open is listed below and cross-referenced from the closed items.

> This supersedes the first Day 7 audit, which was written against `0a9de91`. Since then
> `e108a75` "security: fix 23 review findings, harden order flow, audit clean (#29)" landed and
> closed most of what that audit listed as blocked. Re-read against current HEAD before working
> from either.

Legend: ✅ done · 🟡 partial / workaround · 🔴 missing or broken

**Verification of the newly closed items:** `npx tsc --noEmit` → 0 errors ·
`npx eslint src lib --max-warnings=0` → 0 problems (the gate was red before this pass) ·
`npx tsx scratch/verify-day67.ts` → 39/39. The third is a throwaway script — see
[6.R5](#6r5--no-test-runner--but-there-is-now-a-throwaway-script). **No browser click-through was
possible**: `browser.tabs.open` returns `[browser.disconnected]`, unchanged from Days 4–6.

---

## What the pull changed (re-audit context)

Several earlier blockers are now **closed by the backend/DB/contract teams**. Do not re-raise these.

| Was blocked on | Now |
|---|---|
| `POST /orders` did not exist | ✅ `order.routes.ts:24` |
| `GET /orders/:publicToken` did not exist | ✅ `order.routes.ts:25` |
| `GET /orders/:publicToken/invoice` did not exist | ✅ `order.routes.ts:26` |
| `Order` had no `publicToken` column | ✅ `schema.prisma:138` |
| `Order` had no `idempotencyKey` column | ✅ `schema.prisma:139`, deduped in `order.service.ts:218-227` |
| Contract had no `indianPhoneSchema` | ✅ `contract.ts:136-141` |
| Contract made `address` unconditional | ✅ `contract.ts:156-160` |
| Contract `pincode` was `max(10)` | ✅ `contract.ts:133`, 6-digit regex |
| `QuoteItem` had no `menuItemId` | ✅ `contract.ts:104` |
| `rejections.ts` docblock claimed it did | ✅ rewritten, `rejections.ts:14-18` |
| Cart hydration trade-off | ✅ `useSyncExternalStore`, `store.ts:196-210` |
| MSW could ship to a production bundle | ✅ `next.config.ts:36-43` + `MSWProvider.tsx:12` |
| `/invoice?token=` leaked a capability token | ✅ retired, `invoice/page.tsx:5-13` |
| Quote/create pricing could drift apart | ✅ both go through `computeQuote` |

**Day 6 core was already done and verified by inspection.** What remained on Day 6 was the *edge* of
the rejection path plus the standing test/verification gaps.

---

# DAY 6

## 6.R1 ✅ Schema-level rejections now map to a line

**Was 🔴.** `parseQuoteIssue` only recognised `items[N]`. The contract's caps (`items` max 50,
`addOnIds` max 20, `quantity` 1…99 — `contract.ts:88-98`) fail **Zod**, and `error.middleware.ts:40`
formats those as dotted paths, so the index stayed `-1` and the offending line was never marked.

`INDEX_RE` (`rejections.ts:50`) is now `/^items(?:\[(\d+)\]|\.(\d+))(?![\w-])/` — both dialects resolve
to the same cart index, and the trailing guard stops `items.0x` / `items[0]x` from parsing as line 0.
Non-item paths (`customer.phone:`, `address.pincode:`) deliberately stay `-1` and read as a banner.

Verified by 13 checks, including that a `quantity: 0` on the *second* line marks line 1 and not
line 0, and that both dialects can appear in one multi-detail rejection.

## 6.R2 ✅ Client-side guards on the cart-size caps

**Was 🔴.** `MAX_CART_LINES` (50) and `MAX_LINE_ADDONS` (20) are now exported from `store.ts` beside
`MAX_LINE_QUANTITY`, named after the contract limits they mirror. `addLine` returns `AddLineResult` and
**refuses** the 51st distinct line with `{ ok: false, reason: "cart-full" }` rather than letting the
customer build a cart guaranteed to 400; `ProductModal` toasts and keeps the modal open so the
configuration is not lost. Merging a quantity into an existing line still works when full — the cap is
on distinct lines. A hand-edited localStorage payload is truncated by `sanitizeLines`, and the cart
page shows a cap notice at the limit.

**On the 20-vs-99 divergence** (the audit asked to align or document): documented, not aligned.
`MAX_LINE_QUANTITY` stays 20 and the docblock at `store.ts:15-21` now says why — a *tighter* client
cap can only ever prevent a server rejection, never cause one. Raising it to 99 is a product
decision, not a correctness fix.

## 6.R3 ✅ The mock enforces the caps the contract has

**Was 🟡.** `mocks/orderStore.ts` runs the request through the **shared** `createOrderRequestSchema`
and formats issues exactly as `error.middleware.ts:40` does (`path.join(".")` + `": "` + message).
Running the shared schema object means the mock cannot drift from the real limits, and it is the only
way to exercise the dotted dialect end-to-end in dev.

## 6.R4 ✅ `quotePayload` no longer sends `variantId: undefined`

**Was 🟡.** The key is now omitted entirely for a standard item (`api/orders.ts`), which also keeps
the payload signature stable.

## 6.R5 🟡 No test runner — but there is now a throwaway script

`frontend/package.json` still has no `vitest`/`jest`/`playwright` and no `test` script. As a stopgap
for this pass, `frontend/scratch/verify-day67.ts` asserts 39 behaviours across
`parseQuoteRejections`, the cart caps, the label map and the mock round-trip
(`npx tsx scratch/verify-day67.ts`). **It is not a test suite** — no runner, no CI hook, no watch
mode, and it is outside the `eslint src lib` gate. Promote it or delete it; do not let it rot as a
third place where behaviour is asserted.

The highest-value permanent suite is unchanged: `quotePayload`, `parseQuoteRejections` (now covering
both index dialects), `indicative.ts`, `money.ts`.

## 6.R6 🟡 No browser click-through has ever been run

Unchanged and still open. `browser.tabs.open` returns `[browser.disconnected]` — no desktop browser
is attached to this session, exactly as on Days 4–6. `tsc` and `eslint` are clean and the pure logic
is covered by the 39 checks above, but **the Day 6 re-quote behaviour (delivery fee appearing on
DELIVERY→PICKUP, qty 1→2 re-quoting) and the whole Day 7 submit path are still verified by reading,
not by watching.** A human needs to run it once: `NEXT_PUBLIC_USE_MOCKS=true npx next dev`, add a
pizza, change the order type, place the order, open the invoice, print it.

---

# DAY 7

`POST /orders`, `GET /orders/:publicToken` and `GET /orders/:publicToken/invoice` all exist, and the
order is really persisted with server-computed totals. What was missing is everything around the
submit and the two documents themselves. Most of that is now done. The one sprint requirement still
open is **7.R6**, and it is blocked on the contract.

## 7.R1 ✅ The quote is re-fetched immediately before submit

**Was 🔴.** `usePreflightQuote` (`api/orders.ts`) is a second, *independent* quote mutation —
`useOrderQuote` dedupes by payload signature and actively refuses to re-ask for an unchanged cart,
which is right while browsing and exactly wrong at the moment of purchase. The submit path now:

1. `POST /orders/quote` with the exact payload about to be submitted.
2. If it **rejects**, the reasons go through `parseQuoteRejections` — the same parser the live quote
   uses, now covering both dialects — and it does **not** fall through to `POST /orders`.
3. If the total **differs** from what is on screen, it stops. `QuoteSummary` renders the new quote
   and a banner names the old and new figures; the button label switches to the new total; nothing is
   charged. A second press re-quotes again, so the customer confirms a price verified moments ago
   rather than a cached one.
4. Only then `POST /orders`.

`agreedTotal` is a single derived value feeding the comparison, the summary and the button label, so
the number compared can never drift from the number shown. `priceChange` is keyed by cart signature
and dropped during render (not in an effect) when the cart is edited, so a stale "price changed"
total can never describe a cart that no longer exists.

## 7.R2 ✅ Synchronous double-submit guard

**Was 🟡.** A `useRef` latch at the top of the submit handler, cleared in `finally`.

Worth recording: `react-hook-form`'s `handleSubmit` has **no** re-entrancy guard — it sets
`isSubmitting`, awaits the resolver, and calls `onValid` unconditionally
(`react-hook-form/dist/index.esm.mjs:3267-3311`). Two clicks therefore both reach the handler, so this
was a real gap, not a theoretical one.

The lint gate is worth a note, because the first two idiomatic answers are both rejected by the React
Compiler rules. A `useRef` fails `react-hooks/refs` ("Passing a ref to a function may read its value
during render") because `handleSubmit` is *called during render* and receives the closure; a
state-held mutable object fails `react-hooks/immutability`. The repo has **zero** `eslint-disable`
comments today, so suppressing was not the answer. What works is building the handler inside a
memoised callback and handing it straight to `<form onSubmit>`, which keeps the ref access in the
event-handler position the rules understand. `handleSubmit` is a full dependency of that callback,
which is correct and means the handler is rebuilt when any of its inputs change, not per keystroke.

## 7.R3 ✅ Confirmation content — and one item that is still contract-blocked

**Was 🔴.** The order page now renders, from the single `OrderStatusResponse` and with no dependency
on the invoice request succeeding:

| Sprint item | Status |
|---|---|
| order number | ✅ in the `<h1>` |
| order type | ✅ first-class row, human label |
| items | ✅ |
| totals | ✅ |
| "pay at store / cash on delivery" | ✅ derived from `orderType`, no longer gated on the invoice |
| **"WhatsApp confirmation is on its way"** | ✅ stated — **but see the backend ask; nothing sends it yet** |
| timestamp | ✅ `createdAt`, formatted `en-IN` |

Also: `CANCELLED` gets its own treatment (no payment note, no WhatsApp promise, red border), the
status pill has a human headline plus a reassuring line per status, and the address block — the one
thing that genuinely needs `/invoice` — degrades to a **retry** rather than vanishing when that
request fails.

**Still blocked, unchanged:** `OrderStatusResponse` (`contract.ts:175-187`) carries no `customer`,
`address` or `paymentMethod`, so the confirmation cannot show the delivery address from one request.
The payment note was worked around by deriving it from `orderType`; the address was **not** worked
around, because faking it would be worse than the second request. This is contract ask #2.

## 7.R4 ✅ Print stylesheet exists

**Was 🔴.** `globals.css` now has a real `@media print` block: white paper, `header`/`nav` hidden, the
layout's `min-h-screen` neutralised (it was forcing a blank second page), shadows dropped,
`thead { display: table-header-group }` so column headings repeat across page breaks,
`break-inside: avoid` on the table and totals so neither splits, and long names wrap instead of
clipping. Screen-only controls opt out with Tailwind's `print:hidden` — the invoice's own Print button
and the order page's action buttons.

**Still missing, contract-blocked:** a print-only shop header so the paper copy is self-contained
(depends on 7.R6). `@page { margin: 12mm }` was deliberately left out because the receipt is short and
the browser default is fine — say the word if you want it.

## 7.R5 ✅ Delivery fee is conditional on both order pages

**Was 🔴.** Both `order/[publicToken]/page.tsx` and `.../invoice/page.tsx` now render the delivery-fee
row only for `DELIVERY`. The server returns `"0.00"` otherwise, so the old code printed a
`Delivery ₹0.00` line on every pickup and dine-in order — which reads as a *missing* charge rather
than "not applicable".

## 7.R6 🔴 Restaurant details on the invoice — still blocked on the contract

**Unchanged, and the only sprint requirement that cannot be finished inside `frontend/`.**
`InvoiceResponse` (`contract.ts:199-221`) has no restaurant field, so there is nothing to render. The
render block is written and waiting on the field; the data exists in the DB, so it is a contract +
serializer change (see *Asks*). A `src/lib/site.ts` constant would be the stopgap, but it drifts from
the DB, so it is not recommended.

## 7.R7 ✅ No raw enum reaches a customer

**Was 🟡.** `src/lib/order/status.ts` is the single source of customer-facing vocabulary: one label
map for all seven statuses, one hint sentence each, order-type labels, the payment note, the timestamp
formatter, and `isTerminalStatus` — which is also what decides when polling stops, so "when do we
stop asking" is a single decision rather than one per page. The invoice's `Payment:`/`Status:` line and
the order page both read from it. Verified: no label contains `_`.

**Still open:** `kind` on `QuoteIssue` (`rejections.ts:42`) is computed and **consumed nowhere**. It
is dead classification data. Left alone — plausible the admin sprint wants it — but worth deleting if
not.

## 7.R8 🟡 Status page is live and shareable — but still has no route metadata

**Was 🟡.** Now: `useOrder` polls every 15s via a **callback** `refetchInterval` (the interval depends
on the fetched status, which does not exist when the query is created) and stops on `COMPLETED` /
`CANCELLED`; `refetchIntervalInBackground: false` so a background tab does not keep hammering.
Copy-link and `navigator.share` with a clipboard fallback. Live regions on the totals and the status.

**Still open:** the route is a client component with no `generateMetadata`, so a shared tab or preview
shows "Pokket Pizza" instead of the order number. That needs a server-component wrapper, which is more
than a metadata line — left for a follow-up. The bad-token copy is **partly** done (a friendlier
message now replaces the raw `ApiError.message`); a `404` page is still not wired.

## 7.R9 ✅ The mock round-trips an order

**Was 🔴.** `POST /orders` prices via the existing `priceQuote`, mints a 48-hex `publicToken` and a
sequential order number, and stores both responses in a module-level `Map` (`mocks/orderStore.ts`).
`GET /orders/:publicToken` and `.../invoice` read from it, and an unknown token is now a **404**
instead of echoing the demo order. The demo order is pre-seeded so `/order/ckmockpublictoken1` still
works.

The Day 7 DoD is now demonstrable by hand: order a Margherita, land on a confirmation showing *your*
Margherita with *your* total and *your* address, and open an invoice for the same order.

**Also closed from this item:** the mock enforces the contract caps (6.R3) and produces
`VALIDATION_ERROR` with dotted `items[N]` details on **create**, not just on quote; the create path
now rejects an invalid phone and a non-6-digit pincode exactly as the real API does; and minted tokens
are 48 hex chars, which passes the backend's own `/^[0-9a-z]{21,64}$/` route guard
(`order.validation.ts:12`). The pre-existing `MOCK_PUBLIC_TOKEN` fixture is still only 17 chars and
would be rejected by that guard — kept as a readable demo token, but it is not a model of a real one.

**Not done:** a simulated slow `POST /orders`, to exercise 7.R2 by hand.

## 7.R10 🟡 `apiFetch` does not check `res.ok`

**Unchanged.** `frontend/lib/api.ts:79` branches on `json.success === true` only, so a `2xx` carrying
`success: false` — or a `4xx` carrying `success: true` — would pass. The sprint's "clear the cart
only after a confirmed 2xx response" is therefore a proxy for "confirmed `success: true`". `clear()` is
correctly placed after the awaited call. Left alone because the real backend always sends both
consistently, and branching on `res.ok` as well would need a decision about which signal wins.

## 7.R11 🟡 `/invoice` is a dead end

**Unchanged.** The legacy route is a hard-coded error page (`invoice/page.tsx:10-13`). Correct decision
to retire the query-token variant, but an old link in a customer's history should **redirect** to
`/order/[token]/invoice` when a token is present rather than tell them the link expired, or the route
should be deleted. Either is fine; leaving the current message is not.

## 7.R12 🟡 Smaller items — two closed, two open

**Closed:**

- **The lint gate is green.** The lone warning was `_auth` in `frontend/lib/api.ts:40`. The `auth`
  option was dead — nothing in the repo passed it, and auth is a cookie sent unconditionally by
  `credentials: "include"` — so it was **removed**, with a docblock saying why, rather than silenced
  with a `_` prefix or an `ignoreRestSiblings` rule change. A caller that wants to signal an admin
  request should be explicit, not flip a parameter that did nothing.
- **Accessibility.** Order number is in the `<h1>`; `aria-live` on the totals and the status pill; the
  address retry is a real `<button>`.

**Still open:**

- **`CreateOrderResponse` is still discarded.** The submit gets order number, status and totals back and
  throws them away, re-fetching via `useOrder` — one loading state on the most important screen in the
  funnel. Needs either a richer `CreateOrderResponse` (contract ask #3) or a router state hand-off.
- **`MAX_LINE_QUANTITY` vs the contract's 99** — closed under 6.R2 as a documented, deliberate
  divergence.

---

# Requirements from other teams

Nothing below is actionable inside `frontend/`. Ordered by what blocks a sprint item.

## Backend

1. **WhatsApp order notification — still absent, and now load-bearing.** The confirmation screen states
   *"A WhatsApp confirmation with your order details is on its way to your number"*, and checkout tells
   the customer its failure never cancels the order. The `Notification` model exists
   (`schema.prisma:197-212`) and is written by **nothing** — a repo-wide grep for `whatsapp|notification`
   across `backend/` returns no matches. It must be fire-and-forget, outside the order transaction
   (`placeOrder`, `order.repository.ts:53-113`), with the outcome recorded on the `Notification` row.
   **This is the only remaining Day 7 item that needs new backend work rather than a contract tweak,
   and it is now the one promise the UI makes that nothing keeps.**
2. **Restaurant details on the invoice** — add a `restaurant` object to `InvoiceResponse` (contract +
   serializer). The data exists; it is one `include` in `getInvoice` (`order.service.ts:329-354`).
   Blocks 7.R6, the last open sprint requirement.
3. **`findRestaurantPricing` uses `findFirst` with no `orderBy`** (`order.repository.ts:16`). The
   delivery fee comes from an arbitrary restaurant row; correct only because there is exactly one.
   `findQuoteItems` is now properly `restaurantId`-scoped (`:6`) — this one was missed.
4. **Inactive add-ons are reported as `invalid add-on "<id>"`** — `addOns: { where: { isActive: true } }`
   (`:9`) hides the row, so the resolver cannot say "no longer available". The frontend handles both
   words, but the message is poor for a customer.
5. **Tax is hardcoded `0.00`** in `computeQuote` and there is no tax configuration on `Restaurant`. The
   UI shows a Tax row that is always zero. Confirm GST is genuinely out of scope, or add the rate.
6. **Create-order error shape** — `createOrder` uses `ORDER_INVALID` with `items[N]` details for cart
   problems but dotted `customer.phone:` / `address.pincode:` for its own checks
   (`order.service.ts:109-195`). The frontend reuses the quote parser on both the quote and the create
   path, so this is load-bearing. Please confirm it is stable.
7. **Replayed idempotent create returns 200, not 201** (`order.controller.ts:23`). The frontend's
   `apiFetch` accepts both, so no change needed — flagging so nobody "fixes" it into an error.

## Shared contract (`shared/contract/contract.ts`)

The file still carries the `FROZEN` header (`contract.ts:4`) but was edited in `e108a75` without that
annotation being updated. The rules it absorbed are all correct; the header is now misleading.

1. **`InvoiceResponse` needs `restaurant`** — blocks 7.R6, the last open sprint requirement.
2. **`OrderStatusResponse` needs `customer` + `address` + `paymentMethod`** — the status page must
   still make a second request to `/invoice` just to show the delivery block. The payment note was
   worked around by deriving it from `orderType`; the address was not, and degrades to a retry on
   failure.
3. **`CreateOrderResponse` needs `paymentMethod`** at minimum, ideally `customer` + `address`
   (helps 7.R12's discarded response).
4. **Confirm the Zod-issue `details` format is stable API.** `error.middleware.ts:40` emits
   `items.0.quantity: …` dotted paths for schema failures while the cart resolver emits
   `items[0]: …`. The frontend parser now handles both dialects deliberately — the mock reproduces both
   by running the shared schema — so please do not "tidy" one into the other without telling us.

## Database

No blockers. `publicToken`, `idempotencyKey` and `paymentMethod` are all in place
(`schema.prisma:138-140`) and migrated.

1. **Optional:** `OrderItem` stores `variantSnapshot` / `addOnsSnapshot` but no `variantId` /
   `addOnIds` (`schema.prisma:170+`), so the admin order detail cannot show which variant was actually
   ordered. Flag to the admin sprint.
2. **Optional:** tax configuration on `Restaurant` (see backend #5).
3. **Optional:** no seeded orders, so the admin orders list and reports are empty on first run — a
   couple of seeds would make manual Day 7 verification easier.
4. **Informational:** `Customer.phone` is `@unique` and `placeOrder` upserts on it
   (`order.repository.ts:66-75`, first-writer-wins). The customer table is a de-facto phone
   directory. Intended, but worth a conscious sign-off.

---

# What is left, in order

1. **7.R6** — blocked on the contract, and the only open sprint requirement.
2. **6.R6** — a human click-through with mocks on. Nothing can be done about this from here; no
   browser is attached to this session.
3. **Backend #1** — WhatsApp. Not frontend work, but the UI now promises it.
4. **7.R8** route metadata (server-component wrapper), **7.R11** redirect-or-delete, **7.R10** `res.ok`
   — all small, all judgement calls worth a sentence from you first.
5. **6.R5** — promote the scratch script to Vitest or delete it. Everything above is otherwise
   verified by reading and by a 39-check script that is not a test suite.
