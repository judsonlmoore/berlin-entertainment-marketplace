import { Skeleton, SkeletonText } from "@/src/components/ui/skeleton";

export default function PublicLoading() {
  return (
    <div className="grid gap-12">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="grid gap-4">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-16 w-full max-w-lg" />
          <SkeletonText lines={3} className="max-w-md" />
          <div className="flex gap-3">
            <Skeleton className="h-11 w-44" />
            <Skeleton className="h-11 w-36" />
          </div>
        </div>
        <Skeleton className="min-h-72 w-full" />
      </div>
      <Skeleton className="h-16 w-full" />
      <div className="grid gap-6 md:grid-cols-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}
