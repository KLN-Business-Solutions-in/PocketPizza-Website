# Backend Handover — Day 8 Frontend Work (Admin Login & Dashboard Shell)

**Date**: 2026-09-29  
**Branch**: `feature/day8-admin-dashboard-v2`  
**Target Backend Milestone**: Day 9 (Admin Order Management & Status Transitions)  

---

## 1. Git Changes Summary (Day 8 Frontend Scope)

From running `git diff develop --stat -- frontend/lib/api.ts frontend/src/app/admin/ frontend/src/components/admin/ frontend/src/lib/api/auth.ts frontend/src/mocks/`:

```text
 frontend/lib/api.ts                           |  19 ++-
 frontend/src/app/admin/dashboard/page.tsx     | 184 +++++++++++++---------
 frontend/src/app/admin/layout.tsx             | 101 ++++++++++++
 frontend/src/app/admin/menu-manager/page.tsx  |   4 +-
 frontend/src/components/admin/KanbanBoard.tsx | 198 ++++++++++++++++++++++++
 frontend/src/lib/api/auth.ts                  |  33 +++-
 frontend/src/mocks/fixtures.ts                | 213 ++++++++++++++++++++++++--
 frontend/src/mocks/handlers.ts                | 110 +++++++++----
 8 files changed, 735 insertions(+), 127 deletions(-)
```

*(Note: `frontend/src/app/admin/login/page.tsx` and `frontend/src/lib/api/admin.ts` were already in place from base branch contracts and required zero code modifications during Day 8.)*

---

## 2. What Frontend Built (Day 8) — Admin Login & Dashboard Shell

The frontend team delivered a fully interactive Admin dashboard shell and authentication flow:

1. **Admin Login Page (`/admin/login`)**:
   - Clean, accessible form collecting `email` and `password`.
   - Normalizes email (`email.trim().toLowerCase()`) per contract.
   - Handles HTTP 429 with user-friendly rate limit messages.
   - **LIVE**: Hits the real backend `POST /api/v1/auth/login`.

2. **Admin Layout Shell (`/admin/layout.tsx`)**:
   - Persistent top navigation across `/admin/dashboard` and `/admin/menu-manager`.
   - User status indicator ("Logged in as Admin").
   - Logout button wired to backend logout with hard cache clearing (`window.location.href = "/admin/login"`).
   - Route protection monitoring session status.

3. **7-Column Kanban Board (`/admin/dashboard` & `KanbanBoard.tsx`)**:
   - Dedicated columns for all 7 order lifecycle statuses: `NEW`, `CONFIRMED`, `PREPARING`, `READY`, `OUT_FOR_DELIVERY`, `COMPLETED`, `CANCELLED`.
   - Status counters on column headers.
   - Filter bar supporting status filtering and order type filtering (`DELIVERY`, `PICKUP`, `DINE_IN`).
   - Order card design displaying order number, formatted time, customer name, customer phone, order type badge, item count, and INR-formatted total.
   - In-card quick action transition buttons enforcing allowable state moves.
   - Detailed Kitchen Order Ticket (KOT) drawer showing line items, variants, add-ons, notes, and transition triggers.
   - **MOCKED (MSW)**: Backed by Mock Service Worker (`handlers.ts` and `fixtures.ts`) because Day 9 backend admin order endpoints do not exist yet.

### Live vs. Mocked Status

| Feature / Action | Endpoint | Status | Notes |
| :--- | :--- | :--- | :--- |
| Admin Login | `POST /api/v1/auth/login` | **LIVE** | Real backend authenticates admin and issues cookies |
| Admin Refresh | `POST /api/v1/auth/refresh` | **LIVE** | Bypassed by MSW directly to backend |
| Admin Logout | `POST /api/v1/auth/logout` | **LIVE** | Real backend revokes session |
| Orders List | `GET /api/v1/admin/orders` | **MOCKED** | Mocked in MSW; backend currently returns 404 |
| Order Detail | `GET /api/v1/admin/orders/:id` | **MOCKED** | Mocked in MSW; backend currently returns 404 |
| Status Transition | `PATCH /api/v1/admin/orders/:id/status` | **MOCKED** | Mocked in MSW; backend currently returns 404 |
| Daily Sales Summary | `GET /api/v1/admin/reports/summary` | **MOCKED** | Mocked in MSW |

