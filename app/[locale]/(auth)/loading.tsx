import { Skeleton, SkeletonText } from "@/src/components/ui/skeleton";

export default function AuthLoading() {
  return (
    <div className="mx-auto grid max-w-lg gap-4">
      <Skeleton className="h-10 w-48" />
      <SkeletonText lines={2} />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
