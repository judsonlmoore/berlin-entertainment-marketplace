"use client";

type Props = {
  state?: string | null | undefined;
  draftLabel: string;
  underReviewLabel: string;
  verifiedLabel: string;
};

/**
 * Soft publication tags for the profile builder header.
 * Draft is quiet; under-review and verified use soft tint chips.
 */
export function PublicationStatusTag({
  state,
  draftLabel,
  underReviewLabel,
  verifiedLabel,
}: Props) {
  if (!state || state === "draft") {
    return (
      <span className="inline-flex min-h-9 items-center rounded-[var(--radius-sm)] border border-[var(--rule)] bg-[var(--canvas)] px-2.5 text-xs font-semibold text-[var(--text-muted)]">
        {draftLabel}
      </span>
    );
  }

  if (state === "approved") {
    return (
      <span className="inline-flex min-h-9 items-center rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--primary)_25%,var(--rule))] bg-[var(--success-soft)] px-2.5 text-xs font-semibold text-[var(--primary)]">
        {verifiedLabel}
      </span>
    );
  }

  // submitted | changes_requested | suspended publication → under review chrome
  return (
    <span className="inline-flex min-h-9 items-center rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,#b8842a_35%,var(--rule))] bg-[var(--warning-soft)] px-2.5 text-xs font-semibold text-[#7a4a12]">
      {underReviewLabel}
    </span>
  );
}
