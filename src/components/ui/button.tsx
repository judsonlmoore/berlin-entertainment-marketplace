import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  pending?: boolean;
  pendingLabel?: string;
  children: ReactNode;
};

const variantClass: Record<Variant, string> = {
  primary:
    "rounded-[var(--radius-md)] bg-[var(--primary)] text-[var(--primary-foreground)] border border-[var(--primary)] font-semibold",
  secondary:
    "rounded-[var(--radius-md)] bg-[var(--surface)] text-[var(--ink)] border border-[var(--rule)] font-semibold",
  ghost: "rounded-[var(--radius-md)] bg-transparent text-[var(--ink)] border border-transparent underline font-medium",
};

export function Button({
  variant = "primary",
  pending = false,
  pendingLabel = "Working…",
  children,
  className = "",
  disabled,
  type = "button",
  ...rest
}: Props) {
  const isDisabled = Boolean(disabled || pending);

  return (
    <button
      type={type}
      aria-busy={pending || undefined}
      disabled={isDisabled}
      className={`inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2.5 text-sm no-underline transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${variantClass[variant]} ${className}`}
      {...rest}
    >
      {pending ? (
        <>
          <span
            aria-hidden="true"
            className="inline-block size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
          />
          <span>{pendingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
