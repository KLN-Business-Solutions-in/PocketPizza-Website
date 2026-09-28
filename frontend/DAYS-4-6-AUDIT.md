# Days 4–6 Sprint Audit — Customer UI (Frontend-only scope)

**Auditor:** frontend
**Date:** 27 Sep 2026
**Baseline commit:** `4bd5c50` "Feat cart logic (#25)"
**Status:** all gaps identified below are now closed. See [Delivery record](#delivery-record) at
the end of this file for what was built, how it was verified, and the resulting asks for other
teams.

Legend: ✅ done · 🟡 partial / workaround · 🔴 missing or broken

---

## How to read this

Each day is walked in the order the code actually runs: *data in → store → screen → wire*.
"Tour stop" numbers are the stops on that walk.

---

# DAY 4 — Product Detail & Cart Store

**Theme:** customisation and cart. Backend is on auth, so the frontend is self-sufficient.

## 4.1 Tour of what exists today

| # | Stop | File |
|---|------|------|
| 1 | Menu grid, CTA says "Customise" when the item has variants/add-ons, else "Add to Cart" | `src/components/menu/MenuItemCard.tsx:66` |
| 2 | Card click lifts a `MenuItem` into `MenuContent` local state, renders `ProductModal` | `src/app/(customer)/menu/MenuContent.tsx:14,74,82` |
| 3 | Modal: variant radio group (Standard + one per variant, shows `priceDelta`) | `src/components/menu/ProductModal.tsx:49-75` |
| 4 | Modal: add-on checkboxes (shows `price`) | `src/components/menu/ProductModal.tsx:77-93` |
| 5 | Modal: quantity stepper, clamped 1…20 | `src/components/menu/ProductModal.tsx:95-108` |
| 6 | Modal → `addLine({ menuItemId, variantId, addOnIds, quantity })`, then close | `src/components/menu/ProductModal.tsx:37-40` |
| 7 | Zustand store, `persist` middleware, localStorage key `pokket-cart` | `src/lib/cart/store.ts:40-75` |
| 8 | Duplicate configurations merge by `lineKey` (item + variant + sorted add-on ids) and sum quantities | `src/lib/cart/store.ts:35-38,46-56` |
| 9 | `updateQty` with `<= 0` deleting the line; `removeLine`; `clear` | `src/lib/cart/store.ts:58-68` |
| 10 | Order type held in the same persisted store | `src/lib/cart/store.ts:70` |
| 11 | Header cart badge with a live quantity sum | `src/components/layout/Navbar.tsx:38,84` |
| 12 | "Final total is calculated securely at checkout" disclaimer | `src/components/menu/ProductModal.tsx:109-111` |
| 13 | Money helpers treat the wire format as decimal strings; float math explicitly display-only | `src/lib/money.ts:1-5,22-25` |
| 14 | MSW mock re-implements the server pricing curve for local dev | `src/mocks/handlers.ts:50-90` |

## 4.2 Definition of Done status

> Item with variant + add-ons can be added to cart, quantity edited, removed; cart survives a page refresh.

| Requirement | Status | Evidence |
|---|---|---|
| Item with variant + add-ons can be added | ✅ | `ProductModal.tsx:37-40`, `store.ts:45-56` |
| Quantity edited | ✅ | `cart/page.tsx:87-92` |
| Removed | ✅ | `store.ts:67-68`, `cart/page.tsx:94-96` |
| Cart survives a page refresh | ✅ | `store.ts:40-74` (`persist`) |
| Variant selector (Small/Medium/Large) | ✅ | `ProductModal.tsx:62-72` — driven by data, labels come from the API |
| Add-on checkboxes | ✅ | `ProductModal.tsx:81-92` |
| Quantity stepper | ✅ | `ProductModal.tsx:95-104` |
| **Live indicative price preview** `(basePrice + priceDelta + ΣaddOns) × qty` | 🔴 | **Absent.** Only the static `product.basePrice` renders (`ProductModal.tsx:45-47`). Nothing anywhere computes an indicative total. |
| **Cart line shape `{menuItemId, variantId, addOnIds, quantity, displayName, displayPrice}`** | 🔴 | `CartLine` has `key` instead of `displayName`/`displayPrice` (`store.ts:13-20`). |
| **Only active items addable; inactive line evicted with a toast** | 🔴 | No reconciliation logic, no toast. |
| Cart badge with live item count | ✅ | `Navbar.tsx:38,84` |
| Cart price explicitly *not* the submitted price | ✅ | `money.ts:1-5`, `ProductModal.tsx:109-111` |

**Day 4 verdict: DoD met, but 3 of the day's explicit requirements are not built.**

## 4.3 What is still to be achieved

### 4.3.1 🔴 Live indicative price preview
`ProductModal` must derive, on every variant / add-on / qty change:
`unit = basePrice + priceDelta(variant) + Σ price(addOn)`, `total = unit × qty`, rendered next to
the Add-to-Cart button. Must be built on `src/lib/money.ts` decimal-string helpers and clearly
labelled *indicative*. Reuse the exact curve the MSW mock already uses
(`mocks/handlers.ts:54-69`) so mock and UI agree.

### 4.3.2 🔴 Cart line shape → `displayName` / `displayPrice`
`CartLine` (`store.ts:13-20`) must gain `displayName` and `displayPrice`, written at `addLine` time
from the picked product/variant/add-ons. Consequences of the current gap:
- `cart/page.tsx:65-69` re-derives names by looking the item up in the **live** menu, so a renamed
  item silently changes label in the cart.
- `cart/page.tsx:73` falls back to printing the raw `menuItemId` cuid as the heading when the item
  is not in the current menu payload.
- `displayPrice` is what makes the Day 5 indicative subtotal and the Day 6 "what you saw vs what the
  server says" comparison possible at all.

### 4.3.3 🔴 Inactive-item eviction + toast
- Add a store action (e.g. `evictInactive(activeIds)` / `reconcile`) that drops lines whose
  `menuItemId` is no longer in the active menu payload and returns the removed lines so the caller
  can toast.
- Wire it where the menu query resolves (`MenuContent`/cart page), not on every render.
- `Toast` already exists at `src/components/ui/LayoutPrimitives.tsx:57-64` and is **referenced
  nowhere** — build the first consumer, and add an auto-dismiss so a single instance can be reused.
- Note: the public `MenuItem` type has no `isActive`; it exists only on `AdminMenuItem`
  (`shared/contract/contract.ts:255-258`). Server-side filtering (`useMenu.ts:15`) is the only
  active signal the customer UI has — so eviction is a **payload-diff** operation, not a flag read.

### 4.3.4 🟡 Smaller Day 4 items
- Quantity cap is `20` in the modal (`ProductModal.tsx:102`) but **uncapped** on the cart page
  (`cart/page.tsx:91`). Extract one shared `MAX_QTY`.
- `store.count()` exists (`store.ts:71`) but `Navbar` re-implements the reduce inline
  (`Navbar.tsx:38`). A function selector re-runs on every store write; inline reduce also re-runs.
  Minor — unify on one.
- `persist` has no `skipHydration` / `hasHydrated` guard, so the first server-rendered paint of the
  badge can disagree with the persisted cart. Consider a hydration flag.
- `addLine` performs no active check. Decide and document: "addable == present in the active menu
  payload" (server-filtered) is the only option available to this UI today.

---

# DAY 5 — Cart Page & Checkout Form Validation

**Theme:** react-hook-form + Zod, reusing the shared contract schemas.

## 5.1 Tour of what exists today

| # | Stop | File |
|---|------|------|
| 1 | Cart page: order-type pill selector (all three modes) | `src/app/(customer)/cart/page.tsx:41-61` |
| 2 | Cart page: per-line variant label and add-on labels spelled out | `cart/page.tsx:66-79` |
| 3 | Cart page: −/+ quantity and Remove | `cart/page.tsx:86-97` |
| 4 | Cart page: per-line "Base ₹…" only — no totals | `cart/page.tsx:80-84` |
| 5 | Cart page: "Proceed to Checkout" → `/checkout` | `cart/page.tsx:103-107` |
| 6 | Cart page: empty state with CTA back to the menu | `cart/page.tsx:23-35` |
| 7 | Checkout: order-type pills again (so the switch is reachable here too) | `checkout/page.tsx:133-149` |
| 8 | Checkout: server quote summary card | `checkout/page.tsx:151-190` |
| 9 | Checkout: **nine independent `useState` fields** — name, phone, line1/2, landmark, city, pincode, notes | `checkout/page.tsx:24-32` |
| 10 | Checkout: `submit` hand-validates, then assembles the body and POSTs | `checkout/page.tsx:51-97` |
| 11 | Checkout: delivery address block rendered only for `DELIVERY` | `checkout/page.tsx:201-212` |
| 12 | Checkout: optional notes, `maxLength={500}` | `checkout/page.tsx:216` |
| 13 | Checkout: one page-level `formError` string in an `ErrorState` | `checkout/page.tsx:32,219` |
| 14 | Checkout: submit → `clear()` cart, rotate idempotency key, route to `/order/{publicToken}` | `checkout/page.tsx:99-105` |
| 15 | `normalizeIndianPhone` — strips `+91`/leading `0`, enforces `^[6-9]\d{9}$` | `src/lib/phone.ts:5-14` |
| 16 | `<Input>` already accepts an `error` prop and renders it inline (unused by checkout) | `src/components/ui/Input.tsx:5,23` |
| 17 | `react-hook-form@^7.88.0` is **already a dependency** and **imported nowhere** | `package.json:18` |

## 5.2 Definition of Done status

> Checkout form validates all three order modes correctly; delivery fields appear and are enforced
only for Delivery.

| Requirement | Status | Evidence |
|---|---|---|
| Cart page: line items with variant + add-ons spelled out | ✅ | `cart/page.tsx:66-79` |
| Cart page: quantity controls | ✅ | `cart/page.tsx:86-92` |
| Cart page: "proceed to checkout" | ✅ | `cart/page.tsx:103-107` |
| **Cart page: indicative subtotal** | 🔴 | **No total of any kind renders on the cart page.** Needs `displayPrice` from 4.3.2. |
| Order type selector: Pickup / Delivery / Dine-in | ✅ | `cart/page.tsx:41-61`, `checkout/page.tsx:133-149` |
| Name required | ✅ | `checkout/page.tsx:66-69` |
| 10-digit Indian mobile, always required | 🟡 | Enforced on submit only (`checkout/page.tsx:59-65`) via `phone.ts`. No inline error, no live feedback. |
| Address block required **only** for Delivery | 🟡 | Rendered conditionally (`:201`) and enforced on submit (`:70-73`) — but by hand-written `if`s, not schema. |
| Optional order notes | ✅ | `checkout/page.tsx:216` |
| **react-hook-form + Zod** | 🔴 | **Neither is used.** `react-hook-form` is installed-but-unused; `@hookform/resolvers` is not in `package.json` at all. |
| **Reuse the same Zod schemas from `shared/`** | 🔴 | `createOrderRequestSchema` / `addressSchema` exist (`shared/contract/contract.ts:127-145`) and are never imported by the frontend. |
| **Inline field-level errors** | 🔴 | One shared `formError` at the bottom (`:219`). `<Input error>` unused. |
| **Disabled submit while invalid** | 🔴 | `<Button type="submit">` at `:221` has no `disabled`. |
| **Mobile keyboards** (`inputMode="numeric"` for phone/pincode) | 🔴 | Absent on every input (`:196-209`). |

**Day 5 verdict: not met.** The validation layer the day is named for does not exist.

## 5.3 What is still to be achieved

### 5.3.1 🔴 Add `@hookform/resolvers`; move `zod` to `dependencies`
`package.json:32` has `zod` in **devDependencies** while `shared/contract/contract.ts:8` imports it
and it is pulled into the client bundle. `@hookform/resolvers` is absent entirely. Also
`frontend/node_modules` is not installed in this workspace, so `next build` / `tsc` / `eslint` could
not be run to verify any of this.

### 5.3.2 🔴 Build the form on the shared schemas — without editing the frozen contract
`shared/contract/contract.ts:4` marks the contract **FROZEN**. Layer the client refinements on top,
e.g. in `src/lib/checkout/schema.ts`:

- `customer.phone` in the contract is only `z.string().min(10).max(15)`
  (`contract.ts:141-142`) — **not** a 10-digit Indian mobile. Add a frontend `.refine`/`.superRefine`
  using `isValidIndianPhone` from `src/lib/phone.ts` so the client and `phone.ts` cannot drift.
- Nothing in the contract makes `address` conditional. Add a `superRefine`: `orderType === "DELIVERY"`
  ⇒ `address` required with non-empty `line1` / `city` / `pincode`; otherwise `address` is stripped.
- `notes` max 500 already enforced by the contract (`contract.ts:143`).
- Keep `createOrderRequestSchema` as the base and use the result as the `zodResolver` type source,
  so the submit body is typed by the contract.

### 5.3.3 🔴 Inline field-level errors
Wire `formState.errors` → `<Input error={...}>` per field, `aria-invalid`, and focus/scroll to the
first invalid field on submit. The `Input` primitive already renders the message
(`ui/Input.tsx:23`); only the plumbing is missing.

### 5.3.4 🔴 Disable submit while invalid
Gate on `formState.isSubmitting || !isValid` **plus** the Day 6 quote gate (6.3.7). Show the total
from the server quote, never the indicative one.

### 5.3.5 🔴 Mobile keyboards
`type="tel"` + `inputMode="numeric"` + `maxLength={10}` on phone; `inputMode="numeric"` +
`maxLength={6}` on pincode; `autoComplete` values (`name`, `tel`, `postal-code`,
`address-line1`, `address-level2`, `street-address`).

### 5.3.6 🔴 Indicative subtotal on the cart page
Requires Day 4's `displayPrice` (4.3.2). Render a per-line `× qty` amount and a cart subtotal, each
tagged *indicative*, and keep the "server confirms at checkout" line.

### 5.3.7 🟡 Smaller Day 5 items
- Phone/nickname validation on blur (`mode: "onBlur"`) rather than only at submit.
- Switching `DELIVERY → PICKUP` hides the address block; today the values are dropped silently at
  `:84-94`. Either clear them via `unregister` or tell the user.
- The order-type selector is duplicated on cart and checkout — extract one component.

---

# DAY 6 — Wire the Server-Side Quote

**Theme:** the customer sees the server's numbers, not yours. Send IDs and quantities only.

## 6.1 Tour of what exists today

| # | Stop | File |
|---|------|------|
| 1 | `useQuote()` mutation → `POST /orders/quote` | `src/lib/api/orders.ts:23-31` |
| 2 | `quotePayload` maps cart lines to `{menuItemId, variantId, addOnIds, quantity}` — **no prices sent** ✅ | `src/lib/api/orders.ts:33-46` |
| 3 | Checkout effect fires the quote on mount and on `lines.length` / `orderType` change | `checkout/page.tsx:39-43` |
| 4 | Summary card renders server `subtotal` / `deliveryFee` / `tax` / `total` | `checkout/page.tsx:167-186` |
| 5 | Submit button label uses the server total | `checkout/page.tsx:222` |
| 6 | Manual "Refresh quote" escape hatch | `checkout/page.tsx:154` |
| 7 | Quote errors render a generic `ErrorState` + retry | `checkout/page.tsx:159-166` |
| 8 | Backend `POST /api/v1/orders/quote` exists, strict schema | `backend/src/modules/orders/order.routes.ts:7`, `order.validation.ts:3` |
| 9 | Backend rejects with `VALIDATION_ERROR` + `details: string[]` shaped `items[N]: …` | `backend/src/modules/orders/order.service.ts:63-65`, `utils/errors.ts:16-23` |
| 10 | `ApiError` carries `code`, `status`, `details`, `requestId` | `src/lib/api.ts:90-96` |

## 6.2 Definition of Done status

> Checkout summary is driven entirely by the quote endpoint; inactive-item and invalid-variant
errors are handled visibly, not silently.

| Requirement | Status | Evidence |
|---|---|---|
| Send IDs and quantities only, never prices | ✅ | `api/orders.ts:33-46` |
| `POST /api/v1/orders/quote` payload shape matches contract | ✅ | `quoteRequestSchema`, `contract.ts:95-98` |
| Quote on entering checkout | ✅ | `checkout/page.tsx:39-43` |
| Render server `subtotal`, `deliveryFee`, `tax`, `total` | ✅ | `checkout/page.tsx:167-186` |
| Indicative numbers fully replaced | ✅ | card is server-only |
| **Quote on every cart change** | 🔴 | Deps are `[lines.length, orderType]` (`:43`) — a quantity bump 1→2 leaves `lines.length` unchanged, so **no request is sent**. |
| **Quote on every order-type change** | 🔴 | The guard `quote.isSuccess` (`:40`) short-circuits every run after the first success. Switching DELIVERY→PICKUP **never re-quotes**; the stale delivery fee stays on screen. |
| Debounced | 🔴 | Raw `useEffect`, no debounce. |
| **Inactive-item error handled visibly** | 🔴 | Generic error box only (`:159-166`). |
| **Invalid variant / add-on error handled visibly** | 🔴 | Same generic box. |
| **Offending line marked** | 🔴 | No line-level marking exists anywhere. |
| **Submission blocked until the cart is fixed** | 🔴 | Submit stays enabled (`:221`) and posts regardless of quote state. |
| **Delivery fee appears only for `DELIVERY`** | 🔴 | The row always renders, showing ₹0.00 for pickup/dine-in (`:173-177`). |
| Order-type switch updates the total live | 🔴 | Blocked by the `isSuccess` guard above. |

**Day 6 verdict: the happy path is wired; the entire failure path and the re-quote triggers are not.**

## 6.3 What is still to be achieved

### 6.3.1 🔴 Fix the re-quote effect (highest priority)
`checkout/page.tsx:39-43` has two independent defects. Replace it with a debounced effect keyed on
a **stable serialization** of the request payload, and drop the `isSuccess`/`isPending` guards
(react-query already de-dupes in flight; `isPending` in a dep-guard is a classic stale-closure bug):

- derive `payload = quotePayload(orderType, lines)` and a `JSON.stringify(payload)` signature;
- `useEffect` on `[signature]` → debounce (~300 ms) → `quote.mutate(payload)`;
- keep a ref of the latest signature to drop out-of-order responses.

Verify by: DELIVERY → PICKUP shows the delivery fee row disappear and the total drop; qty 1→2
re-quotes.

### 6.3.2 🔴 Parse quote rejections and mark the offending line
The server sends `details: string[]` in the form `items[2]: "Fiery Pepperoni" is no longer available`
(`order.service.ts:21-51`). Steps:
1. Extend `ApiError.details` handling — it is already `string[]` on the wire
   (`src/lib/api.ts:9,93`), but the MSW mock sends `[{field, message}]` **objects** and the code
   `ORDER_INVALID` instead of the real `VALIDATION_ERROR`. Align the mock to the backend
   (`mocks/handlers.ts:103-119`) so this path is testable at all.
2. Parse `items[<n>]` out of each detail string; group by index.
3. Map index → cart line (`lines[n]`) and render the offending line with an error border +
   reason, plus a banner listing every problem.
4. Keep the detail strings as the human message — the backend already writes them for customers.

### 6.3.3 🔴 Block submission until the cart is fixed
`disabled` on the submit button while `quote.isError` (or while any line is flagged), with a
`role="alert"` banner and a "Fix my cart" link back to `/cart`. Also remove/relocate the offending
line affordance (remove / re-pick) so the user has a path forward.

### 6.3.4 🟠 Delivery fee only for `DELIVERY`
Conditionally render the row on `orderType === "DELIVERY"` (the server returns `"0.00"` otherwise,
`order.service.ts` / mock `:81`). Keep the row's absence explained by the order-type pill being right
there.

### 6.3.5 🟠 Gate submit on quote state
Disabled while `quote.isPending`, `quote.isError`, or missing a quote — instead of rendering `—` in
the label (`checkout/page.tsx:222`).

### 6.3.6 🟠 Debounce
~300 ms trailing, cancelled on unmount, so typing in notes or rapid qty taps do not spam the
endpoint. Skipped for the first quote on mount so the summary appears immediately.

### 6.3.7 🔴 Remove the manual "Refresh quote" button
It exists only to work around 6.3.1. Delete it (`checkout/page.tsx:154,45-49`) once the effect is
correct; keep the retry affordance **only** for genuine transport/5xx failures.

### 6.3.8 🟡 Render the per-line quote breakdown
`QuoteResponse.items` (`contract.ts:104-112`) carries `nameSnapshot`, `variantSnapshot`,
`addOnSnapshot`, `unitPrice`, `lineTotal` — the server's own view of the order. Rendering it next to
the cart lines is the most honest possible summary and makes mismatches obvious to the customer.

⚠️ `QuoteItem` has **no `menuItemId`**, so a successful quote can only be correlated to cart lines by
**array index**, and rejections are positional too. Plan for index-based mapping; do not assume ids.
(Index mapping is also safe because the server rejects the whole quote if any line is bad —
`order.service.ts:63-65` — so a returned `items` array is always the full, in-order set.)

### 6.3.9 🟡 Small item
`quotePayload` sends `variantId: undefined` for standard items (`api/orders.ts:40`). Legal
(`contract.ts:85`, `.strict()` applies at the root only), but consider omitting the key for a
cleaner wire payload.

---

# Cross-cutting frontend notes

1. **Dependencies are not installed.** No `node_modules` at the repo root or in `frontend/`.
   `tsc --noEmit`, `next build`, and `eslint` could **not** be run. Everything above is a static read
   of the source; nothing is runtime-verified. Run `npm install` before starting Day 4 work.
2. **`zod` is in `devDependencies`** (`package.json:32`) but is imported by the shared contract and
   bundled client-side. Move it to `dependencies`. Add `@hookform/resolvers`.
3. **The shared contract is FROZEN** (`shared/contract/contract.ts:4`). No Day 5/6 change may touch
   it — the phone and conditional-address rules must live in frontend code layered on top.
4. **Next 16.3.5 breaking changes.** `frontend/AGENTS.md` requires reading
   `node_modules/next/dist/docs/` before writing code. Heed deprecation notices.
5. **No test runner.** No vitest/jest/playwright in the repo, so all three DoDs are verified by hand.
   Given the Day 6 rejection path is the hardest thing to eyeball, a small Vitest + Testing Library
   setup around `quotePayload`, the `details` parser, and the indicative-price helper would pay for
   itself. Optional, but recommended.
6. **Hydration.** `persist` rehydrates after first paint; the cart badge and cart page can flash
   empty. A `hasHydrated` flag is the clean fix.

---

# Recommended build order

1. **`npm install`** at the repo root; add `@hookform/resolvers`; move `zod` to `dependencies`.
2. **Day 4.3.2** — add `displayName` / `displayPrice` to `CartLine` (everything else on Day 4 and 5
   depends on it; a `migrate`/version bump on the persist payload is needed for existing carts).
3. **Day 4.3.1** — indicative price preview in `ProductModal`.
4. **Day 5.3.6** — indicative subtotal on the cart page.
5. **Day 6.3.1** — fix the quote effect (unblocks 6.3.4, 6.3.5, 6.3.7).
6. **Day 5.3.2–5.3.5** — react-hook-form + Zod on the shared schemas, inline errors, disabled submit,
   `inputMode`.
7. **6.3.2–6.3.3** — rejection parsing, offending-line marking, submit block (align the MSW mock to
   the real backend error shape first).
8. **Day 4.3.3** — inactive-item eviction + toast.
9. **6.3.4 / 6.3.8** — delivery-fee conditionality and the per-line quote breakdown.

---

# Delivery record

> Written after implementation. Everything above is the **pre-work** picture and is kept verbatim as
> the baseline; this section is the "after" state.

## Verification

| Check | Command | Result |
|---|---|---|
| Types | `npx tsc --noEmit` | 0 errors |
| Lint | `npx eslint src --max-warnings=0` | 0 errors, 0 warnings |
| Build | `npx next build` | pass, 10 routes |
| Pure logic | 38 assertions (throwaway script) | 38/38 pass |

The assertion script covered exact-paise money maths, the indicative-price formula, and the
`items[N]` → cart-line-index mapping. It was deleted after the run along with `trace.txt`,
`dev.log`, and `tsconfig.tsbuildinfo`.

> ⚠️ **Not verified:** the rendered flow. `browser.tabs.open` returned
> `[browser.disconnected] No desktop browser is connected to this session`, so no click-through was
> possible. Types/lint/build and the pure-logic assertions pass; the two Day 6 re-quote fixes are
> verified by reading the logic, not by watching the delivery fee disappear.
>
> Manual pass: `cd frontend`, `$env:NEXT_PUBLIC_USE_MOCKS="true"`, `npm run dev`.

## Day 4

- `src/lib/money.ts` rewritten on **integer paise** — `toPaise` / `fromPaise` / `sumMoney` /
  `multiplyMoney`, with `formatINR` formatting from paise. The old `parseFloat` path could render
  `₹339.9999999`.
- New `src/lib/cart/indicative.ts`: pure `(basePrice + priceDelta + Σ addOns) × qty` plus
  variant/add-on label resolution. No React, no store import.
- `CartLine` gains `displayName` / `displayPrice` (unit price) plus optional `variantLabel` /
  `addOnLabels`. **Persist bumped to `version: 2`** with a `migrate` that drops v1 lines — they
  cannot be labelled or priced client-side and Day 6 would reject them anyway, so old carts
  self-heal to empty rather than rendering cuids.
- New `src/hooks/useCartReconcile.ts` + `src/components/ui/ToastProvider.tsx`. The `Toast`
  primitive existed at `LayoutPrimitives.tsx:57` with **zero consumers**, so 4.3.3 had no possible
  path to existing. Eviction is a payload diff against the active menu (the public `MenuItem` has no
  `isActive`), gated on three guards: only after a successful menu load, only on a genuinely new
  payload (`dataUpdatedAt`, so re-renders cannot loop), and never on an empty payload.
- `MAX_LINE_QUANTITY` clamps every path, including a hand-edited `localStorage` payload.
- `OrderTypeSelector` extracted from two duplicated call sites.

## Day 5

- Added `@hookform/resolvers@^5.9.1`; moved `zod` from `devDependencies` to `dependencies`.
- New `src/lib/checkout/schema.ts` layers the two sprint rules over the **frozen** contract via
  `.extend()` / `.superRefine()`: 10-digit Indian mobile reusing `src/lib/phone.ts` (same
  normaliser the submit path uses, so the validated value and the request body cannot disagree), and
  `address` required iff `orderType === "DELIVERY"`. This file is a shim — it collapses to a
  re-export once the contract asks land.
- `checkout/page.tsx` rewritten on `useForm` + `zodResolver`; the 9 `useState`s are gone.
- New `src/components/form/TextField.tsx` (`TextField` / `NumericField`) binds
  `formState.errors` to the existing `Input error` prop and sets `aria-invalid` /
  `aria-describedby` / `inputMode` in one place.
- Submit gated on `isSubmitting || !isValid || quote.isPending || !quote.data || quote.isBlocked`.
- Cart page gained an indicative subtotal, accumulated in paise.

## Day 6

Both core defects traced to one root cause: reading a mutation's **output** (`isSuccess`,
`isPending`) as an **input** guard in a dependency array.

