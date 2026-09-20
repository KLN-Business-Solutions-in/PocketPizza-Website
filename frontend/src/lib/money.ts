/**
 * Money helpers — Backend Master Reference §5.12, §10.7, §18.
 * Wire format: decimal strings ("399.00"). Never do float math on money
 * for pricing; display-only parsing is fine. Server is source of truth.
 */

/** Format a decimal-string amount as INR for display. */
export function formatINR(decimalString: string | number): string {
  const n =
    typeof decimalString === "number"
      ? decimalString
      : Number.parseFloat(decimalString);
  if (Number.isNaN(n)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(n);
}

/** Add two decimal strings safely (display/cart estimates only). */
export function addDecimals(a: string, b: string): string {
  const sum = Number.parseFloat(a || "0") + Number.parseFloat(b || "0");
  return sum.toFixed(2);
}

export function isDecimalString(v: unknown): v is string {
  return typeof v === "string" && /^\d+(\.\d{1,2})?$/.test(v);
}
