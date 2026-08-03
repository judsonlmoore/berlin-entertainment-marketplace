import { getTranslations, setRequestLocale } from "next-intl/server";
import { listConfiguredProviders } from "@/src/auth";
import { signInWithProvider } from "@/src/actions/auth";
import { PendingSubmitButton } from "@/src/components/pending-submit-button";

type Props = { params: Promise<{ locale: string }> };

export default async function SignInPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("signIn");
  const providers = listConfiguredProviders();

  return (
    <section className="mx-auto max-w-lg">
      <h1 className="page-title text-[clamp(1.75rem,2.5vw,2.5rem)]">
        {t("title")}
      </h1>
      <p className="mt-4 font-medium text-[var(--text-muted)]">{t("body")}</p>

      <div className="panel mt-8 grid gap-3 p-6">
        {providers.includes("github") ? (
          <form
            action={async () => {
              "use server";
              await signInWithProvider("github");
            }}
          >
            <PendingSubmitButton className="w-full">
              {t("github")}
            </PendingSubmitButton>
          </form>
        ) : null}

        {providers.includes("google") ? (
          <form
            action={async () => {
              "use server";
              await signInWithProvider("google");
            }}
          >
            <PendingSubmitButton className="w-full">
              {t("google")}
            </PendingSubmitButton>
          </form>
        ) : null}

        {providers.length === 0 ? <p>{t("unconfigured")}</p> : null}
      </div>
    </section>
  );
}
