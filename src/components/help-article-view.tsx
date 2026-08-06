import { MarkdownDocument } from "@/src/components/markdown-document";
import { Link } from "@/src/i18n/navigation";
import type { HelpArticle } from "@/src/lib/help-content";

type Props = {
  article: HelpArticle;
  backHref: string;
  backLabel: string;
};

export function HelpArticleView({ article, backHref, backLabel }: Props) {
  return (
    <div className="shell py-8 sm:py-12">
      <article className="legal-prose mx-auto max-w-3xl">
        <p className="text-sm">
          <Link href={backHref} className="underline">
            {backLabel}
          </Link>
        </p>
        <h1 className="page-title mt-4 text-[clamp(1.75rem,2.5vw,2.5rem)]">
          {article.title}
        </h1>
        {article.description ? (
          <p className="legal-lead">{article.description}</p>
        ) : null}
        <MarkdownDocument content={article.body} />
      </article>
    </div>
  );
}
