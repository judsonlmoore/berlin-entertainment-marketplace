import type { ReactNode } from "react";
import { YouTubeEmbed } from "@/src/components/youtube-embed";
import { Monogram } from "@/src/components/ui/monogram";
import { Link } from "@/src/i18n/navigation";
import type {
  PublicProfileFact,
  PublicProfileLink,
  PublicProfileMedia,
} from "@/src/lib/public-profile";

type ContactRow = {
  id: string;
  kind: string;
  value: string;
  isPreferred?: boolean;
};

export type PublicProfileViewProps = {
  backHref: string;
  backLabel: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  description: string;
  media: PublicProfileMedia;
  facts: PublicProfileFact[];
  links: PublicProfileLink[];
  websiteUrl?: string | null;
  websiteLabel: string;
  contactTitle: string;
  contactLocked: boolean;
  contactLockedMessage: string;
  preferredLabel: string;
  contacts: ContactRow[] | null;
  aboutTitle: string;
  detailsTitle: string;
  galleryTitle: string;
  videoTitle: string;
  linksTitle: string;
  children?: ReactNode;
};

/**
 * Shared public marketplace profile presentation for entertainers, venues,
 * and future profile types. Pages supply typed facts/links; media layout is
 * identical.
 */
export function PublicProfileView({
  backHref,
  backLabel,
  eyebrow,
  title,
  subtitle,
  description,
  media,
  facts,
  links,
  websiteUrl,
  websiteLabel,
  contactTitle,
  contactLocked,
  contactLockedMessage,
  preferredLabel,
  contacts,
  aboutTitle,
  detailsTitle,
  galleryTitle,
  videoTitle,
  linksTitle,
  children,
}: PublicProfileViewProps) {
  const allLinks = [
    ...(websiteUrl
      ? [{ label: websiteLabel, href: websiteUrl } satisfies PublicProfileLink]
      : []),
    ...links,
    ...media.links
      .filter((item) => item.url)
      .map((item) => ({
        label: item.caption?.trim() || item.url!,
        href: item.url!,
      })),
  ];

  return (
    <article className="mx-auto max-w-5xl">
      <p className="text-sm">
        <Link href={backHref}>{backLabel}</Link>
      </p>

      <div className="mt-4 overflow-hidden rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)]">
        {media.hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/portfolio/${media.hero.id}`}
            alt={media.hero.altText ?? media.hero.caption ?? title}
            className="aspect-[16/9] w-full object-cover"
          />
        ) : (
          <Monogram name={title} className="aspect-[16/9] w-full" />
        )}

        <div className="grid gap-2 border-t border-[var(--line)] px-5 py-6 sm:px-8 sm:py-8">
          <p className="eyebrow text-[0.72rem] font-semibold tracking-[0.14em] uppercase">
            {eyebrow}
          </p>
          <h1 className="page-title text-[clamp(1.75rem,2.5vw,2.25rem)]">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-[var(--text-muted)]">{subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)] lg:items-start">
        <div className="grid gap-8">
          {description.trim() ? (
            <section className="grid gap-3">
              <h2 className="text-[1.15rem] font-semibold">{aboutTitle}</h2>
              <div className="whitespace-pre-wrap text-[1rem] leading-relaxed text-[var(--ink)]">
                {description}
              </div>
            </section>
          ) : null}

          {media.youtube?.url ? (
            <section className="grid gap-3">
              <h2 className="text-[1.15rem] font-semibold">{videoTitle}</h2>
              <YouTubeEmbed
                url={media.youtube.url}
                {...(media.youtube.caption
                  ? { title: media.youtube.caption }
                  : { title })}
                className="aspect-video w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--line)]"
              />
            </section>
          ) : null}

          {media.gallery.length > 0 ? (
            <section className="grid gap-3">
              <h2 className="text-[1.15rem] font-semibold">{galleryTitle}</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {media.gallery.map((item) => (
                  <li
                    key={item.id}
                    className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--line)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/portfolio/${item.id}`}
                      alt={item.altText ?? item.caption ?? title}
                      className="aspect-[4/3] w-full object-cover"
                    />
                    {item.caption ? (
                      <p className="border-t border-[var(--line)] px-3 py-2 text-sm text-[var(--text-muted)]">
                        {item.caption}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {children}
        </div>

        <aside className="grid gap-4">
          {facts.length > 0 ? (
            <section className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-5">
              <h2 className="text-[1.05rem] font-semibold">{detailsTitle}</h2>
              <dl className="mt-4 grid gap-3 text-sm">
                {facts.map((fact) => (
                  <div key={fact.label} className="grid gap-1">
                    <dt className="font-medium text-[var(--text-muted)]">
                      {fact.label}
                    </dt>
                    <dd className="whitespace-pre-wrap text-[var(--ink)]">
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {allLinks.length > 0 ? (
            <section className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-5">
              <h2 className="text-[1.05rem] font-semibold">{linksTitle}</h2>
              <ul className="mt-3 grid gap-2 text-sm">
                {allLinks.map((link) => (
                  <li key={`${link.label}-${link.href}`}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[var(--primary)] underline-offset-2 hover:underline"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-5">
            <h2 className="text-[1.05rem] font-semibold">{contactTitle}</h2>
            {contactLocked || !contacts ? (
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                {contactLockedMessage}
              </p>
            ) : (
              <ul className="mt-3 grid gap-2 text-sm">
                {contacts.map((contact) => (
                  <li key={contact.id}>
                    <span className="font-medium text-[var(--text-muted)]">
                      {contact.kind}
                    </span>
                    : {contact.value}
                    {contact.isPreferred ? ` (${preferredLabel})` : ""}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </article>
  );
}
