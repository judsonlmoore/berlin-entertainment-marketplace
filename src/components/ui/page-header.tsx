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
      className={`flex size-16 shrink-0 flex-col items-center justify-center border border-[var(--rule)] bg-[var(--surface)] ${className}`}
    >
      <span className="eyebrow text-[0.6rem]">{month}</span>
      <span className="display tabular text-2xl leading-none">{day}</span>
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
        <h1 className="display mt-2 text-[clamp(2rem,4vw,3.5rem)] leading-tight">
          {title}
        </h1>
        {body ? (
          <p className="mt-3 max-w-2xl text-[var(--text-muted)]">{body}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
