import {
  Skeleton,
  SkeletonCard,
  SkeletonText,
} from "@/src/components/ui/skeleton";

export default function MarketplaceLoading() {
  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-12 w-72" />
        <SkeletonText lines={2} className="max-w-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
