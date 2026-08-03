type Props = {
  className?: string;
  /** Quiet geometric placeholder; avoid decorative shimmer intensity. */
  rounded?: "none" | "sm" | "full";
};

export function Skeleton({ className = "", rounded = "sm" }: Props) {
  const radius =
    rounded === "full"
      ? "rounded-full"
      : rounded === "none"
        ? "rounded-none"
        : "rounded-[2px]";

  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-[var(--rule)]/55 ${radius} ${className}`}
    />
  );
}

export function SkeletonText({
  className = "",
  lines = 1,
}: {
  className?: string;
  lines?: number;
}) {
  return (
    <div className={`grid gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={`h-3 ${index === lines - 1 && lines > 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`panel overflow-hidden ${className}`}>
      <Skeleton className="h-36 w-full rounded-none" rounded="none" />
      <div className="grid gap-3 p-4">
        <Skeleton className="h-5 w-1/2" />
        <SkeletonText lines={2} />
        <Skeleton className="h-10 w-28" />
      </div>
    </div>
  );
}

export function SkeletonRow({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-4 border border-[var(--rule)] bg-[var(--surface)] p-4 ${className}`}
    >
      <Skeleton className="size-12 shrink-0" rounded="full" />
      <div className="grid min-w-0 flex-1 gap-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="h-10 w-24 shrink-0" />
    </div>
  );
}