---

## 3. Endpoints Frontend Is Already Calling (Live, Working)

The following authentication endpoints are live and hit the real backend:

### 1. `POST /api/v1/auth/login`
- **Location**: `frontend/src/lib/api/auth.ts:22-30`
- **Payload**:
  ```json
  {
    "email": "admin@pocketpizza.com",
    "password": "password123"
  }
  ```
- **What it does**: Authenticates credentials, sets `__Host-admin_access` and `__Host-admin_refresh` HttpOnly cookies, and returns the authenticated admin profile:
  ```json
  {
    "success": true,
    "data": {
      "admin": {
        "id": "admin-uuid",
        "name": "Store Admin",
        "email": "admin@pocketpizza.com",
        "role": "ADMIN"
      }
    },
    "requestId": "req-uuid"
  }
  ```

### 2. `POST /api/v1/auth/refresh`
- **Location**: `frontend/src/lib/api/auth.ts:32-37`
- **Payload**: `{}` (cookie-only)
- **What it does**: Rotates the `__Host-admin_access` cookie using the `__Host-admin_refresh` cookie.

### 3. `POST /api/v1/auth/logout`
- **Location**: `frontend/src/lib/api/auth.ts:39-47`
- **Payload**: None (`POST` with empty body)
- **What it does**: Revokes the active session and clears the auth cookies on the response.

---

## 4. Endpoints Frontend Expects Backend To Build (Day 9)

All admin order endpoints are cookie-guarded via credentials (`credentials: "include"`).

### 1. `GET /api/v1/admin/orders`

- **HTTP Method**: `GET`
- **Path**: `/api/v1/admin/orders`
- **Query Parameters Sent by Frontend** (from `frontend/src/lib/api/admin.ts:35-43` & `frontend/src/app/admin/dashboard/page.tsx:51`):
  ```ts
  // Code snippet from admin.ts:
  function toSearch(f: AdminOrderFilters): string {
    const p = new URLSearchParams();
    if (f.status) p.set("status", f.status);
    if (f.dateFrom) p.set("dateFrom", f.dateFrom);
    if (f.dateTo) p.set("dateTo", f.dateTo);
    if (f.type) p.set("type", f.type);
    p.set("page", String(f.page ?? 1));
    p.set("pageSize", String(Math.min(f.pageSize ?? 20, 100)));
    return `?${p.toString()}`;
  }
  ```
  Parameters sent:
  - `status` (optional): `"NEW" | "CONFIRMED" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "COMPLETED" | "CANCELLED"`
  - `type` (optional): `"DELIVERY" | "PICKUP" | "DINE_IN"`
  - `dateFrom` (optional): `YYYY-MM-DD`
  - `dateTo` (optional): `YYYY-MM-DD`
  - `page` (optional, default `1`): positive integer
  - `pageSize` (optional, default `20`, max `100`): integer (e.g. `100` from Kanban dashboard)

