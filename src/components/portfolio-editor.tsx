"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  defaultDropAnimationSideEffects,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type DragEvent,
  type HTMLAttributes,
} from "react";
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
import { portfolioImageSrc } from "@/src/lib/portfolio-image-src";

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

type PendingUpload = {
  localId: string;
  previewUrl: string;
  progress: number;
  fileName: string;
};

const dropAnimation: DropAnimation = {
  duration: 180,
  easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.4" } },
  }),
};

function serverImageList(items: PortfolioItemRow[]) {
  return [...items]
    .filter((item) => item.kind === "image")
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function imageSignature(items: PortfolioItemRow[]) {
  return serverImageList(items)
    .map((item) => item.id)
    .join("|");
}

function uploadWithProgress(
  formData: FormData,
  onProgress: (percent: number) => void,
): Promise<{
  ok: boolean;
  error?: string;
  id?: string;
  blobKey?: string;
}> {
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
          blobKey?: string;
        };
        resolve({
          ok: Boolean(payload.ok),
          ...(payload.error ? { error: payload.error } : {}),
          ...(payload.id ? { id: payload.id } : {}),
          ...(payload.blobKey ? { blobKey: payload.blobKey } : {}),
        });
      } catch {
        resolve({ ok: false, error: "parse_error" });
      }
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(formData);
  });
}

function PortfolioImageTile({
  item,
  isHero,
  pending,
  onRemove,
  dragHandleProps,
  setNodeRef,
  style,
  isDragging,
  overlay,
}: {
  item: PortfolioItemRow;
  isHero?: boolean;
  pending: boolean;
  onRemove?: () => void;
  dragHandleProps?: HTMLAttributes<HTMLElement>;
  setNodeRef?: (node: HTMLElement | null) => void;
  style?: CSSProperties;
  isDragging?: boolean;
  overlay?: boolean;
}) {
  const t = useTranslations("profile");

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`relative aspect-square overflow-hidden rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--canvas)] ${
        overlay
          ? "w-36 cursor-grabbing shadow-[0_12px_28px_rgba(20,24,22,0.22)] ring-2 ring-[var(--primary)] sm:w-40"
          : "cursor-grab"
      } ${isDragging ? "opacity-30" : ""}`}
      {...(dragHandleProps ?? {})}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={portfolioImageSrc(item.id, "thumb")}
        alt={item.altText || item.caption || t("portfolioImageAltFallback")}
        className="pointer-events-none h-full w-full object-cover"
        draggable={false}
      />
      {isHero ? (
        <span className="absolute top-2 left-2 z-10 rounded-full border border-[var(--rule)] bg-[var(--surface)]/95 px-2.5 py-1 text-[0.65rem] font-semibold tracking-[0.08em] text-[var(--ink)] uppercase">
          {t("portfolioHero")}
        </span>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          disabled={pending}
          aria-label={t("portfolioRemove")}
          onClick={onRemove}
          onPointerDown={(event) => event.stopPropagation()}
          className="absolute top-2 right-2 z-10 inline-flex size-7 items-center justify-center rounded-full bg-[rgba(20,24,22,0.82)] text-base leading-none text-white"
        >
          ×
        </button>
      ) : null}
    </li>
  );
}

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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <PortfolioImageTile
      item={item}
      {...(isHero ? { isHero: true } : {})}
      pending={pending}
      onRemove={onRemove}
      setNodeRef={setNodeRef}
      style={style}
      isDragging={isDragging}
      dragHandleProps={{ ...attributes, ...listeners }}
    />
  );
}

function PendingUploadTile({
  upload,
  isHero,
}: {
  upload: PendingUpload;
  isHero?: boolean;
}) {
  const t = useTranslations("profile");
  return (
    <li className="relative aspect-square overflow-hidden rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--canvas)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={upload.previewUrl}
        alt={upload.fileName || t("portfolioImageAltFallback")}
        className="h-full w-full object-cover"
      />
      <span className="absolute inset-0 bg-[rgba(20,24,22,0.45)]" />
      {isHero ? (
        <span className="absolute top-2 left-2 z-10 rounded-full border border-[var(--rule)] bg-[var(--surface)]/95 px-2.5 py-1 text-[0.65rem] font-semibold tracking-[0.08em] text-[var(--ink)] uppercase">
          {t("portfolioHero")}
        </span>
      ) : null}
      <span className="absolute inset-x-3 bottom-3 z-10">
        <span className="mb-1.5 block h-1.5 overflow-hidden rounded-full bg-white/30">
          <span
            className="block h-full rounded-full bg-white transition-[width] duration-150"
            style={{ width: `${upload.progress}%` }}
          />
        </span>
        <span className="block text-center text-[0.65rem] font-semibold text-white">
          {upload.progress}%
        </span>
      </span>
    </li>
  );
}

