import { getTranslations } from "next-intl/server";

export type DocumentLinkItem = {
  id: string;
  title: string;
  visibility?: string;
  sizeBytes?: number;
};

/** Booking / ops document list (public profiles use PublicProfileView sidebar). */
export async function ProfileDocumentList({
  documents,
  locale,
}: {
  documents: DocumentLinkItem[];
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: "profile" });
  if (documents.length === 0) return null;

  return (
    <section className="panel p-6">
      <h2 className="page-title text-xl">{t("documentsTitle")}</h2>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        {t("documentsViewBody")}
      </p>
      <ul className="mt-4 grid gap-2">
        {documents.map((doc) => (
          <li key={doc.id}>
            <a
              href={`/api/riders/${doc.id}`}
              className="font-medium text-[var(--primary)]"
            >
              {doc.title}
            </a>
            {typeof doc.sizeBytes === "number" ? (
              <span className="text-sm text-[var(--text-muted)]">
                {" · "}
                {Math.max(1, Math.round(doc.sizeBytes / 1024))} KB
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
