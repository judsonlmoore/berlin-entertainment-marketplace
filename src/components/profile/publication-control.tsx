"use client";

type Props = {
  state?: string | null | undefined;
  unpublishedLabel: string;
  suspendedLabel: string;
  publishLabel: string;
  publishingLabel: string;
  unpublishLabel: string;
  unpublishingLabel: string;
  canPublish: boolean;
  canUnpublish: boolean;
  pending: boolean;
  disabled?: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
};

/**
 * One publication control for the profile strip:
 * Publish when draft, Unpublish when live, Suspended when staff-locked.
 */
export function PublicationControl({
  state,
  unpublishedLabel,
  suspendedLabel,
  publishLabel,
  publishingLabel,
  unpublishLabel,
  unpublishingLabel,
  canPublish,
  canUnpublish,
  pending,
  disabled = false,
  onPublish,
  onUnpublish,
}: Props) {
  if (state === "suspended") {
    return (
      <span className="inline-flex min-h-9 items-center rounded-[var(--radius-md)] border border-[color-mix(in_srgb,#b8842a_35%,var(--rule))] bg-[var(--warning-soft)] px-3 text-xs font-semibold text-[#7a4a12]">
        {suspendedLabel}
      </span>
    );
  }

  if (canUnpublish || state === "approved") {
    return (
      <button
        type="button"
        disabled={pending || disabled || !canUnpublish}
        onClick={onUnpublish}
        className="inline-flex min-h-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--canvas)] disabled:opacity-60"
      >
        {pending ? unpublishingLabel : unpublishLabel}
      </button>
    );
  }

  if (canPublish) {
    return (
      <button
        type="button"
        disabled={pending || disabled}
        onClick={onPublish}
        className="inline-flex min-h-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] disabled:opacity-60"
      >
        {pending ? publishingLabel : publishLabel}
      </button>
    );
  }

  return (
    <span className="inline-flex min-h-9 items-center rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--canvas)] px-3 text-xs font-semibold text-[var(--text-muted)]">
      {unpublishedLabel}
    </span>
  );
}
