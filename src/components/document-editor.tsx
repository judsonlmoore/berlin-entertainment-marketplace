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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
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
  removeProfileDocument,
  reorderProfileDocuments,
  updateProfileDocumentMeta,
} from "@/src/actions/profile-documents";
import { PROFILE_DOCUMENT_MAX } from "@/src/domain/profile-document";

export type DocumentRow = {
  id: string;
  title: string;
  originalFilename: string | null;
  visibility: "marketplace" | "engagement";
  sortOrder: number;
  sizeBytes: number;
};

type Props = {
  locale: "en" | "de";
  /** Exactly one of entertainerProfileId or venueId is required. */
  entertainerProfileId?: string;
  venueId?: string;
  documents: DocumentRow[];
  storeConfigured: boolean;
};

function documentOwnerFields(
  entertainerProfileId: string | undefined,
  venueId: string | undefined,
): { entertainerProfileId: string } | { venueId: string } | null {
  if (entertainerProfileId && !venueId) {
    return { entertainerProfileId };
  }
  if (venueId && !entertainerProfileId) {
    return { venueId };
  }
  return null;
}

type PendingUpload = {
  localId: string;
  fileName: string;
  progress: number;
};

function docSignature(docs: DocumentRow[]) {
  return [...docs]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((d) => `${d.id}:${d.title}:${d.visibility}`)
    .join("|");
}

function uploadWithProgress(
  formData: FormData,
  onProgress: (percent: number) => void,
): Promise<{
  ok: boolean;
  error?: string;
  id?: string;
  title?: string;
  originalFilename?: string | null;
  visibility?: "marketplace" | "engagement";
  sortOrder?: number;
  sizeBytes?: number;
}> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/documents/upload");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText) as {
          ok?: boolean;
          error?: string;
          id?: string;
          title?: string;
          originalFilename?: string | null;
          visibility?: "marketplace" | "engagement";
          sortOrder?: number;
          sizeBytes?: number;
        };
        resolve({
          ok: Boolean(json.ok),
          ...(json.error ? { error: json.error } : {}),
          ...(json.id ? { id: json.id } : {}),
          ...(json.title ? { title: json.title } : {}),
          ...(json.originalFilename !== undefined
            ? { originalFilename: json.originalFilename }
            : {}),
          ...(json.visibility ? { visibility: json.visibility } : {}),
          ...(typeof json.sortOrder === "number"
            ? { sortOrder: json.sortOrder }
            : {}),
          ...(typeof json.sizeBytes === "number"
            ? { sizeBytes: json.sizeBytes }
            : {}),
        });
      } catch {
        reject(new Error("Invalid upload response"));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(formData);
  });
}

function PdfGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="28"
      height="32"
      viewBox="0 0 28 32"
      fill="none"
      aria-hidden
    >
      <path
        d="M6 2h11l7 7v19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M17 2v6a1 1 0 0 0 1 1h6"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M8 18h12M8 22h8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <text
        x="8"
        y="15"
        fill="currentColor"
        fontSize="6"
        fontWeight="700"
        letterSpacing="0.04em"
      >
        PDF
      </text>
    </svg>
  );
}

