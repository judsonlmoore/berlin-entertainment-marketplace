"use client";

import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import {
  GitHubMark,
  GoogleGLogo,
  MicrosoftLogo,
} from "@/src/components/auth/oauth-provider-icons";
import type { AuthProviderId } from "@/src/validation/env";

type Props = {
  provider: AuthProviderId;
  label: string;
};

/**
 * Brand-compliant OAuth submit buttons (Google Identity + Microsoft Entra guidelines).
 * Uses light theme so the multicolor logos sit on an approved white/neutral ground.
 */
export function OAuthSignInButton({ provider, label }: Props) {
  const { pending } = useFormStatus();
  const t = useTranslations("ui");

  if (provider === "google") {
    return (
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending || undefined}
        aria-label={label}
        className="oauth-btn oauth-btn--google"
      >
        <span className="oauth-btn__state" aria-hidden />
        <span className="oauth-btn__content">
          {pending ? (
            <span className="oauth-btn__spinner" aria-hidden />
          ) : (
            <span className="oauth-btn__icon oauth-btn__icon--google">
              <GoogleGLogo />
            </span>
          )}
          <span className="oauth-btn__label">
            {pending ? t("working") : label}
          </span>
        </span>
      </button>
    );
  }

  if (provider === "microsoft-entra-id") {
    return (
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending || undefined}
        aria-label={label}
        className="oauth-btn oauth-btn--microsoft"
      >
        <span className="oauth-btn__content">
          {pending ? (
            <span className="oauth-btn__spinner oauth-btn__spinner--dark" aria-hidden />
          ) : (
            <span className="oauth-btn__icon oauth-btn__icon--microsoft">
              <MicrosoftLogo />
            </span>
          )}
          <span className="oauth-btn__label">
            {pending ? t("working") : label}
          </span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      aria-label={label}
      className="oauth-btn oauth-btn--github"
    >
      <span className="oauth-btn__content">
        {pending ? (
          <span className="oauth-btn__spinner" aria-hidden />
        ) : (
          <span className="oauth-btn__icon oauth-btn__icon--github">
            <GitHubMark />
          </span>
        )}
        <span className="oauth-btn__label">
          {pending ? t("working") : label}
        </span>
      </span>
    </button>
  );
}
