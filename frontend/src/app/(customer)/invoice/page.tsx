"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useInvoice } from "@/lib/api/orders";
import { formatINR } from "@/lib/money";
import { Card, ErrorState } from "@/components/ui/LayoutPrimitives";
import { MenuSkeleton } from "@/components/menu/MenuSkeleton";

/**
 * Legacy /invoice route — canonical invoice lives at
 * /order/:publicToken/invoice (§11.6). This page accepts ?token=<publicToken>
 * so old links keep working.
 */
export default function InvoicePage() {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <InvoiceContent />
    </Suspense>
  );
}

function InvoiceContent() {
  const search = useSearchParams();
  const token = search.get("token") ?? undefined;
  const invoice = useInvoice(token);

  if (!token) {
    return (
      <ErrorState message="No order specified. Open your order and tap “View Invoice”." />
    );
  }
  if (invoice.isLoading) return <MenuSkeleton />;
  if (invoice.isError) {
    return (
      <ErrorState
        message={(invoice.error as Error)?.message || "Invoice not found."}
        onRetry={() => invoice.refetch()}
      />
    );
  }
  const inv = invoice.data;
  if (!inv) return null;

  return (
    <div className="space-y-6 pb-12">
      <h1 className="text-h2 font-heading font-bold">Invoice {inv.orderNumber}</h1>
      <Card>
        <p className="font-heading font-bold">{inv.customer.name}</p>
        <p className="text-body text-bodySecondary">{inv.customer.phone}</p>
        <p className="mt-3 font-heading font-extrabold">Grand total: {formatINR(inv.total)}</p>
        <p className="text-caption text-mutedGray">
          Full invoice at /order/{token}/invoice
        </p>
      </Card>
    </div>
  );
}