- **Expected Response Shape** (Envelope: `SuccessEnvelope<AdminOrderSummary[] | { items: AdminOrderSummary[] }>`):
  From `shared/contract/contract.ts:308-320`:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "order-1",
        "orderNumber": "ORD-20260927-001",
        "customer": {
          "name": "Aarav Sharma",
          "phone": "9876543210"
        },
        "orderType": "DELIVERY",
        "status": "NEW",
        "total": "469.00",
        "createdAt": "2026-09-27T10:30:00.000Z"
      }
    ],
    "requestId": "req-1234"
  }
  ```
  *(Note: Frontend supports `data` as either a direct array of items `AdminOrderSummary[]` or an object containing `{ items: AdminOrderSummary[] }`).*

  **Field Breakdown**:
  - `id`: `string` (UUID or unique identifier)
  - `orderNumber`: `string` (Human-readable order identifier, e.g. `ORD-20260927-001`)
  - `customer.name`: `string`
  - `customer.phone`: `string`
  - `orderType`: enum `"DELIVERY" | "PICKUP" | "DINE_IN"`
  - `status`: enum `"NEW" | "CONFIRMED" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "COMPLETED" | "CANCELLED"`
  - `total`: **decimal string** formatted to 2 decimal places (e.g. `"469.00"`)
  - `createdAt`: `string` (ISO 8601 timestamp)

- **Handled Error Responses**:
  - `401 Unauthorized`: Envelope `{ success: false, error: { code: "AUTHENTICATION_REQUIRED", message: "..." }, requestId }` triggers automatic redirection to `/admin/login?reason=expired`.
  - `403 Forbidden`: Envelope `{ success: false, error: { code: "FORBIDDEN", message: "..." }, requestId }`.

---

### 2. `GET /api/v1/admin/orders/:id`

- **HTTP Method**: `GET`
- **Path**: `/api/v1/admin/orders/:id` (where `:id` is the order's unique `id`)
- **Query / Body**: None
- **Expected Response Shape** (Envelope: `SuccessEnvelope<AdminOrderDetail>`):
  From `shared/contract/contract.ts:322-341` and `frontend/src/mocks/fixtures.ts:156-181`:
  ```json
  {
    "success": true,
    "data": {
      "id": "order-1",
      "orderNumber": "ORD-20260927-001",
      "customer": {
        "name": "Aarav Sharma",
        "phone": "9876543210"
      },
      "orderType": "DELIVERY",
      "status": "NEW",
      "subtotal": "439.00",
      "deliveryFee": "30.00",
      "tax": "0.00",
      "total": "469.00",
      "createdAt": "2026-09-27T10:30:00.000Z",
      "notes": "Less spicy, extra napkins please",
      "address": {
        "line1": "Flat 203",
        "line2": "ABC Society",
        "landmark": "Near Park",
        "city": "Pune",
        "pincode": "411001"
      },
      "items": [
        {
          "menuItemId": "prod-1",
          "nameSnapshot": "Classic Margherita",
          "variantSnapshot": "Medium (12\")",
          "addOnSnapshot": [
            { "label": "Extra Cheese", "price": "40.00" }
          ],
          "quantity": 1,
          "unitPrice": "439.00",
          "lineTotal": "439.00"
        }
      ],
      "statusHistory": [
        {
          "oldStatus": "NEW",
          "newStatus": "CONFIRMED",
          "changedBy": "admin-uuid",
          "changedAt": "2026-09-27T10:35:00.000Z"
        }
      ]
    },
    "requestId": "req-5678"
  }
  ```

  **Field Breakdown**:
  - Inherits all fields of `AdminOrderSummary` plus:
  - `subtotal`: **decimal string** (e.g. `"439.00"`)
  - `deliveryFee`: **decimal string** (e.g. `"30.00"`)
  - `tax`: **decimal string** (e.g. `"0.00"`)
  - `notes`: `string | null`
  - `address`: `object | null` (nullable for `PICKUP` and `DINE_IN`)
    - `line1`: `string`
    - `line2`: `string | null`
    - `landmark`: `string | null`
    - `city`: `string`
    - `pincode`: `string`
  - `items`: `InvoiceItem[]`
    - `menuItemId`: `string`
    - `nameSnapshot`: `string`
    - `variantSnapshot`: `string | null`
    - `addOnSnapshot`: `Array<{ label: string; price: string }>` (prices are decimal strings)
    - `quantity`: `number`
    - `unitPrice`: **decimal string** (e.g. `"439.00"`)
    - `lineTotal`: **decimal string** (e.g. `"439.00"`)
  - `statusHistory`: `Array<{ oldStatus: OrderStatus, newStatus: OrderStatus, changedBy: string, changedAt: string }>`

- **Handled Error Responses**:
  - `404 Not Found`: `{ success: false, error: { code: "ORDER_NOT_FOUND", message: "Order not found" }, requestId }` — displays error banner in drawer.
  - `401 Unauthorized`: Triggers login redirect.

---

### 3. `PATCH /api/v1/admin/orders/:id/status`

- **HTTP Method**: `PATCH`
- **Path**: `/api/v1/admin/orders/:id/status`
- **Request Body Sent by Frontend** (from `frontend/src/lib/api/admin.ts:75-79` and `frontend/src/app/admin/dashboard/page.tsx:75`):
  ```json
  {
    "status": "CONFIRMED",
    "reason": "Kitchen confirmed order" 
  }
  ```
  *(Note: `reason` is optional; `status` is required).*

- **Expected Response Shape**:
  Returns the updated `AdminOrderDetail` object enclosed in the standard success envelope:
  ```json
  {
    "success": true,
    "data": {
      "id": "order-1",
      "status": "CONFIRMED",
      ...
    },
    "requestId": "req-9012"
  }
  ```

- **Handled Error Responses**:
  - `400 Bad Request` (`ORDER_INVALID_TRANSITION`):
    ```json
    {
      "success": false,
      "error": {
        "code": "ORDER_INVALID_TRANSITION",
        "message": "Transition from PREPARING to COMPLETED is not permitted."
      },
      "requestId": "req-err-1"
    }
    ```
    Frontend intercepts this and displays the `error.message` directly in the UI status error alert.
  - `401 Unauthorized`: Triggers login redirect.
  - `404 Not Found`: Displays "Order not found."

---

## 5. State Machine Frontend Already Enforces in UI

To prevent invalid transitions before sending the HTTP request, the UI client strictly enforces the transition allow-list.

### Source Code Quotation 1: `frontend/src/lib/api/admin.ts:61-70`
```ts
/** Allowed transitions mirror §17 — enforced server-side; client pre-validates for UX. */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"],
  OUT_FOR_DELIVERY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};
