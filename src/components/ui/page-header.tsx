import type { ReactNode } from "react";

export function DateTile({
  date,
  locale,
  className = "",
}: {
  date: Date;
  locale: string;
  className?: string;
}) {
  const day = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    day: "numeric",
    timeZone: "Europe/Berlin",
  }).format(date);
  const month = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    month: "short",
    timeZone: "Europe/Berlin",
  }).format(date);

  return (
    <div
      className={`flex size-16 shrink-0 flex-col items-center justify-center rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)] ${className}`}
    >
      <span className="eyebrow text-[0.6rem]">{month}</span>
      <span className="tabular text-2xl leading-none font-semibold">{day}</span>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  body,
  action,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="page-title mt-2 text-[clamp(1.75rem,2.5vw,2.25rem)]">
          {title}
        </h1>
        {body ? (
          <p className="mt-3 max-w-2xl text-sm font-medium text-[var(--text-muted)] sm:text-base">
            {body}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