| Bug | Cause | Effect |
|---|---|---|
| No re-quote after first success | `if (quote.isSuccess) return` | DELIVERY → PICKUP kept the ₹30 fee on screen |
| No re-quote on quantity change | effect keyed on `[lines.length, orderType]` | qty 1 → 2 showed a stale total |

- New `src/hooks/useOrderQuote.ts`, keyed on a serialized payload signature. Staleness is resolved by
  comparing react-query's `variables` against what the cart needs now — a mismatched total is never
  rendered and submit stays disabled while it resolves. 300 ms trailing debounce; first quote of a
  session sent immediately. `lastSent` ref resets when the cart empties, so an identical cart after
  a clear cannot reuse a quote the server has not re-confirmed.
- New `src/lib/quote/rejections.ts` parses the real `VALIDATION_ERROR` + `details: string[]` and maps
  `items[N]` back to a cart line **by array index** (the `items[N]:` prefix is load-bearing). Out-of-
  range indices dropped; unattributable failures become a banner, not a phantom line.
- New `src/components/cart/CartLineRow.tsx` marks the offending line and offers removal; submit
  blocked with a "Fix your cart to continue" label.
- New `src/components/quote/QuoteSummary.tsx` renders server numbers only, with the per-line
  breakdown; delivery fee row only for `DELIVERY`. The cart's indicative total is deliberately not
  shown, so there is only ever one price on screen and it is the server's.
