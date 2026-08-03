import { Skeleton, SkeletonText } from "@/src/components/ui/skeleton";

export default function OnboardingLoading() {
  return (
    <div className="mx-auto grid max-w-xl gap-4">
      <Skeleton className="h-10 w-64" />
      <SkeletonText lines={3} />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
