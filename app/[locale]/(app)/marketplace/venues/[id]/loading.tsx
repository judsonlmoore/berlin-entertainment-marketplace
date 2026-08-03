import { Skeleton, SkeletonText } from "@/src/components/ui/skeleton";

export default function DetailLoading() {
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-12 w-2/3" />
      <SkeletonText lines={2} />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
