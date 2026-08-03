import { Skeleton, SkeletonRow } from "@/src/components/ui/skeleton";

export default function ListLoading() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-3">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    </div>
  );
}
