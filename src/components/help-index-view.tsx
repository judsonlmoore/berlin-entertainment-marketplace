import { Link } from "@/src/i18n/navigation";
import type { HelpArticle } from "@/src/lib/help-content";

type Props = {
  title: string;
  body: string;
  articles: HelpArticle[];
  articleBasePath: string;
  contactHref: string;
  contactLabel: string;
};

export function HelpIndexView({
  title,
  body,
  articles,
  articleBasePath,
  contactHref,
  contactLabel,
}: Props) {
  return (
    <section className="shell grid gap-8 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="page-title text-[clamp(1.75rem,2.5vw,2.5rem)]">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm font-medium text-[var(--text-muted)] sm:text-base">
          {body}
        </p>
      </div>

      <ul className="mx-auto grid w-full max-w-3xl gap-3">
        {articles.map((article) => (
          <li key={article.slug}>
            <Link
              href={`${articleBasePath}/${article.slug}`}
              className="panel block p-5 no-underline"
            >
              <h2 className="page-title text-lg leading-tight">
                {article.title}
              </h2>
              {article.description ? (
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  {article.description}
                </p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>

      <p className="mx-auto w-full max-w-3xl text-sm">
        <Link href={contactHref} className="font-medium underline">
          {contactLabel}
        </Link>
      </p>
    </section>
  );
}
