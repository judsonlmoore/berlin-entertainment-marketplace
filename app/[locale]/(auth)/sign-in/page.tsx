import { getTranslations, setRequestLocale } from "next-intl/server";
import { listConfiguredProviders } from "@/src/auth";
import { signInWithProvider } from "@/src/actions/auth";

type Props = { params: Promise<{ locale: string }> };

export default async function SignInPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("signIn");
  const providers = listConfiguredProviders();

  return (
    <section className="mx-auto max-w-lg">
      <h1 className="display text-4xl">{t("title")}</h1>
      <p className="mt-4 text-[var(--muted)]">{t("body")}</p>

      <div className="panel mt-8 grid gap-3 p-6">
        {providers.includes("github") ? (
          <form
            action={async () => {
              "use server";
              await signInWithProvider("github");
            }}
          >
            <button
              type="submit"
              className="w-full bg-[var(--accent)] px-4 py-3 text-[var(--background)]"
            >
              {t("github")}
            </button>
          </form>
        ) : null}

        {providers.includes("google") ? (
          <form
            action={async () => {
              "use server";
              await signInWithProvider("google");
            }}
          >
            <button
              type="submit"
              className="w-full bg-[var(--accent)] px-4 py-3 text-[var(--background)]"
            >
              {t("google")}
            </button>
          </form>
        ) : null}

        {providers.length === 0 ? <p>{t("unconfigured")}</p> : null}
      </div>
    </section>
  );
}
