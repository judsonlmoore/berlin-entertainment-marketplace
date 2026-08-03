import { Skeleton, SkeletonText } from "@/src/components/ui/skeleton";

export default function LocaleLoading() {
  return (
    <div className="shell grid gap-6 py-10">
      <Skeleton className="h-10 w-64" />
      <SkeletonText lines={3} className="max-w-xl" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
