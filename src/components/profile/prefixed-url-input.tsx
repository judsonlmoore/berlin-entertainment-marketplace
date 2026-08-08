"use client";

import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  SOCIAL_PLATFORMS,
  type SocialPlatform,
  validatePlatformUrl,
} from "@/src/domain/social-urls";

type Props = {
  platform: SocialPlatform;
  name: string;
  label: string;
  defaultValue?: string | null | undefined;
  required?: boolean;
  onValueChange?: (value: string) => void;
};

/**
 * Plain full-URL input with platform host validation and inline Valid/Invalid.
 */
export function PrefixedUrlInput({
  platform,
  name,
  label,
  defaultValue,
  required = false,
  onValueChange,
}: Props) {
  const t = useTranslations("profile");
  const id = useId();
  const hiddenRef = useRef<HTMLInputElement>(null);
  const config = SOCIAL_PLATFORMS[platform];
  const [value, setValue] = useState((defaultValue ?? "").trim());
  const [touched, setTouched] = useState(Boolean((defaultValue ?? "").trim()));
  const check = validatePlatformUrl(platform, value);
  const showStatus = touched && value.trim().length > 0;

  function syncHidden(next: string) {
    if (hiddenRef.current) {
      hiddenRef.current.value = next;
      hiddenRef.current.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  function errorMessage(): string {
    if (check.ok) return "";
    switch (check.code) {
      case "wrong_platform":
        return t("urlWrongPlatform", { platform: label });
      case "spotify_path":
        return t("urlSpotifyPath");
      case "invalid_protocol":
        return t("urlInvalidProtocol");
      case "invalid_website":
        return t("urlInvalidWebsite");
      default:
        return t("urlInvalidGeneric");
    }
  }

  return (
    <label className="grid gap-1 text-sm" htmlFor={id}>
      <span className="font-medium text-[var(--ink)]">{label}</span>
      <div className="relative">
        <input
          id={id}
          type="url"
          inputMode="url"
          autoComplete="url"
          required={required}
          value={value}
          placeholder={config.placeholder}
          onChange={(event) => {
            const next = event.target.value;
            setValue(next);
            setTouched(true);
            syncHidden(next.trim());
            onValueChange?.(next.trim());
          }}
          onBlur={() => setTouched(true)}
          className={`field w-full pr-20 ${
            showStatus && !check.ok
              ? "border-[var(--danger)]"
              : showStatus && check.ok
                ? "border-[color-mix(in_srgb,var(--primary)_45%,var(--rule))]"
                : ""
          }`}
        />
        {showStatus ? (
          <span
            className={`pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold ${
              check.ok ? "text-[var(--primary)]" : "text-[var(--danger)]"
            }`}
          >
            {check.ok ? t("urlValid") : t("urlInvalid")}
          </span>
        ) : null}
      </div>
      <input ref={hiddenRef} type="hidden" name={name} value={value.trim()} />
      {showStatus && !check.ok ? (
        <span role="alert" className="text-xs text-[var(--danger)]">
          {errorMessage()}
        </span>
      ) : null}
    </label>
  );
}
