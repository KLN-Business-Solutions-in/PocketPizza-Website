/**
 * Money helpers — Backend Master Reference §5.12, §10.7, §18.
 * Wire format: decimal strings ("399.00"). Indicative UI math uses integer
 * paise to avoid float rounding; the server remains the pricing authority.
 */

function toPaise(value: string | number | undefined): number {
  if (typeof value === "number") return Math.round(value * 100);

  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec((value ?? "").trim());
  if (!match) return 0;

  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(2, "0"));
  return whole * 100 + fraction;
}

function fromPaise(paise: number): string {
  return (paise / 100).toFixed(2);
}

/** Format a decimal-string amount as INR for display. */
export function formatINR(decimalString: string | number): string {
  const paise = toPaise(decimalString);
  const n = Number.isFinite(paise) ? paise / 100 : 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(n);
}

/** Add two decimal strings safely (display/cart estimates only). */
export function addDecimals(a: string, b: string): string {
  return fromPaise(toPaise(a) + toPaise(b));
}

/** Indicative unit price for a customised item; never sent to the server. */
export function calculateIndicativeUnitPrice(
  basePrice: string,
  priceDelta: string | undefined,
  addOnPrices: string[] = []
): string {
  const withVariant = toPaise(basePrice) + toPaise(priceDelta);
  const total = addOnPrices.reduce((sum, addOnPrice) => sum + toPaise(addOnPrice), withVariant);
  return fromPaise(total);
}

/** Indicative line total for display only; checkout still sends no price. */
export function calculateIndicativeTotal(unitPrice: string, quantity: number): string {
  return fromPaise(toPaise(unitPrice) * Math.max(0, Math.floor(quantity)));
}

export function isDecimalString(v: unknown): v is string {
  return typeof v === "string" && /^\d+(\.\d{1,2})?$/.test(v);
}