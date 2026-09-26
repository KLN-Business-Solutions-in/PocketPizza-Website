import React from "react";
import { Skeleton } from "@/components/ui/LayoutPrimitives";

export const MenuSkeleton: React.FC = () => {
  return (
    <div
      className="grid w-full grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-label="Loading menu"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-lg border border-border-default bg-white p-0 shadow-card">
          <Skeleton className="h-44 w-full" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex items-center justify-between pt-4">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};