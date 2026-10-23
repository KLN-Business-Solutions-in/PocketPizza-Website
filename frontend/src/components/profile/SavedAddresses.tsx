"use client";

import { useCustomerAddresses } from "@/lib/api/customerProfile";
import { ErrorState, Skeleton } from "@/components/ui/LayoutPrimitives";

function AddressSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2" aria-label="Loading saved addresses" aria-busy="true">
      {[0, 1].map((row) => (
        <div key={row} className="rounded-md border border-border-default bg-white p-4">
          <Skeleton className="h-4 w-48 max-w-full" />
          <Skeleton className="mt-3 h-4 w-32" />
          <Skeleton className="mt-4 h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SavedAddresses() {
  const addressesQuery = useCustomerAddresses();

  if (addressesQuery.isLoading) return <AddressSkeleton />;
  if (addressesQuery.isError) {
    return (
      <ErrorState
        message="We could not load your saved addresses. Please try again."
        onRetry={() => { void addressesQuery.refetch(); }}
      />
    );
  }

  const addresses = addressesQuery.data?.addresses ?? [];
  if (addresses.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border-default bg-cream-bg px-5 py-8 text-center">
        <p className="font-heading font-bold text-charcoal">No saved addresses yet</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {addresses.map((address) => (
        <article key={address.id} className="rounded-md border border-border-default bg-white p-4 shadow-card">
          <address className="min-w-0 text-sm not-italic leading-relaxed text-charcoal">
            <span className="block break-words">{address.line1}</span>
            {address.line2 && <span className="block break-words">{address.line2}</span>}
            {address.landmark && <span className="block break-words">{address.landmark}</span>}
            <span className="block break-words">{address.city}, {address.pincode}</span>
          </address>
          <div className="mt-4 flex items-center gap-2">
            <button type="button" disabled className="rounded-md border border-border-default px-3 py-2 text-sm font-semibold text-bodySecondary opacity-60">
              Edit
            </button>
            <span className="text-xs text-bodySecondary">Coming soon</span>
          </div>
        </article>
      ))}
    </div>
  );
}
