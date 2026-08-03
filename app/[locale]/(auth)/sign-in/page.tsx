import { getTranslations, setRequestLocale } from "next-intl/server";
import { listConfiguredProviders } from "@/src/auth";
import { signInWithDevLogin, signInWithProvider } from "@/src/actions/auth";
import { isAuthDevLoginEnabled } from "@/src/validation/env";

type Props = { params: Promise<{ locale: string }> };

export default async function SignInPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("signIn");
  const providers = listConfiguredProviders();
  const devEnabled = isAuthDevLoginEnabled();

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

        {devEnabled ? (
          <>
            <p className="text-sm text-[var(--muted)]">{t("devNotice")}</p>
            <form action={signInWithDevLogin} className="grid gap-3">
              <label className="grid gap-1 text-sm">
                <span>Email</span>
                <input
                  name="email"
                  type="email"
                  defaultValue="dev@salon.local"
                  className="border border-[var(--line)] bg-transparent px-3 py-2"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>Name</span>
                <input
                  name="name"
                  defaultValue="Salon Dev User"
                  className="border border-[var(--line)] bg-transparent px-3 py-2"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="staff" />
                <span>Platform staff</span>
              </label>
              <button
                type="submit"
                className="bg-[var(--ink)] px-4 py-3 text-[var(--background)]"
              >
                {t("dev")}
              </button>
            </form>
          </>
        ) : null}

        {providers.length === 0 ? <p>{t("unconfigured")}</p> : null}
      </div>
    </section>
  );
}
