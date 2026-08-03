"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  addPortfolioLink,
  addPortfolioYouTube,
  registerPortfolioImage,
  removePortfolioItem,
  reorderPortfolioItems,
} from "@/src/actions/portfolio";
import { YouTubeEmbed } from "@/src/components/youtube-embed";
import { Button } from "@/src/components/ui/button";
import { useRouter } from "@/src/i18n/navigation";
import { validateYouTubeUrl } from "@/src/domain/youtube";

export type PortfolioItemRow = {
  id: string;
  kind: "image" | "link" | "youtube";
  caption: string | null;
  altText: string | null;
  url: string | null;
  blobKey: string | null;
  sortOrder: number;
};

type Props = {
  locale: "en" | "de";
  entertainerProfileId: string;
  items: PortfolioItemRow[];
};

export function PortfolioEditor({
  locale,
  entertainerProfileId,
  items,
}: Props) {
  const t = useTranslations("profile");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function moveItem(index: number, direction: -1 | 1) {
    const next = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const swapped = [...next];
    [swapped[index], swapped[target]] = [swapped[target]!, swapped[index]!];
    startTransition(async () => {
      const result = await reorderPortfolioItems({
        entertainerProfileId,
        orderedIds: swapped.map((item) => item.id),
        locale,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="grid gap-4">
      <div>
        <h3 className="text-sm font-semibold tracking-[0.12em] uppercase">
          {t("portfolioTitle")}
        </h3>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {t("portfolioBody")}
        </p>
      </div>

      {sorted.length > 0 ? (
        <ul className="grid gap-3">
          {sorted.map((item, index) => (
            <li
              key={item.id}
              className="grid gap-2 border border-[var(--rule)] p-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium uppercase tracking-wide">
                  {item.kind}
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    pending={pending}
                    pendingLabel={ui("working")}
                    onClick={() => moveItem(index, -1)}
                  >
                    {t("portfolioMoveUp")}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    pending={pending}
                    pendingLabel={ui("working")}
                    onClick={() => moveItem(index, 1)}
                  >
                    {t("portfolioMoveDown")}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    pending={pending}
                    pendingLabel={ui("working")}
                    onClick={() => {
                      setError(null);
                      startTransition(async () => {
                        const result = await removePortfolioItem({
                          entertainerProfileId,
                          itemId: item.id,
                          locale,
                        });
                        if (!result.ok) {
                          setError(result.message);
                          return;
                        }
                        router.refresh();
                      });
                    }}
                  >
                    {t("portfolioRemove")}
                  </Button>
                </div>
              </div>
              {item.caption ? <p>{item.caption}</p> : null}
              {item.kind === "link" && item.url ? (
                <a href={item.url} className="text-[var(--primary)]">
                  {item.url}
                </a>
              ) : null}
              {item.kind === "youtube" && item.url ? (
                <YouTubeEmbed
                  url={item.url}
                  {...(item.caption ? { title: item.caption } : {})}
                />
              ) : null}
              {item.kind === "image" ? (
                <div className="grid gap-1">
                  {item.altText ? (
                    <p className="text-[var(--text-muted)]">
                      {t("portfolioAlt")}: {item.altText}
                    </p>
                  ) : null}
                  <p className="text-[var(--text-muted)]">
                    {t("portfolioImagePending")}
                  </p>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">{t("portfolioEmpty")}</p>
      )}

      <form
        className="grid gap-2 border-t border-[var(--rule)] pt-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          setMessage(null);
          const form = new FormData(event.currentTarget);
          startTransition(async () => {
            const result = await addPortfolioLink({
              entertainerProfileId,
              url: String(form.get("linkUrl") ?? ""),
              caption: String(form.get("linkCaption") ?? "") || undefined,
              locale,
            });
            if (!result.ok) {
              setError(result.message);
              return;
            }
            setMessage(t("portfolioSaved"));
            event.currentTarget.reset();
            router.refresh();
          });
        }}
      >
        <p className="text-sm font-medium">{t("portfolioAddLink")}</p>
        <input
          name="linkUrl"
          type="url"
          required
          placeholder="https://"
          className="field text-sm"
        />
        <input
          name="linkCaption"
          placeholder={t("portfolioCaption")}
          className="field text-sm"
        />
        <Button
          type="submit"
          variant="secondary"
          pending={pending}
          pendingLabel={ui("working")}
        >
          {t("portfolioAddLink")}
        </Button>
      </form>

      <form
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          setMessage(null);
          const form = new FormData(event.currentTarget);
          const url = String(form.get("youtubeUrl") ?? "");
          const parsed = validateYouTubeUrl(url);
          if (!parsed.ok) {
            setError(parsed.reason);
            return;
          }
          startTransition(async () => {
            const result = await addPortfolioYouTube({
              entertainerProfileId,
              url,
              caption: String(form.get("youtubeCaption") ?? "") || undefined,
              locale,
            });
            if (!result.ok) {
              setError(result.message);
              return;
            }
            setMessage(t("portfolioSaved"));
            event.currentTarget.reset();
            router.refresh();
          });
        }}
      >
        <p className="text-sm font-medium">{t("portfolioAddYouTube")}</p>
        <input
          name="youtubeUrl"
          type="url"
          required
          placeholder="https://www.youtube.com/watch?v="
          className="field text-sm"
        />
        <input
          name="youtubeCaption"
          placeholder={t("portfolioCaption")}
          className="field text-sm"
        />
        <Button
          type="submit"
          variant="secondary"
          pending={pending}
          pendingLabel={ui("working")}
        >
          {t("portfolioAddYouTube")}
        </Button>
      </form>

      <form
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          setMessage(null);
          const form = new FormData(event.currentTarget);
          const file = form.get("imageFile");
          if (!(file instanceof File) || file.size === 0) {
            setError(t("portfolioImageRequired"));
            return;
          }
          startTransition(async () => {
            const result = await registerPortfolioImage({
              entertainerProfileId,
              mimeType: file.type,
              sizeBytes: file.size,
              caption: String(form.get("imageCaption") ?? "") || undefined,
              altText: String(form.get("imageAlt") ?? "") || undefined,
              locale,
            });
            if (!result.ok) {
              setError(result.message);
              return;
            }
            setMessage(t("portfolioSaved"));
            event.currentTarget.reset();
            router.refresh();
          });
        }}
      >
        <p className="text-sm font-medium">{t("portfolioAddImage")}</p>
        <input
          name="imageFile"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className="field text-sm"
        />
        <input
          name="imageCaption"
          placeholder={t("portfolioCaption")}
          className="field text-sm"
        />
        <input
          name="imageAlt"
          placeholder={t("portfolioAlt")}
          className="field text-sm"
        />
        <Button
          type="submit"
          variant="secondary"
          pending={pending}
          pendingLabel={ui("working")}
        >
          {t("portfolioAddImage")}
        </Button>
      </form>

      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm">{message}</p> : null}
    </div>
  );
}
