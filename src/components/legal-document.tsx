import { MarkdownDocument } from "@/src/components/markdown-document";
import {
  getLegalDocument,
  type LegalSlug,
} from "@/src/lib/legal-content";
import { type AppLocale } from "@/src/i18n/routing";

type Props = {
  slug: LegalSlug;
  locale: AppLocale;
};

export function LegalDocumentView({ slug, locale }: Props) {
  const document = getLegalDocument(slug, locale);

  return (
    <div className="shell py-8 sm:py-12">
      <article className="legal-prose mx-auto max-w-3xl">
        <h1 className="page-title text-[clamp(1.75rem,2.5vw,2.5rem)]">
          {document.title}
        </h1>
        {document.lastUpdated ? (
          <p className="legal-lead">{document.lastUpdated}</p>
        ) : null}
        <MarkdownDocument content={document.body} />
      </article>
    </div>
  );
}
