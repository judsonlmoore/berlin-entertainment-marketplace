export default function NotificationSettingsLoading() {
  return (
    <section className="mx-auto max-w-4xl">
      <div className="mb-8">
        <div className="h-10 w-2/3 animate-pulse rounded bg-[var(--rule)]" />
        <div className="mt-3 h-5 w-full animate-pulse rounded bg-[var(--rule)]" />
      </div>

      <div className="grid gap-8">
        <div className="panel h-96 animate-pulse p-6" />
        <div className="panel h-48 animate-pulse p-6" />
      </div>
    </section>
  );
}