- `src/mocks/handlers.ts` realigned to the real backend shape (`VALIDATION_ERROR` +
  `items[N]: …` strings) — the rejection path was previously untestable.

## React Compiler lint violations fixed

4 found, all fixed:

- `ProductModal` reset-effect → keyed remount (`key={selected?.id ?? "no-product"}` in
  `MenuContent`).
- Render-time ref write and `sentSignature` state in `useOrderQuote`.
- `watch()` call in checkout.
- `idempotencyRef` → `useState`.

## Housekeeping

- `public/mockServiceWorker.js` was a CRLF-only change from the install; restored with
  `git checkout` so the diff stays inside `frontend/`.
- `package-lock.json` is gitignored (`.gitignore:16`).
- `next lint` no longer exists in Next 16.3.5 — use `npx eslint src --max-warnings=0`.

---

# Asks for other teams

Nothing below was actioned; these are the changes that need to happen **outside** `frontend/`.

## Shared contract (`shared/contract/contract.ts` — FROZEN, must be unfrozen by its owner)

1. Add a real `indianPhoneSchema` (`^[6-9]\d{9}$`, with `+91` / leading-`0` normalisation). Today it
   is only `z.string().min(10).max(15)` (`contract.ts:141-142`), so the contract is looser than the
   product requires.
