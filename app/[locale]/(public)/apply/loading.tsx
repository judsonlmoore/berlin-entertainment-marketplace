import { Skeleton, SkeletonText } from "@/src/components/ui/skeleton";

export default function ApplyLoading() {
  return (
    <div className="mx-auto grid max-w-xl gap-4">
      <Skeleton className="h-10 w-72" />
      <SkeletonText lines={2} />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
