import { Skeleton, SkeletonText } from "@/src/components/ui/skeleton";

export default function PublicLoading() {
  return (
    <div>
      <Skeleton className="min-h-[min(88vh,44rem)] w-full rounded-none" />
      <div className="shell grid gap-12 py-12">
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-6 md:grid-cols-3">
          <div className="grid gap-3">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-6 w-40" />
            <SkeletonText lines={3} />
          </div>
          <div className="grid gap-3">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-6 w-40" />
            <SkeletonText lines={3} />
          </div>
          <div className="grid gap-3">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-6 w-40" />
            <SkeletonText lines={3} />
          </div>
        </div>
      </div>
    </div>
  );
}