function EmptyDocumentDropzone({
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
      className={`grid min-h-[11rem] w-full place-items-center rounded-[var(--radius-md)] border-[1.5px] border-dashed bg-[var(--surface)] px-4 text-center transition-colors ${
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
          <PdfGlyph />
        </span>
        <span className="block text-sm font-semibold text-[var(--ink)]">
          {t("documentDropHero")}
        </span>
        <span className="mt-1 block text-xs text-[var(--text-muted)]">
          {t("documentDropHeroHint")}
        </span>
      </span>
    </button>
  );
}

function PendingDocumentRow({ upload }: { upload: PendingUpload }) {
  return (
    <li className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--canvas)] px-3 py-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--rule)] bg-[var(--surface)] text-[var(--ink)]">
        <PdfGlyph className="scale-90" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--ink)]">
          {upload.fileName}
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--rule)]">
          <div
            className="h-full rounded-full bg-[var(--primary)] transition-[width]"
            style={{ width: `${upload.progress}%` }}
          />
        </div>
        <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">
          {upload.progress}%
        </p>
      </div>
    </li>
  );
}

function DocumentRowCard({
  doc,
  locale,
  owner,
  pending,
  onRemoved,
  onUpdated,
  dragHandleProps,
  setNodeRef,
  style,
  isDragging,
}: {
  doc: DocumentRow;
  locale: "en" | "de";
  owner: { entertainerProfileId: string } | { venueId: string };
  pending: boolean;
  onRemoved: (id: string) => void;
  onUpdated: (doc: DocumentRow) => void;
  dragHandleProps?: HTMLAttributes<HTMLElement>;
  setNodeRef?: (node: HTMLElement | null) => void;
  style?: CSSProperties;
  isDragging?: boolean;
}) {
  const t = useTranslations("profile");
  const [title, setTitle] = useState(doc.title);
  const [error, setError] = useState<string | null>(null);
  const [, startMeta] = useTransition();
  const [isRemoving, startRemove] = useTransition();
  const busy = pending || isRemoving;

  function saveMeta(next: {
    title: string;
    visibility: DocumentRow["visibility"];
  }) {
    startMeta(async () => {
      setError(null);
      const result = await updateProfileDocumentMeta({
        ...owner,
        documentId: doc.id,
        title: next.title,
        visibility: next.visibility,
        locale,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onUpdated({
        ...doc,
        title: next.title.trim(),
        visibility: next.visibility,
      });
    });
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)] px-3 py-3 ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <button
        type="button"
        className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded border border-dashed border-[var(--rule)] text-[var(--text-muted)]"
        aria-label={t("documentDragHandle")}
        {...(dragHandleProps ?? {})}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <circle cx="4" cy="3" r="1.2" />
          <circle cx="10" cy="3" r="1.2" />
          <circle cx="4" cy="7" r="1.2" />
          <circle cx="10" cy="7" r="1.2" />
          <circle cx="4" cy="11" r="1.2" />
          <circle cx="10" cy="11" r="1.2" />
        </svg>
      </button>

      <span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--rule)] bg-[var(--canvas)] text-[var(--ink)]">
        <PdfGlyph className="scale-90" />
      </span>

      <div className="min-w-0 flex-1 basis-[12rem]">
        <label className="sr-only" htmlFor={`doc-title-${doc.id}`}>
          {t("documentTitleLabel")}
        </label>
        <div className="relative">
          <input
            id={`doc-title-${doc.id}`}
            className="field min-h-10 w-full py-2 pr-16 text-sm font-medium"
            value={title}
            placeholder={
              doc.originalFilename?.trim() || t("documentTitlePlaceholder")
            }
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              if (title.trim() === doc.title || !title.trim()) {
                setTitle(doc.title);
                return;
              }
              saveMeta({ title: title.trim(), visibility: doc.visibility });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-[var(--text-muted)]">
            {Math.max(1, Math.round(doc.sizeBytes / 1024))} KB
          </span>
        </div>
        {error ? (
          <p role="alert" className="mt-1 text-xs text-[var(--danger)]">
            {error}
          </p>
        ) : null}
      </div>

      <div className="ml-auto flex flex-wrap items-center justify-end gap-1 sm:gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            const next =
              doc.visibility === "marketplace" ? "engagement" : "marketplace";
            const effectiveTitle =
              doc.title.trim() ||
              doc.originalFilename?.trim() ||
              title.trim() ||
              "PDF";
            saveMeta({ title: effectiveTitle, visibility: next });
          }}
          className={`inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 py-1.5 text-xs font-semibold ${
            doc.visibility === "marketplace"
              ? "border-[var(--primary)] bg-[var(--success-soft)] text-[var(--primary)]"
              : "border-[var(--rule)] bg-[var(--surface)] text-[var(--ink)]"
          }`}
          title={
            doc.visibility === "marketplace"
              ? t("documentVisibilityMarketplace")
              : t("documentVisibilityEngagement")
          }
          aria-label={t("documentVisibilityLabel")}
        >
          {doc.visibility === "marketplace" ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          )}
          {doc.visibility === "marketplace"
            ? t("documentVisibilityMarketplaceShort")
            : t("documentVisibilityEngagementShort")}
        </button>
        <a
          href={`/api/riders/${doc.id}?inline=1`}
          target="_blank"
          rel="noreferrer"
          title={t("documentPreview")}
          aria-label={t("documentPreview")}
          className="inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--rule)] text-[var(--ink)] no-underline"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </a>
        <a
          href={`/api/riders/${doc.id}`}
          title={t("documentDownload")}
          aria-label={t("documentDownload")}
          className="inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--rule)] text-[var(--ink)] no-underline"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </a>
        <button
          type="button"
          disabled={busy}
          aria-busy={isRemoving}
          aria-label={t("documentRemove")}
          onClick={() => {
            startRemove(async () => {
              setError(null);
              const result = await removeProfileDocument({
                ...owner,
                documentId: doc.id,
                locale,
              });
              if (!result.ok) {
                setError(result.message);
                return;
              }
              onRemoved(doc.id);
            });
          }}
          className="inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--danger)] bg-[var(--surface)] text-[var(--danger)] disabled:opacity-60"
        >
          {isRemoving ? (
            <span
              className="inline-block size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
              aria-hidden
            />
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          )}
        </button>
      </div>
    </li>
  );
}

function SortableDocumentRow({
  doc,
  locale,
  owner,
  pending,
  onRemoved,
  onUpdated,
}: {
  doc: DocumentRow;
  locale: "en" | "de";
  owner: { entertainerProfileId: string } | { venueId: string };
  pending: boolean;
  onRemoved: (id: string) => void;
  onUpdated: (doc: DocumentRow) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: doc.id });
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
  };
  return (
    <DocumentRowCard
      doc={doc}
      locale={locale}
      owner={owner}
      pending={pending}
      onRemoved={onRemoved}
      onUpdated={onUpdated}
      setNodeRef={setNodeRef}
      style={style}
      isDragging={isDragging}
      dragHandleProps={{ ...attributes, ...listeners }}
    />
  );
}

export function DocumentEditor({
  locale,
  entertainerProfileId,
  venueId,
  documents,
  storeConfigured,
}: Props) {
  const t = useTranslations("profile");
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const owner = documentOwnerFields(entertainerProfileId, venueId);
  const [items, setItems] = useState(() =>
    [...documents].sort((a, b) => a.sortOrder - b.sortOrder),
  );
  const [syncedKey, setSyncedKey] = useState(() => docSignature(documents));
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pending, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const serverSig = useMemo(() => docSignature(documents), [documents]);
  if (syncedKey !== serverSig) {
    setSyncedKey(serverSig);
    setItems([...documents].sort((a, b) => a.sortOrder - b.sortOrder));
  }

  const canAddMore =
    items.length + pendingUploads.length < PROFILE_DOCUMENT_MAX;
  const showList = items.length > 0 || pendingUploads.length > 0;
  const needOwnerMessage = venueId
    ? t("riderNeedVenue")
    : t("riderNeedProfile");

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.size > 0);
    if (list.length === 0) return;
    if (!owner) {
      setError(needOwnerMessage);
      return;
    }
    const remaining =
      PROFILE_DOCUMENT_MAX - items.length - pendingUploads.length;
    if (remaining <= 0) {
      setError(t("documentLimit", { max: PROFILE_DOCUMENT_MAX }));
      return;
    }
    const toUpload = list.slice(0, remaining);
    if (list.length > remaining) {
      setError(t("documentLimit", { max: PROFILE_DOCUMENT_MAX }));
    } else {
      setError(null);
    }

    for (const file of toUpload) {
      const localId = crypto.randomUUID();
      setPendingUploads((prev) => [
        ...prev,
        { localId, fileName: file.name, progress: 0 },
      ]);
      const formData = new FormData();
      formData.set("file", file);
      if ("entertainerProfileId" in owner) {
        formData.set("entertainerProfileId", owner.entertainerProfileId);
      } else {
        formData.set("venueId", owner.venueId);
      }
      formData.set("visibility", "engagement");
      formData.set("locale", locale);
      try {
        const result = await uploadWithProgress(formData, (progress) => {
          setPendingUploads((prev) =>
            prev.map((row) =>
              row.localId === localId ? { ...row, progress } : row,
            ),
          );
        });
        if (!result.ok || !result.id) {
          setError(result.error ?? t("documentUploadFailed"));
        } else {
          setItems((prev) => {
            if (prev.some((row) => row.id === result.id)) return prev;
            return [
              ...prev,
              {
                id: result.id!,
                title: result.title ?? file.name,
                originalFilename: result.originalFilename ?? file.name,
                visibility: result.visibility ?? "engagement",
                sortOrder: result.sortOrder ?? prev.length,
                sizeBytes: result.sizeBytes ?? file.size,
              },
            ];
          });
        }
      } catch {
        setError(t("documentUploadFailed"));
      } finally {
        setPendingUploads((prev) =>
          prev.filter((row) => row.localId !== localId),
        );
      }
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (!owner) {
      setError(needOwnerMessage);
      return;
    }
    const oldIndex = items.findIndex((d) => d.id === active.id);
    const newIndex = items.findIndex((d) => d.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const previous = items;
    const next = arrayMove(items, oldIndex, newIndex).map((doc, index) => ({
      ...doc,
      sortOrder: index,
    }));
    setItems(next);
    startTransition(async () => {
      const result = await reorderProfileDocuments({
        ...owner,
        orderedIds: next.map((d) => d.id),
        locale,
      });
      if (!result.ok) {
        setError(result.message);
        setItems(previous);
      }
    });
  }

  function onFileDrag(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (!storeConfigured) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        {t("documentStoreUnconfigured")}
      </p>
    );
  }

  if (!owner) {
    return (
      <p className="text-sm text-[var(--text-muted)]">{needOwnerMessage}</p>
    );
  }

  return (
    <div className="grid gap-4">
      <div>
        <h3 className="text-sm font-semibold tracking-[0.12em] uppercase">
          {t("documentsTitle")}
        </h3>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {t("documentsBody")}
        </p>
      </div>

      <input
        id={inputId}
        ref={fileRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        multiple
        onChange={(e) => {
          if (e.target.files) void uploadFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div
        className={`relative rounded-[var(--radius-md)] transition-[box-shadow,background-color] ${
          dragOver
            ? "bg-[var(--success-soft)] ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--surface)]"
            : ""
        }`}
        onDragEnter={(e) => {
          onFileDrag(e);
          setDragOver(true);
        }}
        onDragOver={onFileDrag}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          onFileDrag(e);
          setDragOver(false);
          if (e.dataTransfer.files?.length) {
            void uploadFiles(e.dataTransfer.files);
          }
        }}
      >
        {!showList ? (
          <EmptyDocumentDropzone
            draggingOver={dragOver}
            pending={pendingUploads.length > 0}
            onBrowse={() => fileRef.current?.click()}
          />
        ) : (
          <div className="grid gap-3">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={items.map((d) => d.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="m-0 grid list-none gap-3 p-0">
                  {items.map((doc) => (
                    <SortableDocumentRow
                      key={doc.id}
                      doc={doc}
                      locale={locale}
                      owner={owner}
                      pending={pending}
                      onRemoved={(id) => {
                        setItems((prev) => prev.filter((row) => row.id !== id));
                      }}
                      onUpdated={(next) => {
                        setItems((prev) =>
                          prev.map((row) => (row.id === next.id ? next : row)),
                        );
                      }}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>

            {pendingUploads.map((upload) => (
              <PendingDocumentRow key={upload.localId} upload={upload} />
            ))}

            {canAddMore ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex min-h-[4.5rem] w-full flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border-[1.5px] border-dashed border-[color-mix(in_srgb,var(--text-muted)_40%,var(--rule))] bg-[var(--surface)] text-[var(--text-muted)] transition-colors hover:border-[var(--primary)]"
              >
                <span className="text-2xl leading-none" aria-hidden>
                  +
                </span>
                <span className="text-sm font-medium">{t("documentAdd")}</span>
              </button>
            ) : null}
          </div>
        )}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
