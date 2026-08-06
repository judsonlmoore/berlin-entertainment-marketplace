"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  addPortfolioYouTube,
  removePortfolioItem,
  reorderPortfolioItems,
} from "@/src/actions/portfolio";
import { YouTubeEmbed } from "@/src/components/youtube-embed";
import { useRouter } from "@/src/i18n/navigation";
import { PORTFOLIO_MAX_IMAGES } from "@/src/domain/portfolio";
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

function SortableImageTile({
  item,
  isHero,
  pending,
  onRemove,
}: {
  item: PortfolioItemRow;
  isHero?: boolean;
  pending: boolean;
  onRemove: () => void;
}) {
  const t = useTranslations("profile");
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`relative cursor-grab overflow-hidden rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--canvas)] ${
        isHero ? "aspect-[16/9]" : "aspect-square"
      } ${isDragging ? "z-10 opacity-90" : ""}`}
      {...attributes}
      {...listeners}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/portfolio/${item.id}`}
        alt={item.altText || item.caption || t("portfolioImageAltFallback")}
        className="pointer-events-none h-full w-full object-cover"
        draggable={false}
      />
      {isHero ? (
        <span className="absolute top-2 left-2 z-10 rounded-full border border-[var(--rule)] bg-[var(--surface)]/95 px-2.5 py-1 text-[0.65rem] font-semibold tracking-[0.08em] text-[var(--ink)] uppercase">
          {t("portfolioHero")}
        </span>
      ) : null}
      <button
        type="button"
        disabled={pending}
        aria-label={t("portfolioRemove")}
        onClick={onRemove}
        className="absolute top-2 right-2 z-10 inline-flex size-7 items-center justify-center rounded-full bg-[rgba(20,24,22,0.82)] text-base leading-none text-white"
      >
        ×
      </button>
    </li>
  );
}

function EmptyHeroDropzone({
  draggingOver,
  pending,
  onBrowse,
}: {
  draggingOver: boolean;
  pending: boolean;
  onBrowse: () => void;
}) {
  const t = useTranslations("profile");
  return (
    <button
      type="button"
      disabled={pending}
      onClick={onBrowse}
      className={`grid aspect-[16/9] w-full place-items-center rounded-[var(--radius-md)] border-[1.5px] border-dashed bg-[var(--surface)] px-4 text-center transition-colors ${
        draggingOver
          ? "border-[var(--primary)] bg-[var(--success-soft)]"
          : "border-[color-mix(in_srgb,var(--text-muted)_40%,var(--rule))]"
      }`}
    >
      <span>
        <span
          className="mx-auto mb-2 flex size-9 items-center justify-center text-[var(--ink)]"
          aria-hidden
        >
          <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
            <rect
              x="1"
              y="5"
              width="18"
              height="14"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.5"
              opacity="0.35"
              transform="rotate(-8 10 12)"
            />
            <rect
              x="7"
              y="3"
              width="18"
              height="14"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <circle cx="12" cy="8" r="1.5" fill="currentColor" />
            <path
              d="M8 15l3.5-3.5L15 14l3-4 5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        </span>
        <span className="block text-sm font-semibold text-[var(--ink)]">
          {t("portfolioDropHero")}
        </span>
        <span className="mt-1 block text-xs text-[var(--text-muted)]">
          {t("portfolioDropHeroHint")}
        </span>
      </span>
    </button>
  );
}

export function PortfolioEditor({
  locale,
  entertainerProfileId,
  items,
}: Props) {
  const t = useTranslations("profile");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [draggingOver, setDraggingOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [youtubeDraft, setYoutubeDraft] = useState("");
  const [youtubeStatus, setYoutubeStatus] = useState<
    "idle" | "valid" | "invalid"
  >("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  const images = [...items]
    .filter((item) => item.kind === "image")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const youtube = items.find((item) => item.kind === "youtube") ?? null;
  const imageIds = images.map((item) => item.id);
  const emptySlots = Math.max(0, PORTFOLIO_MAX_IMAGES - images.length);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!videoOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setVideoOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [videoOpen]);

  function persistOrder(nextImages: PortfolioItemRow[]) {
    const orderedIds = [
      ...nextImages.map((item) => item.id),
      ...items
        .filter((item) => item.kind !== "image")
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item) => item.id),
    ];
    startTransition(async () => {
      const result = await reorderPortfolioItems({
        entertainerProfileId,
        orderedIds,
        locale,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = imageIds.indexOf(String(active.id));
    const newIndex = imageIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    persistOrder(arrayMove(images, oldIndex, newIndex));
  }

  async function uploadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((file) => file.size > 0);
    if (files.length === 0) return;
    setError(null);

    const remaining = PORTFOLIO_MAX_IMAGES - images.length;
    if (remaining <= 0) {
      setError(t("portfolioImageLimit"));
      return;
    }

    const toUpload = files.slice(0, remaining);
    setUploading(true);
    startTransition(async () => {
      try {
        for (const file of toUpload) {
          const body = new FormData();
          body.set("entertainerProfileId", entertainerProfileId);
          body.set("file", file);
          body.set("altText", file.name.replace(/\.[^.]+$/, ""));
          const response = await fetch("/api/portfolio/upload", {
            method: "POST",
            body,
          });
          const payload = (await response.json()) as {
            ok?: boolean;
            error?: string;
          };
          if (!response.ok || !payload.ok) {
            setError(payload.error ?? t("portfolioUploadFailed"));
            return;
          }
        }
        router.refresh();
      } finally {
        setUploading(false);
      }
    });
  }

  function saveYouTube(url: string) {
    const parsed = validateYouTubeUrl(url);
    if (!parsed.ok) {
      setYoutubeStatus("invalid");
      setError(parsed.reason);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await addPortfolioYouTube({
        entertainerProfileId,
        url: parsed.canonicalUrl,
        locale,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setYoutubeDraft("");
      setYoutubeStatus("idle");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-[var(--text-muted)]">
        {t("portfolioReorderHint")}
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(event) => {
          if (event.target.files?.length) {
            void uploadFiles(event.target.files);
            event.target.value = "";
          }
        }}
      />

      {images.length === 0 ? (
        <div
          onDragEnter={(event) => {
            event.preventDefault();
            setDraggingOver(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDraggingOver(true);
          }}
          onDragLeave={() => setDraggingOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDraggingOver(false);
            if (event.dataTransfer.files?.length) {
              void uploadFiles(event.dataTransfer.files);
            }
          }}
        >
          <EmptyHeroDropzone
            draggingOver={draggingOver}
            pending={pending}
            onBrowse={() => fileInputRef.current?.click()}
          />
          {uploading ? (
            <div className="relative mt-3 aspect-square max-w-[140px] overflow-hidden rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--canvas)]">
              <span className="absolute inset-0 bg-[rgba(20,24,22,0.45)]" />
              <span className="absolute inset-0 m-auto size-6 animate-spin rounded-full border-2 border-white/35 border-t-white" />
            </div>
          ) : null}
        </div>
      ) : !mounted ? (
        <div className="grid gap-3">
          {images[0] ? (
            <ul className="grid gap-3">
              <li className="relative aspect-[16/9] overflow-hidden rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--canvas)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/portfolio/${images[0].id}`}
                  alt={
                    images[0].altText ||
                    images[0].caption ||
                    t("portfolioImageAltFallback")
                  }
                  className="h-full w-full object-cover"
                />
                <span className="absolute top-2 left-2 z-10 rounded-full border border-[var(--rule)] bg-[var(--surface)]/95 px-2.5 py-1 text-[0.65rem] font-semibold tracking-[0.08em] text-[var(--ink)] uppercase">
                  {t("portfolioHero")}
                </span>
              </li>
            </ul>
          ) : null}
          {images.length > 1 ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {images.slice(1).map((item) => (
                <li
                  key={item.id}
                  className="aspect-square overflow-hidden rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--canvas)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/portfolio/${item.id}`}
                    alt={
                      item.altText ||
                      item.caption ||
                      t("portfolioImageAltFallback")
                    }
                    className="h-full w-full object-cover"
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={imageIds} strategy={rectSortingStrategy}>
            <div className="grid gap-3">
              {images[0] ? (
                <ul className="grid gap-3">
                  <SortableImageTile
                    key={images[0].id}
                    item={images[0]}
                    isHero
                    pending={pending}
                    onRemove={() => {
                      setError(null);
                      startTransition(async () => {
                        const result = await removePortfolioItem({
                          entertainerProfileId,
                          itemId: images[0]!.id,
                          locale,
                        });
                        if (!result.ok) {
                          setError(result.message);
                          return;
                        }
                        router.refresh();
                      });
                    }}
                  />
                </ul>
              ) : null}

              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {images.slice(1).map((item) => (
                  <SortableImageTile
                    key={item.id}
                    item={item}
                    pending={pending}
                    onRemove={() => {
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
                  />
                ))}

                {uploading ? (
                  <li className="relative aspect-square overflow-hidden rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--canvas)]">
                    <span className="absolute inset-0 bg-[rgba(20,24,22,0.45)]" />
                    <span className="absolute inset-0 m-auto size-6 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                  </li>
                ) : null}

                {Array.from({ length: emptySlots }).map((_, index) => (
                  <li key={`empty-${index}`}>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => fileInputRef.current?.click()}
                      className="grid aspect-square w-full place-items-center rounded-[var(--radius-md)] border-[1.5px] border-dashed border-[color-mix(in_srgb,var(--text-muted)_40%,var(--rule))] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[color-mix(in_srgb,var(--primary)_40%,var(--rule))]"
                      aria-label={t("portfolioAddImage")}
                    >
                      <span className="text-center">
                        <span className="block text-2xl leading-none font-light">
                          +
                        </span>
                        {index === 0 ? (
                          <span className="mt-1 block text-[0.7rem] font-medium">
                            {t("portfolioAddShort")}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="grid gap-2">
        <span className="text-sm font-medium text-[var(--ink)]">
          {t("portfolioYouTubeTitle")}
        </span>
        {youtube?.url ? (
          <div className="grid gap-3">
            <div className="relative">
              <input
                className="field w-full pr-20"
                value={youtube.url}
                readOnly
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-[var(--primary)]">
                {t("urlValid")}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-[180px_1fr] sm:items-center">
              <button
                type="button"
                onClick={() => setVideoOpen(true)}
                className="relative aspect-video overflow-hidden rounded-[var(--radius-sm)] border border-[var(--rule)] bg-[#1e2a25]"
                aria-label={t("portfolioPlayVideo")}
              >
                <span className="absolute inset-0 m-auto h-0 w-0 border-y-[10px] border-r-0 border-l-[16px] border-y-transparent border-l-white" />
              </button>
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">
                  {youtube.caption || t("portfolioYouTubeTitle")}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {t("portfolioPlayHint")}
                </p>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await removePortfolioItem({
                        entertainerProfileId,
                        itemId: youtube.id,
                        locale,
                      });
                      if (!result.ok) {
                        setError(result.message);
                        return;
                      }
                      router.refresh();
                    });
                  }}
                  className="mt-2 text-xs font-medium text-[var(--danger)]"
                >
                  {t("portfolioRemoveYouTube")}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative">
            <input
              className={`field w-full pr-20 ${
                youtubeStatus === "invalid" ? "border-[var(--danger)]" : ""
              } ${youtubeStatus === "valid" ? "border-[color-mix(in_srgb,var(--primary)_45%,var(--rule))]" : ""}`}
              value={youtubeDraft}
              placeholder="https://youtu.be/…"
              onChange={(event) => {
                const next = event.target.value;
                setYoutubeDraft(next);
                if (!next.trim()) {
                  setYoutubeStatus("idle");
                  return;
                }
                const parsed = validateYouTubeUrl(next);
                setYoutubeStatus(parsed.ok ? "valid" : "invalid");
              }}
              onBlur={() => {
                if (
                  youtubeDraft.trim() &&
                  validateYouTubeUrl(youtubeDraft).ok
                ) {
                  saveYouTube(youtubeDraft);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  saveYouTube(youtubeDraft);
                }
              }}
            />
            {youtubeStatus !== "idle" ? (
              <span
                className={`pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold ${
                  youtubeStatus === "valid"
                    ? "text-[var(--primary)]"
                    : "text-[var(--danger)]"
                }`}
              >
                {youtubeStatus === "valid" ? t("urlValid") : t("urlInvalid")}
              </span>
            ) : null}
          </div>
        )}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      {videoOpen && youtube?.url ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[rgba(20,24,22,0.55)] p-6"
          role="dialog"
          aria-modal="true"
          aria-label={t("portfolioYouTubeTitle")}
          onClick={(event) => {
            if (event.target === event.currentTarget) setVideoOpen(false);
          }}
        >
          <div className="w-full max-w-3xl overflow-hidden rounded-[12px] border border-[var(--rule)] bg-[var(--surface)]">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--rule)] px-4 py-3">
              <strong className="text-sm font-semibold">
                {youtube.caption || t("portfolioYouTubeTitle")}
              </strong>
              <button
                type="button"
                className="rounded-[var(--radius-sm)] border border-[var(--rule)] px-3 py-2 text-sm font-semibold"
                onClick={() => setVideoOpen(false)}
              >
                {t("portfolioCloseVideo")}
              </button>
            </div>
            <YouTubeEmbed
              url={youtube.url}
              className="aspect-video w-full bg-black"
              {...(youtube.caption ? { title: youtube.caption } : {})}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
