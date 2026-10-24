import { Skeleton } from "@/components/ui/LayoutPrimitives";

export function ProfileSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5" aria-label="Loading profile" aria-busy="true">
      <Skeleton className="h-8 w-40" />
      <div className="rounded-md border border-border-default bg-white p-5 shadow-card">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="mt-4 h-12 w-full" />
      </div>
      <div className="rounded-md border border-border-default bg-white p-5 shadow-card">
        <Skeleton className="h-5 w-44" />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[0, 1].map((row) => <Skeleton key={row} className="h-24 w-full" />)}
        </div>
      </div>
    </div>
  );
}
