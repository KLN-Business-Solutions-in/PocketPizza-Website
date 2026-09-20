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
