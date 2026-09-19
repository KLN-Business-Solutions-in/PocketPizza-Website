export function normalizeIndianPhone(raw: string): string {
  let cleaned = raw.replace(/[\s\-()]/g, '');

  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  if (!/^[6-9]\d{9}$/.test(cleaned)) {
    throw new Error(`Invalid Indian phone number: ${raw}`);
  }

  return cleaned;
}
