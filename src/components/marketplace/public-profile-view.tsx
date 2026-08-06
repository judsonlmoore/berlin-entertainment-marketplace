import type { ReactNode } from "react";
import { YouTubeEmbed } from "@/src/components/youtube-embed";
import { Monogram } from "@/src/components/ui/monogram";
import { SafeRichText } from "@/src/components/ui/safe-rich-text";
import { Link } from "@/src/i18n/navigation";
import type {
  PublicProfileFact,
  PublicProfileLink,
  PublicProfileMedia,
} from "@/src/lib/public-profile";
import { portfolioImageSrc } from "@/src/lib/portfolio-image-src";

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
  /** Optional action in the title band (e.g. connection request). */
  headerAction?: ReactNode;
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
  contactLockedMessage: _contactLockedMessage,
  preferredLabel,
  contacts,
  aboutTitle,
  detailsTitle,
  galleryTitle,
  videoTitle,
  linksTitle,
  headerAction,
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

  const showContact = !contactLocked && contacts && contacts.length > 0;

  return (
    <article className="mx-auto max-w-5xl">
      <p className="text-sm">
        <Link href={backHref}>{backLabel}</Link>
      </p>

      <div className="mt-4 overflow-hidden rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)]">
        {media.hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={portfolioImageSrc(media.hero.id, "full")}
            alt={media.hero.altText ?? media.hero.caption ?? title}
            className="aspect-[16/9] w-full object-cover"
          />
        ) : (
          <Monogram name={title} className="aspect-[16/9] w-full" />
        )}

        <div className="flex flex-col gap-4 border-t border-[var(--line)] px-5 py-6 sm:flex-row sm:items-end sm:justify-between sm:gap-6 sm:px-8 sm:py-8">
          <div className="min-w-0 grid gap-2">
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
          {headerAction ? (
            <div className="shrink-0 sm:pb-0.5">{headerAction}</div>
          ) : null}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)] lg:items-start">
        <div className="grid gap-8">
          {description.trim() ? (
            <section className="grid gap-3">
              <h2 className="text-[1.15rem] font-semibold">{aboutTitle}</h2>
              <SafeRichText
                html={description}
                className="text-[1rem] leading-relaxed text-[var(--ink)]"
              />
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
                      src={portfolioImageSrc(item.id, "thumb")}
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
            <section className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)]">
              <div className="border-b border-[var(--rule)] bg-[var(--canvas)] px-5 py-3">
                <h2 className="text-[0.72rem] font-semibold tracking-[0.14em] text-[var(--ink)] uppercase">
                  {detailsTitle}
                </h2>
              </div>
              <dl className="divide-y divide-[var(--rule)]">
                {facts.map((fact) => (
                  <div key={fact.label} className="grid gap-1 px-5 py-3.5">
                    <dt className="text-xs font-semibold tracking-[0.06em] text-[var(--text-muted)] uppercase">
                      {fact.label}
                    </dt>
                    <dd className="text-sm leading-relaxed text-[var(--ink)]">
                      <SafeRichText html={fact.value} />
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {allLinks.length > 0 ? (
            <section className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)]">
              <div className="border-b border-[var(--rule)] bg-[var(--canvas)] px-5 py-3">
                <h2 className="text-[0.72rem] font-semibold tracking-[0.14em] text-[var(--ink)] uppercase">
                  {linksTitle}
                </h2>
              </div>
              <ul className="divide-y divide-[var(--rule)]">
                {allLinks.map((link) => (
                  <li key={`${link.label}-${link.href}`}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-11 items-center px-5 py-2.5 text-sm font-medium text-[var(--primary)] no-underline hover:bg-[var(--canvas)]"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {showContact ? (
            <section className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)]">
              <div className="border-b border-[var(--rule)] bg-[var(--canvas)] px-5 py-3">
                <h2 className="text-[0.72rem] font-semibold tracking-[0.14em] text-[var(--ink)] uppercase">
                  {contactTitle}
                </h2>
              </div>
              <ul className="divide-y divide-[var(--rule)]">
                {contacts.map((contact) => (
                  <li key={contact.id} className="px-5 py-3.5 text-sm">
                    <p className="text-xs font-semibold tracking-[0.06em] text-[var(--text-muted)] uppercase">
                      {contact.kind}
                      {contact.isPreferred ? ` · ${preferredLabel}` : ""}
                    </p>
                    <p className="mt-1 font-medium text-[var(--ink)]">
                      {contact.value}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </article>
  );
}
