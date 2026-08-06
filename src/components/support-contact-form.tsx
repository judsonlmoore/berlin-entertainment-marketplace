"use client";

import { useEffect, useId, useRef, useState } from "react";
import Script from "next/script";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/src/i18n/navigation";

const DEFAULT_SPAMBLOCK_FORM_URL = "https://api.spamblock.io/f/wxiyKDuWngBC";

const SPAMBLOCK_FALLBACK_MS = 2500;

export const CONTACT_TOPICS = [
  "access",
  "account",
  "booking",
  "product",
  "privacy",
  "other",
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];
export type ContactSource = "public_contact" | "app_help";

type Props = {
  source: ContactSource;
  defaultName?: string;
  defaultEmail?: string;
};

function spamblockFormUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SPAMBLOCK_FORM_URL?.trim() ||
    DEFAULT_SPAMBLOCK_FORM_URL
  );
}

export function SupportContactForm({
  source,
  defaultName = "",
  defaultEmail = "",
}: Props) {
  const t = useTranslations("contact");
  const locale = useLocale();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const formId = useId();
  const awaitingSpamblockRef = useRef(false);
  const submitInFlightRef = useRef(false);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const postToSpamblockRef = useRef<(() => Promise<void>) | null>(null);
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [clientError, setClientError] = useState<string | null>(null);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const clearFallbackTimer = () => {
      if (fallbackTimerRef.current !== null) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };

    // Capture-phase guard: never allow native navigation (GET query-string leak).
    // Spamblock still scores the submit event; we POST from spamblock:allowed.
    const blockNativeSubmit = (event: Event) => {
      event.preventDefault();
    };

    const postToSpamblock = async () => {
      if (submitInFlightRef.current) return;
      clearFallbackTimer();
      awaitingSpamblockRef.current = false;
      submitInFlightRef.current = true;
      setClientError(null);
      setStatus("submitting");

      const formData = new FormData(form);
      try {
        const response = await fetch(spamblockFormUrl(), {
          method: "POST",
          body: formData,
        });
        if (!response.ok) {
          throw new Error(`Spamblock responded ${response.status}`);
        }
        setStatus("success");
        form.reset();
      } catch {
        submitInFlightRef.current = false;
        setStatus("error");
      }
    };
    postToSpamblockRef.current = postToSpamblock;

    const handleAllowed = async (event: Event) => {
      event.preventDefault();
      await postToSpamblock();
    };

    form.addEventListener("submit", blockNativeSubmit, true);
    form.addEventListener("spamblock:allowed", handleAllowed);
    return () => {
      clearFallbackTimer();
      postToSpamblockRef.current = null;
      form.removeEventListener("submit", blockNativeSubmit, true);
      form.removeEventListener("spamblock:allowed", handleAllowed);
    };
  }, []);

  if (status === "success") {
    return (
      <div
        className="panel mx-auto w-full max-w-xl p-6"
        role="status"
        aria-live="polite"
      >
        <h2 className="page-title text-xl">{t("successTitle")}</h2>
        <p className="mt-3 text-sm font-medium text-[var(--text-muted)]">
          {t("successBody")}
        </p>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://pixel.spamblock.io/latest.js"
        strategy="afterInteractive"
      />
      <form
        ref={formRef}
        id={formId}
        data-block-spam
        method="post"
        className="panel mx-auto grid w-full max-w-xl gap-4 p-6"
        noValidate
        onSubmit={(event) => {
          // Always cancel native submit. Capture-phase listener is the primary
          // guard; this covers React's handler and keeps PII out of the URL if
          // the Spamblock pixel is blocked, slow, or calls requestSubmit().
          event.preventDefault();
          // Pixel may call requestSubmit() after spamblock:allowed; ignore that.
          if (submitInFlightRef.current || status === "submitting") {
            return;
          }
          setClientError(null);
          if (fallbackTimerRef.current !== null) {
            clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
          }
          awaitingSpamblockRef.current = false;

          const form = event.currentTarget;
          const name = String(new FormData(form).get("name") ?? "").trim();
          const email = String(new FormData(form).get("email") ?? "").trim();
          const message = String(
            new FormData(form).get("message") ?? "",
          ).trim();
          if (!name || !email || !message) {
            setClientError(t("validationRequired"));
            return;
          }
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setClientError(t("validationEmail"));
            return;
          }
          if (message.length > 4000) {
            setClientError(t("validationMessageLength"));
            return;
          }

          // Pixel should emit spamblock:allowed; if it never does, fall back to
          // a direct POST so the form still works without leaking via GET.
          awaitingSpamblockRef.current = true;
          fallbackTimerRef.current = setTimeout(() => {
            if (!awaitingSpamblockRef.current) return;
            void postToSpamblockRef.current?.();
          }, SPAMBLOCK_FALLBACK_MS);
        }}
      >
        <label className="grid gap-1 text-sm">
          <span className="field-label">{t("nameLabel")}</span>
          <input
            name="name"
            type="text"
            required
            autoComplete="name"
            defaultValue={defaultName}
            className="field"
            disabled={status === "submitting"}
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="field-label">{t("emailLabel")}</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={defaultEmail}
            className="field"
            disabled={status === "submitting"}
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="field-label">{t("topicLabel")}</span>
          <select
            name="topic"
            required
            className="field"
            defaultValue="other"
            disabled={status === "submitting"}
          >
            {CONTACT_TOPICS.map((topic) => (
              <option key={topic} value={topic}>
                {t(`topics.${topic}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="field-label">{t("messageLabel")}</span>
          <textarea
            name="message"
            required
            rows={6}
            maxLength={4000}
            className="field min-h-[9rem]"
            disabled={status === "submitting"}
          />
        </label>

        <input
          type="hidden"
          name="locale"
          value={locale === "de" ? "de" : "en"}
        />
        <input type="hidden" name="source" value={source} />
        <input type="hidden" name="page_url" value={pathname} />

        {clientError ? (
          <p role="alert" className="text-sm font-medium text-[var(--danger)]">
            {clientError}
          </p>
        ) : null}

        {status === "error" ? (
          <p role="alert" className="text-sm font-medium text-[var(--danger)]">
            {t.rich("errorBody", {
              mailto: (chunks) => (
                <a href="mailto:hello@moorewwe.com" className="underline">
                  {chunks}
                </a>
              ),
            })}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] disabled:opacity-60"
        >
          {status === "submitting" ? t("submitting") : t("submit")}
        </button>
      </form>
    </>
  );
}