function EmptySlot({
  showLabel,
  disabled,
  onBrowse,
}: {
  showLabel: boolean;
  disabled: boolean;
  onBrowse: () => void;
}) {
  const t = useTranslations("profile");
  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={onBrowse}
        className="grid aspect-square w-full place-items-center rounded-[var(--radius-md)] border-[1.5px] border-dashed border-[color-mix(in_srgb,var(--text-muted)_40%,var(--rule))] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[color-mix(in_srgb,var(--primary)_40%,var(--rule))]"
        aria-label={t("portfolioAddImage")}
      >
        <span className="text-center">
          <span className="block text-2xl leading-none font-light">+</span>
          {showLabel ? (
            <span className="mt-1 block text-[0.7rem] font-medium">
              {t("portfolioAddShort")}
            </span>
          ) : null}
        </span>
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
  const reactId = useId();
  const uploadSeq = useRef(0);
  const [, startTransition] = useTransition();
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [draggingOver, setDraggingOver] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [youtubeDraft, setYoutubeDraft] = useState("");
  const [youtubeStatus, setYoutubeStatus] = useState<
    "idle" | "valid" | "invalid"
  >("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [images, setImages] = useState<PortfolioItemRow[]>(() =>
    serverImageList(items),
  );
  const [syncedKey, setSyncedKey] = useState(() => imageSignature(items));
  const persistGeneration = useRef(0);

  const serverImages = useMemo(() => serverImageList(items), [items]);
  const serverImageKey = useMemo(() => imageSignature(items), [items]);

  // Drop optimistic-remove markers once the server no longer has those rows.
  if (removedIds.length > 0) {
    const stillPendingRemove = removedIds.filter((id) =>
      serverImages.some((item) => item.id === id),
    );
    if (stillPendingRemove.length !== removedIds.length) {
      setRemovedIds(stillPendingRemove);
    }
  }

  // Sync from server when props change, unless a delete is still in flight.
  if (removedIds.length === 0 && syncedKey !== serverImageKey) {
    setSyncedKey(serverImageKey);
    setImages(serverImages);
  }

  const youtube = items.find((item) => item.kind === "youtube") ?? null;
  const imageIds = images.map((item) => item.id);
  const emptySlots = Math.max(
    0,
    PORTFOLIO_MAX_IMAGES - images.length - pendingUploads.length,
  );
  const activeItem =
    activeId != null
      ? (images.find((item) => item.id === activeId) ?? null)
      : null;
  const activeIsHero = Boolean(activeItem && images[0]?.id === activeItem.id);
  const showGrid = images.length > 0 || pendingUploads.length > 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!videoOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setVideoOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [videoOpen]);

  useEffect(() => {
    return () => {
      for (const upload of pendingUploads) {
        URL.revokeObjectURL(upload.previewUrl);
      }
    };
    // Only revoke on unmount; individual uploads revoke on completion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persistOrder(nextImages: PortfolioItemRow[]) {
    const generation = ++persistGeneration.current;
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
      if (generation !== persistGeneration.current) return;
      if (!result.ok) {
        setMediaError(result.message);
        setImages(serverImages.filter((item) => !removedIds.includes(item.id)));
        return;
      }
      router.refresh();
    });
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = imageIds.indexOf(String(active.id));
    const newIndex = imageIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(images, oldIndex, newIndex);
    setImages(next);
    setMediaError(null);
    persistOrder(next);
  }

  function onDragCancel() {
    setActiveId(null);
  }

  function isFileDrag(event: { dataTransfer: DataTransfer | null }) {
    return Array.from(event.dataTransfer?.types ?? []).includes("Files");
  }

  function onFileDragEnter(event: DragEvent<HTMLElement>) {
    if (!isFileDrag(event) || activeId) return;
    event.preventDefault();
    event.stopPropagation();
    setDraggingOver(true);
  }

  function onFileDragOver(event: DragEvent<HTMLElement>) {
    if (!isFileDrag(event) || activeId) return;
    event.preventDefault();
    event.stopPropagation();
    setDraggingOver(true);
  }

  function onFileDragLeave(event: DragEvent<HTMLElement>) {
    if (!isFileDrag(event)) return;
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setDraggingOver(false);
  }

  function onFileDrop(event: DragEvent<HTMLElement>) {
    if (!isFileDrag(event) || activeId) return;
    event.preventDefault();
    event.stopPropagation();
    setDraggingOver(false);
    if (event.dataTransfer.files?.length) {
      void uploadFiles(event.dataTransfer.files);
    }
  }

  async function uploadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((file) => file.size > 0);
    if (files.length === 0) return;

    const remaining =
      PORTFOLIO_MAX_IMAGES - images.length - pendingUploads.length;
    if (remaining <= 0) {
      setMediaError(t("portfolioImageLimit", { max: PORTFOLIO_MAX_IMAGES }));
      return;
    }

    const toUpload = files.slice(0, remaining);
    if (files.length > remaining) {
      setMediaError(t("portfolioImageLimit", { max: PORTFOLIO_MAX_IMAGES }));
    } else {
      setMediaError(null);
    }

    const batch: PendingUpload[] = toUpload.map((file) => {
      uploadSeq.current += 1;
      return {
        localId: `${reactId}-up-${uploadSeq.current}`,
        previewUrl: URL.createObjectURL(file),
        progress: 0,
        fileName: file.name,
      };
    });

    setPendingUploads((current) => [...current, ...batch]);

    for (let index = 0; index < toUpload.length; index += 1) {
      const file = toUpload[index]!;
      const pending = batch[index]!;
      const body = new FormData();
      body.set("entertainerProfileId", entertainerProfileId);
      body.set("file", file);
      body.set("altText", file.name.replace(/\.[^.]+$/, ""));

      try {
        const result = await uploadWithProgress(body, (percent) => {
          setPendingUploads((current) =>
            current.map((item) =>
              item.localId === pending.localId
                ? { ...item, progress: percent }
                : item,
            ),
          );
        });

        URL.revokeObjectURL(pending.previewUrl);
        setPendingUploads((current) =>
          current.filter((item) => item.localId !== pending.localId),
        );

        if (!result.ok || !result.id) {
          if (result.error === "image_limit") {
            setMediaError(
              t("portfolioImageLimit", { max: PORTFOLIO_MAX_IMAGES }),
            );
          } else {
            setMediaError(t("portfolioUploadFailed"));
          }
          continue;
        }

        const createdId = result.id;
        const createdBlobKey = result.blobKey ?? null;
        setImages((current) => {
          if (current.some((item) => item.id === createdId)) return current;
          return [
            ...current,
            {
              id: createdId,
              kind: "image" as const,
              caption: null,
              altText: file.name.replace(/\.[^.]+$/, "") || null,
              url: null,
              blobKey: createdBlobKey,
              sortOrder: current.length,
            },
          ];
        });
      } catch {
        URL.revokeObjectURL(pending.previewUrl);
        setPendingUploads((current) =>
          current.filter((item) => item.localId !== pending.localId),
        );
        setMediaError(t("portfolioUploadFailed"));
      }
    }

    router.refresh();
  }

  function saveYouTube(url: string) {
    const parsed = validateYouTubeUrl(url);
    if (!parsed.ok) {
      setYoutubeStatus("invalid");
      setVideoError(parsed.reason);
      return;
    }
    setVideoError(null);
    startTransition(async () => {
      const result = await addPortfolioYouTube({
        entertainerProfileId,
        url: parsed.canonicalUrl,
        locale,
      });
      if (!result.ok) {
        setVideoError(result.message);
        return;
      }
      setYoutubeDraft("");
      setYoutubeStatus("idle");
      router.refresh();
    });
  }

  function removeImage(itemId: string) {
    setMediaError(null);
    const removed = images.find((item) => item.id === itemId) ?? null;
    setImages((current) => current.filter((item) => item.id !== itemId));
    setRemovedIds((current) =>
      current.includes(itemId) ? current : [...current, itemId],
    );

    startTransition(async () => {
      const result = await removePortfolioItem({
        entertainerProfileId,
        itemId,
        locale,
      });
      if (!result.ok) {
        setMediaError(result.message);
        if (removed) {
          setImages((current) => {
            if (current.some((item) => item.id === itemId)) return current;
            return [...current, removed].sort(
              (a, b) => a.sortOrder - b.sortOrder,
            );
          });
        }
        setRemovedIds((current) => current.filter((id) => id !== itemId));
        return;
      }
      router.refresh();
    });
  }

  function renderEmptySlots() {
    return Array.from({ length: emptySlots }).map((_, index) => (
      <EmptySlot
        key={`empty-${index}`}
        showLabel={index === 0}
        disabled={pendingUploads.length > 0}
        onBrowse={() => fileInputRef.current?.click()}
      />
    ));
  }

  function renderImageGrid(interactive: boolean) {
    return (
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {images.map((item, index) =>
          interactive ? (
            <SortableImageTile
              key={item.id}
              item={item}
              isHero={index === 0}
              pending={false}
              onRemove={() => removeImage(item.id)}
            />
          ) : (
            <li
              key={item.id}
              className="relative aspect-square overflow-hidden rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--canvas)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={portfolioImageSrc(item.id, "thumb")}
                alt={
                  item.altText || item.caption || t("portfolioImageAltFallback")
                }
                className="h-full w-full object-cover"
              />
              {index === 0 ? (
                <span className="absolute top-2 left-2 z-10 rounded-full border border-[var(--rule)] bg-[var(--surface)]/95 px-2.5 py-1 text-[0.65rem] font-semibold tracking-[0.08em] text-[var(--ink)] uppercase">
                  {t("portfolioHero")}
                </span>
              ) : null}
            </li>
          ),
        )}

        {pendingUploads.map((upload, index) => (
          <PendingUploadTile
            key={upload.localId}
            upload={upload}
            isHero={images.length === 0 && index === 0}
          />
        ))}

        {renderEmptySlots()}
      </ul>
    );
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

      <div
        className={`relative rounded-[var(--radius-md)] transition-[box-shadow,background-color] ${
          draggingOver && !activeId
            ? "bg-[var(--success-soft)] ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--surface)]"
            : ""
        }`}
        onDragEnter={onFileDragEnter}
        onDragOver={onFileDragOver}
        onDragLeave={onFileDragLeave}
        onDrop={onFileDrop}
      >
        {draggingOver && !activeId ? (
          <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--surface)_55%,transparent)]">
            <span className="rounded-full border border-[var(--rule)] bg-[var(--surface)] px-3 py-1.5 text-sm font-semibold text-[var(--ink)]">
              {images.length + pendingUploads.length >= PORTFOLIO_MAX_IMAGES
                ? t("portfolioDropLimit")
                : t("portfolioDropImages")}
            </span>
          </div>
        ) : null}

        {!showGrid ? (
          <EmptyHeroDropzone
            draggingOver={draggingOver}
            pending={pendingUploads.length > 0}
            onBrowse={() => fileInputRef.current?.click()}
          />
        ) : !mounted ? (
          renderImageGrid(false)
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragCancel={onDragCancel}
          >
            <SortableContext items={imageIds} strategy={rectSortingStrategy}>
              {renderImageGrid(true)}
            </SortableContext>

            <DragOverlay dropAnimation={dropAnimation}>
              {activeItem ? (
                <ul className="m-0 list-none p-0">
                  <PortfolioImageTile
                    item={activeItem}
                    {...(activeIsHero ? { isHero: true } : {})}
                    pending={false}
                    overlay
                  />
                </ul>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {mediaError ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {mediaError}
        </p>
      ) : null}

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
                  onClick={() => {
                    startTransition(async () => {
                      const result = await removePortfolioItem({
                        entertainerProfileId,
                        itemId: youtube.id,
                        locale,
                      });
                      if (!result.ok) {
                        setVideoError(result.message);
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
        {videoError ? (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {videoError}
          </p>
        ) : null}
      </div>

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
