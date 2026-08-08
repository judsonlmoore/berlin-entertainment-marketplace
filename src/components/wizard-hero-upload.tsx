"use client";

import { useRef, useState, type DragEvent } from "react";
import { useTranslations } from "next-intl";
import { portfolioImageSrc } from "@/src/lib/portfolio-image-src";

type Props = {
  entertainerProfileId?: string | undefined;
  venueId?: string | undefined;
  existingImageId: string | null;
  onUploaded: (itemId: string) => void;
};

function uploadWithProgress(
  formData: FormData,
  onProgress: (percent: number) => void,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/portfolio/upload");
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };
    xhr.onload = () => {
      try {
        const payload = JSON.parse(xhr.responseText) as {
          ok?: boolean;
          error?: string;
          id?: string;
        };
        resolve({
          ok: Boolean(payload.ok),
          ...(payload.error ? { error: payload.error } : {}),
          ...(payload.id ? { id: payload.id } : {}),
        });
      } catch {
        resolve({ ok: false, error: "parse_error" });
      }
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(formData);
  });
}

/** Single hero-slot upload for the onboarding wizard. */
export function WizardHeroUpload({
  entertainerProfileId,
  venueId,
  existingImageId,
  onUploaded,
}: Props) {
  const t = useTranslations("onboardingFlow");
  const tProfile = useTranslations("profile");
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(existingImageId);

  async function handleFile(file: File | null) {
    if (!file) return;
    if (!entertainerProfileId && !venueId) {
      setError(t("saveFailed"));
      return;
    }
    setError(null);
    setPending(true);
    setProgress(0);
    const formData = new FormData();
    formData.set("file", file);
    if (entertainerProfileId) {
      formData.set("entertainerProfileId", entertainerProfileId);
    }
    if (venueId) {
      formData.set("venueId", venueId);
    }
    try {
      const result = await uploadWithProgress(formData, setProgress);
      if (!result.ok || !result.id) {
        setError(result.error ?? t("saveFailed"));
        return;
      }
      setPreviewId(result.id);
      onUploaded(result.id);
    } catch {
      setError(t("saveFailed"));
    } finally {
      setPending(false);
      setProgress(0);
    }
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0] ?? null;
    void handleFile(file);
  }

  return (
    <div className="grid gap-3">
      {previewId ? (
        <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--canvas)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={portfolioImageSrc(previewId, "thumb")}
            alt={tProfile("portfolioImageAltFallback")}
            className="h-full w-full object-cover"
          />
          <span className="absolute top-2 left-2 rounded-full border border-[var(--rule)] bg-[var(--surface)]/95 px-2.5 py-1 text-[0.65rem] font-semibold tracking-[0.08em] text-[var(--ink)] uppercase">
            {tProfile("portfolioHero")}
          </span>
        </div>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
          className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--rule)] bg-[var(--surface)] px-4 text-center text-sm text-[var(--text-muted)] hover:border-[var(--primary)]"
        >
          <span aria-hidden className="text-2xl text-[var(--ink)]">
            ▤
          </span>
          <span>{t("heroUploadHint")}</span>
          {pending ? (
            <span className="tabular text-xs">{progress}%</span>
          ) : null}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          event.target.value = "";
          void handleFile(file);
        }}
      />
      {previewId ? (
        <button
          type="button"
          className="text-sm font-medium text-[var(--primary)] underline-offset-4 hover:underline"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          {tProfile("portfolioAddImage")}
        </button>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
