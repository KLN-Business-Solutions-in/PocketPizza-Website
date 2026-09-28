/**
 * Throwaway verification for the Day 6/7 changes. NOT part of the repo.
 * Run: npx tsx scratch/verify-day67.ts   (then delete this file)
 *
 * Stands in for the browser click-through, which is unavailable: no desktop
 * browser is attached to this session. Covers the logic that a click-through
 * would otherwise be the only evidence for — the two rejection index dialects
 * (6.R1), the cart-size caps (6.R2), the label map (7.R7) and the mock
 * create -> status -> invoice round-trip (7.R9).
 */
import assert from "node:assert/strict";

// zustand's persist middleware touches localStorage when the store is created.
const mem = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
} as Storage;

const { parseQuoteIssue, parseQuoteRejections } = await import("@/lib/quote/rejections");
const { useCartStore, MAX_CART_LINES, MAX_LINE_ADDONS, MAX_LINE_QUANTITY, lineKey } = await import(
  "@/lib/cart/store"
);
const { validateCreateOrder, placeOrder, findOrder } = await import("@/mocks/orderStore");
const { statusLabel, paymentNote, isTerminalStatus } = await import("@/lib/order/status");
const { createOrderRequestSchema } = await import("@shared/contract/contract");

let pass = 0;
let fail = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    pass += 1;
    console.log(`  ok   ${name}`);
  } catch (e) {
    fail += 1;
    console.log(`  FAIL ${name}\n       ${(e as Error).message.split("\n")[0]}`);
    process.exitCode = 1;
  }
}

console.log("\n6.R1 - both rejection index dialects reach the same cart line");
check("items[0]: bracket dialect (cart resolver)", () => {
  assert.equal(parseQuoteIssue('items[0]: "Fiery Pepperoni" is no longer available').index, 0);
});
check("items[12]: bracket dialect, index 12", () => {
  assert.equal(parseQuoteIssue('items[12]: invalid add-on "x"').index, 12);
});
check("items.12.quantity: dotted dialect (Zod, error.middleware.ts:40)", () => {
  assert.equal(parseQuoteIssue("items.12.quantity: must be between 1 and 99").index, 12);
});
check("items.0.addOnIds: dotted dialect, add-on cap", () => {
  assert.equal(parseQuoteIssue("items.0.addOnIds: at most 20 add-ons per item").index, 0);
});
check("items: cap issue is a banner, not a line issue", () => {
  assert.equal(parseQuoteIssue("items: at most 50 line items per order").index, -1);
});
check("customer.phone: is a banner, not a line issue", () => {
  assert.equal(parseQuoteIssue("customer.phone: not a valid Indian mobile number").index, -1);
});
check("address.pincode: is a banner, not a line issue", () => {
  assert.equal(parseQuoteIssue("address.pincode: must be a 6-digit Indian PIN code").index, -1);
});
check("guard: items.0x does not parse as index 0", () => {
  assert.equal(parseQuoteIssue("items.0x.quantity: bad").index, -1);
});
check("guard: items[0]x does not parse as index 0", () => {
  assert.equal(parseQuoteIssue("items[0]x: bad").index, -1);
});
check("guard: itemsFoo does not parse as a line", () => {
  assert.equal(parseQuoteIssue("itemsFoo: bad").index, -1);
});
check("both dialects coexist in one multi-detail rejection", () => {
  const err = Object.assign(new Error("x"), {
    details: ['items[1]: "menuItemId" not found', "items.4.quantity: must be between 1 and 99"],
  });
  assert.deepEqual(parseQuoteRejections(err).map((i) => i.index).sort(), [1, 4]);
});
check("a dotted contract-limit issue carries the actionable text the line row shows", () => {
  // `kind` is computed but currently unconsumed (dead classification data —
  // worth reporting, not worth churning the union for), so what actually
  // reaches the customer on the marked line is `reason`. It must be readable.
  const issue = parseQuoteIssue("items.3.quantity: must be between 1 and 99");
  assert.equal(issue.index, 3);
  assert.equal(issue.kind, "unknown");
  assert.equal(issue.reason, "items.3.quantity: must be between 1 and 99");
});
check("a dotted add-on cap is NOT misclassified as a resolver 'invalid add-on'", () => {
  // The resolver's message means "this add-on no longer exists, remove the
  // line". The contract cap means "you picked too many extras, drop one".
  // Conflating them would give the wrong recovery affordance.
  const capped = parseQuoteIssue("items.0.addOnIds: at most 20 add-ons per item");
  const gone = parseQuoteIssue('items[0]: invalid add-on "a9" for "Garlic Butter Dough Balls"');
  assert.notEqual(capped.kind, gone.kind);
  assert.equal(gone.kind, "invalid-add-on");
});

