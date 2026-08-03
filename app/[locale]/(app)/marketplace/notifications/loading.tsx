export default function NotificationsLoading() {
  return (
    <section className="mx-auto max-w-4xl">
      <div className="mb-8">
        <div className="h-10 w-1/2 animate-pulse rounded bg-[var(--rule)]" />
        <div className="mt-3 h-5 w-3/4 animate-pulse rounded bg-[var(--rule)]" />
      </div>

      <div className="grid gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="panel h-24 animate-pulse p-4" />
        ))}
      </div>
    </section>
  );
}
