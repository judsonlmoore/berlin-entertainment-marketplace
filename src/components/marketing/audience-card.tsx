import { Link } from "@/src/i18n/navigation";

type AudienceCardProps = {
  /** Card title */
  title: string;
  /** Card description */
  body: string;
  /** CTA button text */
  ctaLabel: string;
  /** Link href */
  href: string;
  /** Optional icon or visual element */
  icon?: React.ReactNode;
};

export function AudienceCard({
  title,
  body,
  ctaLabel,
  href,
  icon,
}: AudienceCardProps) {
  return (
    <article className="panel group relative flex flex-col gap-4 p-6 transition-shadow hover:shadow-sm sm:p-8">
      {icon && <div className="text-[var(--primary)]">{icon}</div>}

      <div className="flex-1">
        <h3 className="page-title mb-2 text-xl">{title}</h3>
        <p className="text-sm leading-relaxed text-[var(--text-muted)]">
          {body}
        </p>
      </div>

      <div>
        <Link
          href={href}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] no-underline transition-colors hover:text-[var(--primary-dark)]"
        >
          {ctaLabel}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
