/**
 * Money helpers — Backend Master Reference §5.12, §10.7, §18.
 * Wire format: decimal strings ("399.00"). Never do float math on money
 * for pricing; display-only parsing is fine. Server is source of truth.
 *
 * Day 4/5 introduce an *indicative* price the customer sees while choosing.
 * That maths is still done in integer paise (not floats) so a cart never shows
 * "₹339.9999999". It is INDICATIVE ONLY — the server re-prices every order on
 * Day 6 (§16.2) and the checkout summary always shows server numbers.
 */

/** Integer minor units per rupee. */
const PAISE_PER_RUPEE = 100;

/** Accepts the contract's money format: unsigned, at most 2 decimal places. */
const DECIMAL_RE = /^\s*(\d+)(?:\.(\d{1,2}))?\s*$/;

/** Parse a decimal string (or number) into integer paise. Invalid input ⇒ 0. */
export function toPaise(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return 0;
    return Math.round(value * PAISE_PER_RUPEE);
  }
  const match = DECIMAL_RE.exec(value ?? "");
  if (!match) return 0;
  const whole = Number(match[1]);
  const frac = Number((match[2] ?? "").padEnd(2, "0"));
  return whole * PAISE_PER_RUPEE + frac;
}

/** Render integer paise back into the contract's decimal string. */
export function fromPaise(paise: number): string {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(Math.round(paise));
  const rupees = Math.floor(abs / PAISE_PER_RUPEE);
  const remainder = abs % PAISE_PER_RUPEE;
  return `${sign}${rupees}.${String(remainder).padStart(2, "0")}`;
}

/** Exact sum of decimal strings. */
export function sumMoney(values: readonly (string | number | null | undefined)[]): string {
  return fromPaise(values.reduce<number>((total, value) => total + toPaise(value), 0));
}

/** Exact multiplication of a money value by an integer factor. */
export function multiplyMoney(value: string | number, factor: number): string {
  return fromPaise(Math.round(toPaise(value) * factor));
}

/** Add two decimal strings safely (indicative display only). */
export function addDecimals(a: string, b: string): string {
  return sumMoney([a, b]);
}

/** Format a decimal-string amount as INR for display. */
export function formatINR(decimalString: string | number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toPaise(decimalString) / PAISE_PER_RUPEE);
}

export function isDecimalString(v: unknown): v is string {
  return typeof v === "string" && /^\d+(\.\d{1,2})?$/.test(v);
}
