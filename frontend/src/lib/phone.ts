/**
 * Indian phone normalization — mirrors backend §5.13.
 * Strips spaces/dashes, leading 0, +91 / 91. Returns 10-digit string.
 */
export function normalizeIndianPhone(raw: string): string {
  let s = (raw || "").replace(/[\s\-()]/g, "");
  if (s.startsWith("+91")) s = s.slice(3);
  else if (s.startsWith("91") && s.length === 12) s = s.slice(2);
  else if (s.startsWith("0") && s.length === 11) s = s.slice(1);
  if (!/^[6-9]\d{9}$/.test(s)) {
    throw new Error("Enter a valid 10-digit Indian mobile number.");
  }
  return s;
}

export function isValidIndianPhone(raw: string): boolean {
  try {
    normalizeIndianPhone(raw);
    return true;
  } catch {
    return false;
  }
}

/**
 * Display-only mask: "+91 •••••• 3210". The raw number never needs to be
 * shown on confirmation screens — only enough digits to recognise it.
 * Mirrors the backend's maskDestination.
 */
export function maskIndianPhone(raw: string | null | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length < 4) return null;
  return `+91 \u2022\u2022\u2022\u2022\u2022\u2022 ${digits.slice(-4)}`;
}
