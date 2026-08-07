import { getTranslations } from "next-intl/server";

export type DocumentLinkItem = {
  id: string;
  title: string;
  visibility?: string;
  sizeBytes?: number;
};

type Variant = "public" | "panel";

export async function ProfileDocumentList({
  documents,
  locale,
  variant = "panel",
}: {
  documents: DocumentLinkItem[];
  locale: string;
  /** public = PublicProfileView section rhythm; panel = booking/ops card. */
  variant?: Variant;
}) {
  const t = await getTranslations({ locale, namespace: "profile" });
  if (documents.length === 0) return null;

  if (variant === "public") {
    return (
      <section className="grid gap-3">
        <h2 className="text-[1.15rem] font-semibold">{t("documentsTitle")}</h2>
        <p className="text-sm text-[var(--text-muted)]">{t("documentsViewBody")}</p>
        <ul className="grid gap-2">
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
