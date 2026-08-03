import { Skeleton, SkeletonRow } from "@/src/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-10 w-56" />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </div>
  );
}
