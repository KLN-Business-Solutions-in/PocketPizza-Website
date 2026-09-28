import type { ApiError } from "@/lib/api/client";

/**
 * Day 6: quote rejection handling.
 *
 * The backend rejects the whole quote with 400 VALIDATION_ERROR and a
 * `details: string[]`, one entry per offending line, shaped by
 * `backend/src/modules/orders/order.service.ts` as:
 *
 *   items[0]: "Fiery Pepperoni" is no longer available
 *   items[2]: invalid variant for "Classic Margherita"
 *   items[3]: invalid add-on "a9" for "Garlic Butter Dough Balls"
 *
 * A rejected quote returns no items at all — `QuoteItem.menuItemId` only
 * arrives with a successful response — so the ONLY way to correlate a rejection
 * to a cart line is by array index into the request payload we sent. That is
 * safe because the server rejects the entire quote if any single line is bad,
 * so a successful response is always the full, in-order set.
 */

export type QuoteIssue = {
  /** Index into the quote request's `items` array. */
  index: number;
  /** The raw detail string, written by the backend for a human to read. */
  reason: string;
  /** Coarse classification, used to pick the recovery affordance. */
  kind: "inactive" | "invalid-variant" | "invalid-add-on" | "unknown";
};

const INDEX_RE = /^items\[(\d+)\]/;

export function parseQuoteIssue(detail: string): QuoteIssue {
  const match = INDEX_RE.exec(detail.trim());
  const index = match ? Number(match[1]) : -1;
  const lower = detail.toLowerCase();
  let kind: QuoteIssue["kind"] = "unknown";
  if (lower.includes("no longer available") || lower.includes("not found")) {
    kind = "inactive";
  } else if (lower.includes("invalid variant")) {
    kind = "invalid-variant";
  } else if (lower.includes("invalid add-on")) {
    kind = "invalid-add-on";
  }
  return { index, reason: detail.trim(), kind };
}

/**
 * Pull every `items[N]` rejection out of an ApiError. Falls back to the
 * envelope message when there are no per-line details (e.g. the mock's
 * `{ field, message }` shape, or a generic 400).
 */
export function parseQuoteRejections(error: unknown): QuoteIssue[] {
  const api = error as ApiError | undefined;
  const details = api?.details;

  if (Array.isArray(details) && details.length > 0) {
    const strings = details.filter((d): d is string => typeof d === "string");
    if (strings.length > 0) {
      const issues = strings
        .map(parseQuoteIssue)
        // A detail with no index (e.g. "Restaurant not found") is not a line
        // problem; keep it so the banner still tells the truth.
        .sort((a, b) => a.index - b.index);
      if (issues.some((i) => i.index >= 0)) return issues;
      return [{ index: -1, reason: strings.join(" "), kind: "unknown" }];
    }
    // Object-shaped details (MSW mock, or a future richer envelope).
    const objectText = details
      .map((d) => {
        const o = d as { field?: string; message?: string };
        return [o.field, o.message].filter(Boolean).join(": ");
      })
      .filter(Boolean);
    if (objectText.length > 0) {
      return objectText.map((text) => parseQuoteIssue(text));
    }
  }

  if (api?.message) {
    return [{ index: -1, reason: api.message, kind: "unknown" }];
  }
  return [{ index: -1, reason: "We could not price your cart. Please try again.", kind: "unknown" }];
}

/** Map rejections onto cart line indices, dropping anything out of range. */
export function issuesByLineIndex(issues: QuoteIssue[], lineCount: number): Map<number, string> {
  const map = new Map<number, string>();
  for (const issue of issues) {
    if (issue.index < 0 || issue.index >= lineCount) continue;
    map.set(issue.index, issue.reason);
  }
  return map;
}