2. Make `address` required **iff** `orderType === "DELIVERY"`. Nothing in the contract makes it
   conditional, so both client and server must hand-roll the rule.
3. Confirm whether `phone` should be required for `DINE_IN` (and `PICKUP`). The frontend currently
   requires it for all three modes.
4. Add `menuItemId` to `QuoteItem` (`contract.ts:104-112`). Today a successful quote can only be
   correlated to cart lines by **array index**, which is safe solely because the server rejects the
   whole quote if any line is bad.
5. Consider narrowing `pincode` from `max(10)` to `max(6)`.

## Backend (`backend/src/modules/orders/`)

1. Confirm `VALIDATION_ERROR` + `details: string[]` is stable. `src/lib/quote/rejections.ts` parses
   the `items[N]: …` prefix, so that string shape is a de-facto contract now. Preferred:
   `details: [{ index, code, message }]`.
2. Confirm `GET /api/v1/menu` returns **only active items**. `useCartReconcile` evicts by diffing the
   cart against that payload; if inactive items leak into it, eviction never fires.
3. Flag any `QuoteResponse` shape change. `QuoteSummary` renders `items[]`, `subtotal`,
   `deliveryFee`, `tax`, `total`.

## Database

None needed. `isActive` already exists on the admin contract
(`shared/contract/contract.ts:255-258`); the customer path only needs the server to filter on it.

---

# Still open

1. **No test runner.** Deliberately not added — out of Days 4–6 scope and a new dev dependency. A
   small Vitest + Testing Library suite around `quotePayload`, the `details` parser, and
   `indicative.ts` is the highest-value follow-up.
2. **No browser click-through.** See the warning under *Verification*. Needs a human.
3. **Hydration trade-off.** The cart badge renders `Cart` without a count on the server render and
   the first client render, then fills in once `localStorage` is read. This is the documented
   no-hydration-mismatch approach, but the count appears a beat after paint.
4. **Shim removal.** `src/lib/checkout/schema.ts` and `src/lib/quote/rejections.ts` are workarounds.
   When the contract and backend asks land, the first collapses to a re-export and the second to a
   simple `index → message` map.