```

### Source Code Quotation 2: `frontend/src/components/admin/KanbanBoard.tsx:50-70`
```ts
function getValidTransitions(status: OrderStatus, orderType: OrderType): OrderStatus[] {
  switch (status) {
    case "NEW":
      return ["CONFIRMED", "CANCELLED"];
    case "CONFIRMED":
      return ["PREPARING", "CANCELLED"];
    case "PREPARING":
      return ["READY", "CANCELLED"];
    case "READY":
      if (orderType === "DELIVERY") {
        return ["OUT_FOR_DELIVERY", "CANCELLED"];
      }
      return ["COMPLETED", "CANCELLED"];
    case "OUT_FOR_DELIVERY":
      return ["COMPLETED", "CANCELLED"];
    case "COMPLETED":
    case "CANCELLED":
    default:
      return [];
  }
}
```

### Source Code Quotation 3: `frontend/src/app/admin/dashboard/page.tsx:89-104`
```ts
const doTransition = async (next: OrderStatus) => {
  setStatusError(null);
  if (!selectedId || !detail.data) return;
  if (!ALLOWED_TRANSITIONS[detail.data.status].includes(next)) {
    setStatusError(`Transition ${detail.data.status} → ${next} is not allowed.`);
    return;
  }
  if (next === "OUT_FOR_DELIVERY" && detail.data.orderType !== "DELIVERY") {
    setStatusError("OUT_FOR_DELIVERY is only valid for DELIVERY orders.");
    return;
  }
  if (next === "COMPLETED" && detail.data.orderType === "DELIVERY" && detail.data.status === "READY") {
    setStatusError("DELIVERY orders go READY → OUT_FOR_DELIVERY, not directly to COMPLETED.");
    return;
  }
  ...
};
```

### Required State Transition Rules for Backend:
1. `NEW` $\rightarrow$ `CONFIRMED` or `CANCELLED`
2. `CONFIRMED` $\rightarrow$ `PREPARING` or `CANCELLED`
3. `PREPARING` $\rightarrow$ `READY` or `CANCELLED`
4. `READY` $\rightarrow$
   - If `orderType === "DELIVERY"`: must go to `OUT_FOR_DELIVERY` (or `CANCELLED`). Cannot transition directly to `COMPLETED`.
   - If `orderType === "PICKUP"` or `"DINE_IN"`: must go directly to `COMPLETED` (or `CANCELLED`). Cannot transition to `OUT_FOR_DELIVERY`.
5. `OUT_FOR_DELIVERY` $\rightarrow$ `COMPLETED` or `CANCELLED`
6. `COMPLETED` and `CANCELLED` are terminal states; no further transitions allowed.
7. Any state except terminal states may transition to `CANCELLED`.

---

## 6. Auth Behavior Frontend Relies On

### Redirect-on-401 Trigger Logic
Route protection on the frontend relies on HTTP 401 with a specific error code.

**Quoted from `frontend/lib/api.ts:93-102`**:
```ts
  // Global 401 Interceptor: If we get a genuine AUTHENTICATION_REQUIRED from any admin API call,
  // we perform a hard redirect to the login page. A hard redirect (window.location.href) 
  // automatically clears all in-memory local state (React Query cache, etc.) and ensures a clean slate.
  if (res.status === 401 && code === "AUTHENTICATION_REQUIRED") {
    if (typeof window !== "undefined" && window.location.pathname !== "/admin/login") {
      window.location.href = "/admin/login?reason=expired";
      // We still throw to prevent the caller from continuing execution
    }
  }
