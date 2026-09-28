"use client";

import { ErrorState } from "@/components/ui/LayoutPrimitives";

/**
 * Legacy /invoice route — canonical invoice lives at
 * /order/:publicToken/invoice (§11.6). The old ?token= query variant is
 * retired: query strings leak capability tokens into history/logs/Referers.
 */
export default function InvoicePage() {
  return (
    <ErrorState message="This invoice link has expired. Open your order page from the confirmation to view it." />
  );
}
