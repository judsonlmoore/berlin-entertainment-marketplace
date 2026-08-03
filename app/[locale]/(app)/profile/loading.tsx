import { Skeleton, SkeletonText } from "@/src/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="grid gap-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-11 w-full max-w-sm" />
        <Skeleton className="h-80 w-full" />
      </div>
      <div className="grid gap-3">
        <Skeleton className="h-8 w-40" />
        <SkeletonText lines={5} />
      </div>
    </div>
  );
}