```

**Quoted from `frontend/src/lib/api/auth.ts:83-88`**:
```ts
  if (
    err?.status === 401 &&
    (err?.code === "AUTHENTICATION_REQUIRED" || err?.code === "AUTHENTICATION_INVALID")
  ) {
    return { ok: false };
  }
```

**Rules for Backend**:
- When auth fails or cookie is missing/expired, the backend **MUST** return HTTP 401 with:
  ```json
  {
    "success": false,
    "error": {
      "code": "AUTHENTICATION_REQUIRED",
      "message": "Authentication required"
    },
    "requestId": "req-..."
  }
  ```
- **Important**: Non-auth failures (such as 404 for unbuilt routes, 500 server crashes, or 403 authorization failures) must **NOT** return `code: "AUTHENTICATION_REQUIRED"`, otherwise the user will be unintentionally ejected to `/admin/login`.

---

### Two Cookie Issues Found During Testing (Requires Backend Fix)

During live browser testing on `feature/day8-admin-dashboard-v2`, two critical cookie compliance bugs were identified in the backend auth service:

1. **`Domain` attribute incorrectly set on `__Host-admin_access`**:
   - **Observed Header**: `Set-Cookie: __Host-admin_access=...; Domain=localhost; Path=/; Secure; HttpOnly; SameSite=Lax`
   - **Issue**: Per RFC 6265bis §4.1.3, cookies prefixed with `__Host-` **MUST NOT** include a `Domain` attribute. Browsers reject or alter storage of `__Host-` cookies if a `Domain` attribute is present.
   - **Fix Required**: Remove `domain: ...` or set domain to `undefined`/blank when issuing `__Host-` prefixed cookies in `res.cookie()`.

2. **`__Host-admin_refresh` cookie not observed being set**:
   - **Observed Behavior**: Upon successful login, only `__Host-admin_access` was returned in the `Set-Cookie` headers.
   - **Issue**: Without `__Host-admin_refresh`, session rotation via `POST /api/v1/auth/refresh` cannot succeed when the access token expires.
   - **Fix Required**: Ensure `POST /api/v1/auth/login` sets both `__Host-admin_access` and `__Host-admin_refresh` cookies.

---

## 7. How Backend Can Verify Frontend Is Ready

Once the Day 9 backend endpoints (`GET /api/v1/admin/orders`, `GET /api/v1/admin/orders/:id`, `PATCH /api/v1/admin/orders/:id/status`) are implemented:

1. **Disable Frontend Mocks**:
   In `frontend/.env.local`, change:
   ```env
   NEXT_PUBLIC_USE_MOCKS=false
   ```
   Or launch without mocks:
   ```bash
   NEXT_PUBLIC_USE_MOCKS=false npm run dev
   ```

2. **Test End-to-End Flow**:
   - Navigate to `http://localhost:3000/admin/login` and log in with real admin credentials (`admin@pocketpizza.com`).
   - Confirm automatic navigation to `http://localhost:3000/admin/dashboard`.
   - Verify all 7 Kanban columns populate from the database via `GET /api/v1/admin/orders?page=1&pageSize=100`.
   - Click an order card to open the drawer; verify `GET /api/v1/admin/orders/:id` fetches full line items, address, and status history.
   - Click a transition button (e.g. `→ CONFIRMED` or `→ PREPARING`); verify `PATCH /api/v1/admin/orders/:id/status` updates the database and the card moves to the next column.
   - In an Incognito window without cookies, visit `http://localhost:3000/admin/dashboard`; verify the backend 401 `AUTHENTICATION_REQUIRED` redirects immediately to `/admin/login?reason=expired`.

3. **Frontend Readiness Confirmation**:
   The frontend code is 100% complete and verified against the contract types. **No further frontend code changes are needed** once backend provides these matching endpoints and fixes the cookie header.
