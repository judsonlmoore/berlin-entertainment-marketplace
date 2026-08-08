type MemberProofProps = {
  /** Member count - pass actual count or null for fallback */
  count: number | null;
  /** Formatted proof message with {count} placeholder */
  proofMessage: string;
  /** Fallback message when count is unavailable */
  fallbackMessage: string;
};

export function MemberProof({
  count,
  proofMessage,
  fallbackMessage,
}: MemberProofProps) {
  const message =
    count !== null && count > 0
      ? proofMessage.replace("{count}", count.toString())
      : fallbackMessage;

  return (
    <section className="border-b border-[var(--rule)] bg-[var(--canvas)] py-6">
      <div className="shell">
        <p className="text-center text-sm font-medium text-[var(--text-muted)]">
          {message}
        </p>
      </div>
    </section>
  );
}