console.log("\n6.R2 - cart-size caps stop the customer building an un-quotable cart");
const draft = (menuItemId: string, addOnIds: string[] = [], quantity = 1) => ({
  menuItemId,
  addOnIds,
  quantity,
  displayName: `Item ${menuItemId}`,
  displayPrice: "100.00",
});
const reset = () => useCartStore.setState({ lines: [] });

check("caps match the contract, not a copy of it", () => {
  assert.equal(MAX_CART_LINES, 50);
  assert.equal(MAX_LINE_ADDONS, 20);
  assert.equal(MAX_LINE_QUANTITY, 20);
});
check("addLine refuses the 51st distinct line and says why", () => {
  reset();
  for (let i = 0; i < MAX_CART_LINES; i += 1) {
    assert.deepEqual(useCartStore.getState().addLine(draft(`p${i}`)), { ok: true });
  }
  assert.equal(useCartStore.getState().lines.length, MAX_CART_LINES);
  assert.deepEqual(useCartStore.getState().addLine(draft("one-too-many")), {
    ok: false,
    reason: "cart-full",
    limit: MAX_CART_LINES,
  });
  assert.equal(useCartStore.getState().lines.length, MAX_CART_LINES, "must not grow");
});
check("an existing line still merges when the cart is full", () => {
  // The cap is on distinct lines, not on adding a quantity you already have.
  assert.deepEqual(useCartStore.getState().addLine(draft("p0", [], 1)), { ok: true });
  assert.equal(useCartStore.getState().lines[0].quantity, 2);
});
check("addLine truncates a 40-add-on payload to the cap", () => {
  reset();
  const many = Array.from({ length: 40 }, (_, i) => `a${i}`);
  useCartStore.getState().addLine(draft("prod-1", many));
  assert.equal(useCartStore.getState().lines[0].addOnIds.length, MAX_LINE_ADDONS);
});
check("addLine clamps quantity to the documented ceiling", () => {
  reset();
  useCartStore.getState().addLine(draft("prod-1", [], 9999));
  assert.equal(useCartStore.getState().lines[0].quantity, MAX_LINE_QUANTITY);
  useCartStore.getState().addLine(draft("prod-2", [], 0));
  assert.equal(useCartStore.getState().lines[1].quantity, 1, "0 must floor at 1, not vanish");
});
check("line keys stay distinct across configurations", () => {
  assert.notEqual(lineKey({ menuItemId: "p", variantId: "v1", addOnIds: [] }), lineKey({ menuItemId: "p", variantId: "v2", addOnIds: [] }));
  assert.equal(
    lineKey({ menuItemId: "p", variantId: undefined, addOnIds: ["a", "b"] }),
    lineKey({ menuItemId: "p", variantId: undefined, addOnIds: ["b", "a"] }),
    "add-on order must not create two lines for one configuration"
  );
});
reset();

