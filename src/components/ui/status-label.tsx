import type { ReactNode } from "react";

type Tone = "neutral" | "success" | "warning" | "info" | "danger";

const toneClass: Record<Tone, string> = {
  neutral: "bg-[var(--surface)] text-[var(--ink)] border-[var(--rule)]",
  success: "bg-[var(--success-soft)] text-[var(--ink)] border-[var(--rule)]",
  warning: "bg-[var(--warning-soft)] text-[var(--ink)] border-[var(--rule)]",
  info: "bg-[var(--info-soft)] text-[var(--ink)] border-[var(--rule)]",
  danger: "bg-[var(--rose-soft)]/25 text-[var(--ink)] border-[var(--rule)]",
};

export function StatusLabel({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center border px-2 py-1 text-[0.6875rem] font-semibold tracking-[0.08em] uppercase ${toneClass[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
