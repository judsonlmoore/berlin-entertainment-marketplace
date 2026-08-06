"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { upsertVenueSpace } from "@/src/actions/profiles";
import {
  ParagraphTextField,
  toParagraphEditorHtml,
} from "@/src/components/profile/paragraph-text-field";
import { Button } from "@/src/components/ui/button";
import { useRouter } from "@/src/i18n/navigation";
import { NOTES_MAX } from "@/src/domain/sanitize-input";

export type VenueSpaceRow = {
  id: string;
  name: string;
  capacity: number;
  stageDimensions: string | null;
  accessibilityNotes: string | null;
};

type Props = {
  locale: "en" | "de";
  venueId: string;
  spaces: VenueSpaceRow[];
};

export function VenueSpacesEditor({ locale, venueId, spaces }: Props) {
  const t = useTranslations("profile");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = spaces.find((space) => space.id === editingId);

  return (
    <div className="grid gap-4">
      <div>
        <h3 className="text-sm font-semibold tracking-[0.12em] uppercase">
          {t("venueSpacesTitle")}
        </h3>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {t("venueSpacesBody")}
        </p>
      </div>

      {spaces.length > 0 ? (
        <ul className="grid gap-2 text-sm">
          {spaces.map((space) => (
            <li
              key={space.id}
              className="flex flex-wrap items-center justify-between gap-2 border border-[var(--rule)] px-3 py-2"
            >
              <span>
                {space.name} · {space.capacity}
                {space.stageDimensions ? ` · ${space.stageDimensions}` : ""}
              </span>
              <Button
                type="button"
                variant="secondary"
                pending={pending}
                pendingLabel={ui("working")}
                onClick={() => setEditingId(space.id)}
              >
                {t("venueSpaceEdit")}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">
          {t("venueSpacesEmpty")}
        </p>
      )}

      <form
        className="grid gap-2 border-t border-[var(--rule)] pt-4"
        key={editingId ?? "new"}
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          setMessage(null);
          const form = new FormData(event.currentTarget);
          startTransition(async () => {
            const result = await upsertVenueSpace({
              venueId,
              ...(editingId ? { spaceId: editingId } : {}),
              name: String(form.get("name") ?? ""),
              capacity: Number(form.get("capacity") ?? 1),
              stageDimensions:
                String(form.get("stageDimensions") ?? "") || undefined,
              accessibilityNotes:
                String(form.get("accessibilityNotes") ?? "") || undefined,
              locale,
            });
            if (!result.ok) {
              setError(result.message);
              return;
            }
            setMessage(t("venueSpaceSaved"));
            setEditingId(null);
            router.refresh();
          });
        }}
      >
        <p className="text-sm font-medium">
          {editing ? t("venueSpaceEdit") : t("venueSpaceAdd")}
        </p>
        <input
          name="name"
          required
          defaultValue={editing?.name ?? ""}
          placeholder={t("venueSpaceName")}
          className="field text-sm"
        />
        <input
          name="capacity"
          type="number"
          min={1}
          required
          defaultValue={editing?.capacity ?? 50}
          placeholder={t("capacity")}
          className="field text-sm"
        />
        <input
          name="stageDimensions"
          defaultValue={editing?.stageDimensions ?? ""}
          placeholder={t("venueSpaceStageDimensions")}
          className="field text-sm"
        />
        <ParagraphTextField
          name="accessibilityNotes"
          label={t("accessibilityNotes")}
          defaultValue={toParagraphEditorHtml(
            editing?.accessibilityNotes ?? "",
          )}
          min={0}
          max={NOTES_MAX}
          size="short"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            variant="primary"
            pending={pending}
            pendingLabel={ui("working")}
          >
            {editing ? t("venueSpaceSave") : t("venueSpaceAdd")}
          </Button>
          {editing ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditingId(null)}
            >
              {t("venueSpaceCancel")}
            </Button>
          ) : null}
        </div>
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
