"use client";

type Props = {
  state?: string | null | undefined;
  unpublishedLabel: string;
  publishedLabel: string;
  suspendedLabel: string;
};

/**
 * Soft publication tags for the profile builder header.
 * Unpublished is quiet; published uses success tint; suspended uses warning.
 */
export function PublicationStatusTag({
  state,
  unpublishedLabel,
  publishedLabel,
  suspendedLabel,
}: Props) {
  if (state === "approved") {
    return (
      <span className="inline-flex min-h-9 items-center rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--primary)_25%,var(--rule))] bg-[var(--success-soft)] px-2.5 text-xs font-semibold text-[var(--primary)]">
        {publishedLabel}
      </span>
    );
  }

  if (state === "suspended") {
    return (
      <span className="inline-flex min-h-9 items-center rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,#b8842a_35%,var(--rule))] bg-[var(--warning-soft)] px-2.5 text-xs font-semibold text-[#7a4a12]">
        {suspendedLabel}
      </span>
    );
  }

  return (
    <span className="inline-flex min-h-9 items-center rounded-[var(--radius-sm)] border border-[var(--rule)] bg-[var(--canvas)] px-2.5 text-xs font-semibold text-[var(--text-muted)]">
      {unpublishedLabel}
    </span>
  );
}
