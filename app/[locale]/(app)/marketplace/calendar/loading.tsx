import { Skeleton, SkeletonText } from "@/src/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-10 w-64" />
      <SkeletonText lines={2} className="max-w-xl" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-[28rem] w-full" />
    </div>
  );
}
