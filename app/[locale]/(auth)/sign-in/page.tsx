import { getTranslations, setRequestLocale } from "next-intl/server";
import { listConfiguredProviders } from "@/src/auth";
import { signInWithProvider } from "@/src/actions/auth";
import { OAuthSignInButton } from "@/src/components/auth/oauth-sign-in-button";
import type { AppLocale } from "@/src/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export default async function SignInPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const appLocale = locale as AppLocale;
  const t = await getTranslations("signIn");
  const providers = listConfiguredProviders();

  return (
    <section className="mx-auto max-w-lg">
      <h1 className="page-title text-[clamp(1.75rem,2.5vw,2.5rem)]">
        {t("title")}
      </h1>
      <p className="mt-4 font-medium text-[var(--text-muted)]">{t("body")}</p>

      <div className="panel mt-8 grid gap-3 p-6">
        {providers.includes("google") ? (
          <form
            action={async () => {
              "use server";
              await signInWithProvider("google", appLocale);
            }}
          >
            <OAuthSignInButton provider="google" label={t("google")} />
          </form>
        ) : null}

        {providers.includes("microsoft-entra-id") ? (
          <form
            action={async () => {
              "use server";
              await signInWithProvider("microsoft-entra-id", appLocale);
            }}
          >
            <OAuthSignInButton
              provider="microsoft-entra-id"
              label={t("microsoft")}
            />
          </form>
        ) : null}

        {providers.includes("github") ? (
          <form
            action={async () => {
              "use server";
              await signInWithProvider("github", appLocale);
            }}
          >
            <OAuthSignInButton provider="github" label={t("github")} />
          </form>
        ) : null}

        {providers.length === 0 ? <p>{t("unconfigured")}</p> : null}
      </div>
    </section>
  );
}