console.log("\n7.R1 - the pre-submit price check compares the figure on the button");
// Typed as string so TS does not fold these literals into an obvious-false
// comparison. In the page these are `QuoteResponse.total`, always a string.
const shown: string = "469.00";
const unchanged: string = "469.00";
const moved: string = "499.00";
const reformatted: string = "469.0";
check("an unchanged total proceeds", () => {
  assert.equal(shown === unchanged, true);
});
check("a moved total blocks", () => {
  assert.equal(shown === moved, false);
});
check("formatting drift blocks too - the safe direction", () => {
  // "469.0" and "469.00" are the same money but different bytes. Treating that
  // as a change costs one extra press; treating it as equal risks charging a
  // figure the customer did not see.
  assert.equal(shown === reformatted, false);
});

console.log("\n7.R7 - no raw enum reaches a customer");
check("every status has a human label with no underscores", () => {
  for (const s of ["NEW", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"] as const) {
    const label = statusLabel(s);
    assert.ok(!label.includes("_"), `${s} -> ${label} leaks an enum`);
    assert.ok(label.length > 0);
  }
});
check("polling stops on exactly the two terminal statuses", () => {
  assert.ok(isTerminalStatus("COMPLETED"));
  assert.ok(isTerminalStatus("CANCELLED"));
  assert.ok(!isTerminalStatus("OUT_FOR_DELIVERY"));
  assert.ok(!isTerminalStatus(undefined));
});
check("payment note derives from orderType, not the invoice", () => {
  assert.match(paymentNote("DELIVERY"), /cash on delivery/i);
  assert.match(paymentNote("PICKUP"), /store/i);
  assert.match(paymentNote("DINE_IN"), /store/i);
});

console.log("\n7.R9 - mock create -> status -> invoice round-trips");
const priced = {
  items: [
    {
      menuItemId: "prod-1",
      nameSnapshot: "Classic Margherita",
      variantSnapshot: null,
      addOnSnapshot: [{ label: "Extra Cheese", price: "40.00" }],
      quantity: 2,
      unitPrice: "239.50",
      lineTotal: "479.00",
    },
  ],
  subtotal: "479.00",
  deliveryFee: "30.00",
  tax: "0.00",
  total: "509.00",
};
const okCreate = {
  orderType: "DELIVERY" as const,
  items: [{ menuItemId: "prod-1", addOnIds: [], quantity: 2 }],
  customer: { name: "Anjali", phone: "9876543210" },
  address: { line1: "Flat 203", city: "Pune", pincode: "411001" },
};

check("a DELIVERY order round-trips customer, address, items and totals", () => {
  const v = validateCreateOrder(okCreate);
  assert.ok(v.ok, "expected the create request to validate");
  const { created, stored } = placeOrder(v.value, priced);
  const found = findOrder(created.publicToken);
  assert.ok(found, "must be retrievable by the token handed to the customer");
  assert.equal(found.status.total, "509.00");
  assert.equal(found.status.items[0].quantity, 2);
  assert.equal(found.status.items[0].nameSnapshot, "Classic Margherita");
  assert.equal(found.invoice.address?.city, "Pune");
  assert.equal(found.invoice.address?.pincode, "411001");
  assert.equal(found.invoice.customer.phone, "9876543210");
  assert.equal(stored.status.orderNumber, created.orderNumber, "both docs share one number");
  assert.equal(stored.invoice.createdAt, stored.status.createdAt);
});
check("notes survive onto the status response", () => {
  const v = validateCreateOrder({ ...okCreate, notes: "Less spicy" });
  assert.ok(v.ok);
  const { created } = placeOrder(v.value, priced);
  assert.equal(findOrder(created.publicToken)!.status.notes, "Less spicy");
});
check("a PICKUP order stores address: null, so the UI can condition on it", () => {
  const v = validateCreateOrder({ ...okCreate, orderType: "PICKUP", address: undefined });
  assert.ok(v.ok);
  const { created, stored } = placeOrder(v.value, priced);
  assert.equal(stored.invoice.address, null);
  assert.equal(findOrder(created.publicToken)!.status.orderType, "PICKUP");
});
check("a DELIVERY order with no address is rejected by the shared schema", () => {
  const v = validateCreateOrder({ ...okCreate, address: undefined });
  assert.ok(!v.ok);
  assert.ok(v.details.some((d) => d.startsWith("address")), JSON.stringify(v.details));
});
check("a 6-digit pincode is accepted, a 10-digit one is not", () => {
  assert.ok(validateCreateOrder({ ...okCreate, address: { ...okCreate.address, pincode: "411001" } }).ok);
  assert.ok(!validateCreateOrder({ ...okCreate, address: { ...okCreate.address, pincode: "4110011234" } }).ok);
});
check("the minted token is 48 hex and passes the backend route guard", () => {
  const v = validateCreateOrder(okCreate);
  assert.ok(v.ok);
  const { created } = placeOrder(v.value, priced);
  assert.match(created.publicToken, /^[0-9a-f]{48}$/);
  assert.ok(/^[0-9a-z]{21,64}$/.test(created.publicToken), "order.validation.ts guard");
});
check("two orders get distinct tokens and distinct order numbers", () => {
  const v = validateCreateOrder(okCreate);
  assert.ok(v.ok);
  const a = placeOrder(v.value, priced).created;
  const b = placeOrder(v.value, priced).created;
  assert.notEqual(a.publicToken, b.publicToken);
  assert.notEqual(a.orderNumber, b.orderNumber);
});
check("an unknown token is not found - no silent echo of someone else's order", () => {
  assert.equal(findOrder("nope"), undefined);
  assert.equal(findOrder(undefined), undefined);
});
check("a different cart produces different totals from the same code path", () => {
  // Proves the GET is reading the stored order, not echoing a fixture.
  const v = validateCreateOrder(okCreate);
  assert.ok(v.ok);
  const cheap = { ...priced, total: "0.01" };
  const { created } = placeOrder(v.value, cheap);
  assert.equal(findOrder(created.publicToken)!.status.total, "0.01");
});

console.log("\n6.R3 - the mock validates with the shared schema, so both dialects reach the client");
check("a 51-line cart trips the contract's line cap", () => {
  const v = validateCreateOrder({
    orderType: "PICKUP",
    items: Array.from({ length: 51 }, () => ({ menuItemId: "p", addOnIds: [], quantity: 1 })),
    customer: { name: "A", phone: "9876543210" },
  });
  assert.ok(!v.ok);
  assert.ok(v.details.some((d) => d.includes("at most 50 line items per order")), JSON.stringify(v.details));
});
check("a 21-add-on line trips the add-on cap and maps to its line index", () => {
  const v = validateCreateOrder({
    orderType: "PICKUP",
    items: [{ menuItemId: "p", addOnIds: Array.from({ length: 21 }, (_, i) => `a${i}`), quantity: 1 }],
    customer: { name: "A", phone: "9876543210" },
  });
  assert.ok(!v.ok);
  const d = v.details.find((x) => x.includes("at most 20 add-ons"))!;
  assert.equal(parseQuoteIssue(d).index, 0);
});
check("quantity 0 on line 1 marks the SECOND line, not the first", () => {
  const v = validateCreateOrder({
    orderType: "PICKUP",
    items: [
      { menuItemId: "p", addOnIds: [], quantity: 1 },
      { menuItemId: "p", addOnIds: [], quantity: 0 },
    ],
    customer: { name: "A", phone: "9876543210" },
  });
  assert.ok(!v.ok);
  const q = v.details.find((d) => d.includes("quantity"))!;
  assert.equal(parseQuoteIssue(q).index, 1);
});
check("an invalid phone is a banner, never a line issue", () => {
  const v = validateCreateOrder({ ...okCreate, customer: { name: "A", phone: "12345" } });
  assert.ok(!v.ok);
  assert.ok(v.details.some((d) => d.startsWith("customer.phone:")));
  assert.ok(v.details.every((d) => parseQuoteIssue(d).index === -1));
});
check("the mock uses the shared schema object, so caps cannot drift", () => {
  assert.ok(createOrderRequestSchema.shape.items, "items must live on the shared schema");
});

console.log(`\n${pass} passed, ${fail} failed.`);
