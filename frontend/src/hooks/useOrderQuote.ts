"use client";

import React from "react";
import { useCartStore } from "@/lib/cart/store";
import { quotePayload, useQuote } from "@/lib/api/orders";
import type { QuoteResponse } from "@shared/contract/contract";
import { issuesByLineIndex, parseQuoteRejections, type QuoteIssue } from "@/lib/quote/rejections";

/**
 * Day 6: the checkout summary is driven entirely by the server quote.
 *
 * Replaces the inline effect that used to live in the checkout page, which had
 * two defects:
 *
 *  1. It was keyed on `lines.length`, so bumping a quantity 1 → 2 never
 *     re-quoted and the summary showed a stale total.
 *  2. It was guarded by `if (quote.isSuccess) return`. Once the first quote
 *     succeeded, no further quote was ever sent — so switching DELIVERY →
 *     PICKUP left the ₹30 delivery fee and the old total on screen.
 *
 * Both came from reading a mutation's *output* (`isSuccess`/`isPending`) as an
 * input guard inside a dependency array. This hook is keyed purely on a stable
 * serialization of the request payload, and staleness is resolved by comparing
 * the payload react-query is currently holding (`variables`) against the
 * payload the cart needs now. Anything that does not match is discarded rather
 * than shown.
 */

/** Trailing debounce for cart/order-type churn. */
const DEBOUNCE_MS = 300;

export type OrderQuote = {
  /** True while a quote is in flight or its debounce window is open. */
  isPending: boolean;
  /** Server quote for the *current* payload, or undefined while stale/empty. */
  data: QuoteResponse | undefined;
  /** Per-line rejections for the current payload. */
  issues: QuoteIssue[];
  /** Rejection text keyed by cart line index. Empty when the quote is clean. */
  lineIssues: Map<number, string>;
  /** True when a specific cart line must be fixed before submitting. */
  isBlocked: boolean;
  /** Failure that is not attributable to a single line, if any. */
  bannerMessage: string | null;
  retry: () => void;
};

export function useOrderQuote(): OrderQuote {
  const lines = useCartStore((s) => s.lines);
  const orderType = useCartStore((s) => s.orderType);
  const { mutate, data, error, isPending: isInFlight, variables } = useQuote();

  const signature = React.useMemo(
    () => (lines.length > 0 ? JSON.stringify(quotePayload(orderType, lines)) : ""),
    [orderType, lines]
  );

  // Signature of the payload most recently sent. A ref, not state: it is
  // bookkeeping for the effect below, never something we render from.
  const lastSent = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (signature === "") {
      // Cart emptied. Forget the dedupe so an identical cart built again later
      // re-quotes rather than reusing a quote the server has not confirmed
      // since — prices and availability can move while the cart is empty.
      lastSent.current = null;
      return;
    }
    // Already asked for exactly this payload — do not re-quote on every render
    // or every mutation settle.
    if (lastSent.current === signature) return;

    const current = quotePayload(orderType, lines);
    // The very first quote of a session is sent immediately so the summary just
    // appears; later churn is debounced.
    const delay = variables === undefined ? 0 : DEBOUNCE_MS;
    const timer = setTimeout(() => {
      lastSent.current = signature;
      mutate(current);
    }, delay);
    return () => clearTimeout(timer);
  }, [signature, orderType, lines, mutate, variables]);

  const retry = React.useCallback(() => {
    if (lines.length > 0) mutate(quotePayload(orderType, lines));
  }, [mutate, lines, orderType]);

  // react-query holds the payload that produced the current data/error.
  const answered = variables ? JSON.stringify(variables) : null;
  const isCurrent = answered !== null && answered === signature;

  const issues = React.useMemo<QuoteIssue[]>(
    () => (isCurrent && error ? parseQuoteRejections(error) : []),
    [isCurrent, error]
  );

  const lineIssues = React.useMemo(
    () => issuesByLineIndex(issues, lines.length),
    [issues, lines.length]
  );

  const bannerMessage = React.useMemo(() => {
    if (!isCurrent || !error) return null;
    const unattributed = issues.filter((i) => i.index < 0).map((i) => i.reason);
    if (unattributed.length > 0) return unattributed.join(" ");
    if (lineIssues.size === 0) {
      // A failure with no per-line detail at all (transport, 5xx, 429).
      return (error as Error)?.message || "We could not price your cart. Please try again.";
    }
    return null;
  }, [isCurrent, error, issues, lineIssues]);

  return {
    // Pending covers both the open debounce window (payload changed, nothing
    // sent for it yet) and an in-flight request.
    isPending: signature !== "" && (answered !== signature || isInFlight),
    data: isCurrent ? data : undefined,
    issues,
    lineIssues,
    isBlocked: lineIssues.size > 0,
    bannerMessage,
    retry,
  };
}
