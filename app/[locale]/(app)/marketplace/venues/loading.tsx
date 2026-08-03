import { Skeleton, SkeletonCard } from "@/src/components/ui/skeleton";

export default function CollectionLoading() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-14 w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
