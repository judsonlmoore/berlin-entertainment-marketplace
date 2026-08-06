"use client";

import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import {
  useRef,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
  type SVGProps,
} from "react";
import { useTranslations } from "next-intl";
import {
  richTextPlainLength,
  sanitizeRichTextHtml,
} from "@/src/domain/sanitize-input";

export type ParagraphTextFieldProps = {
  name?: string;
  label: string;
  defaultValue?: string;
  /** Plain-text minimum; use 0 for optional fields. */
  min?: number;
  max: number;
  placeholder?: string;
  onChange?: (html: string) => void;
  /** Visual height of the editing surface. */
  size?: "short" | "medium" | "tall";
};

function IconBold(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden {...props}>
      <path
        fill="currentColor"
        d="M7.5 4.5h5.2c2.55 0 4.3 1.45 4.3 3.55 0 1.4-.75 2.5-1.95 3.05 1.55.5 2.6 1.8 2.6 3.55 0 2.35-1.9 3.85-4.7 3.85H7.5V4.5Zm3.1 5.7h2c1.15 0 1.85-.55 1.85-1.45s-.7-1.4-1.85-1.4h-2v2.85Zm0 5.85h2.35c1.3 0 2.1-.6 2.1-1.6s-.8-1.55-2.15-1.55H10.6v3.15Z"
      />
    </svg>
  );
}

function IconItalic(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden {...props}>
      <path
        fill="currentColor"
        d="M10 4.5h8.2v2.4h-2.85l-3.1 10.2H15.4v2.4H7.2v-2.4h2.8L13.1 6.9H10V4.5Z"
      />
    </svg>
  );
}

function IconUnderline(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden {...props}>
      <path
        fill="currentColor"
        d="M7.2 4.5h2.7v7.35c0 2.05 1.15 3.25 3.1 3.25s3.1-1.2 3.1-3.25V4.5h2.7v7.45c0 3.45-2.2 5.55-5.8 5.55s-5.8-2.1-5.8-5.55V4.5ZM6.5 19.5h11v2H6.5v-2Z"
      />
    </svg>
  );
}

function IconBulletList(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden {...props}>
      <circle cx="5.5" cy="7" r="1.6" fill="currentColor" />
      <circle cx="5.5" cy="12" r="1.6" fill="currentColor" />
      <circle cx="5.5" cy="17" r="1.6" fill="currentColor" />
      <path
        fill="currentColor"
        d="M9.5 6.1h9v1.8h-9V6.1Zm0 5h9v1.8h-9v-1.8Zm0 5h9v1.8h-9v-1.8Z"
      />
    </svg>
  );
}

function IconNumberedList(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden {...props}>
      <path
        fill="currentColor"
        d="M5.2 5.2h1.5V9H5.2V5.2Zm-.2 6.4h2.4v1.1l-1.55 1.85H7.5V16H4.8v-1.15l1.6-1.9H4.95v-1.35Zm.25 6.55h2.15V20H4.9v-.85l1.35-1.1H5.1v-1.1h2.15v.85l-1.35 1.1h1.5v1.1ZM9.5 6.1h9v1.8h-9V6.1Zm0 5h9v1.8h-9v-1.8Zm0 5h9v1.8h-9v-1.8Z"
      />
    </svg>
  );
}

function IconQuote(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden {...props}>
      <path
        fill="currentColor"
        d="M10.4 7.2c1.7 0 3.1 1.35 3.1 3.15 0 1.7-1.15 3-2.75 3.35.45 1.35 1.55 2.45 3.25 3.2l-.85 1.85c-2.55-1.15-4.35-3.1-4.35-6.05 0-2.95 1.75-5.5 4.6-5.5Zm7.1 0c1.7 0 3.1 1.35 3.1 3.15 0 1.7-1.15 3-2.75 3.35.45 1.35 1.55 2.45 3.25 3.2l-.85 1.85c-2.55-1.15-4.35-3.1-4.35-6.05 0-2.95 1.75-5.5 4.6-5.5Z"
      />
    </svg>
  );
}

function ToolbarButton({
  active,
  onClick,
  children,
  label,
}: {
  active?: boolean | undefined;
  onClick: () => void;
  children: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={Boolean(active)}
      onMouseDown={(event) => {
        // Keep editor selection when clicking toolbar.
        event.preventDefault();
      }}
      onClick={onClick}
      className={`inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] ${
        active
          ? "bg-[color-mix(in_srgb,var(--primary)_14%,var(--surface))] text-[var(--primary)]"
          : "bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
      }`}
    >
      {children}
    </button>
  );
}

const SIZE_CLASS = {
  short: "min-h-24",
  medium: "min-h-36",
  tall: "min-h-44",
} as const;

/**
 * Shared paragraph editor for profile/onboarding prose fields.
 * Formatting: bold, italic, underline, lists, quote. No links.
 */
export function ParagraphTextField({
  name,
  label,
  defaultValue = "",
  min = 0,
  max,
  placeholder,
  onChange,
  size = "medium",
}: ParagraphTextFieldProps) {
  const t = useTranslations("profile");
  const [html, setHtml] = useState(() =>
    sanitizeRichTextHtml(defaultValue || "<p></p>"),
  );
  const hiddenRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Underline,
      Placeholder.configure({
        placeholder: placeholder ?? "",
      }),
    ],
    // Placeholder copy is locale-stable for a given mount; avoid rebuilding the
    // editor on parent re-renders (that was eating keystrokes / selection).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
    [],
  );

  const editor = useEditor(
    {
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      extensions,
      content: defaultValue || "<p></p>",
      onUpdate: ({ editor: current }) => {
        const next = sanitizeRichTextHtml(current.getHTML());
        setHtml(next);
        onChangeRef.current?.(next);
        if (hiddenRef.current) {
          hiddenRef.current.value = next;
          hiddenRef.current.dispatchEvent(
            new Event("input", { bubbles: true }),
          );
        }
      },
      editorProps: {
        attributes: {
          class: `${SIZE_CLASS[size]} px-3 py-3 text-sm leading-relaxed text-[var(--ink)] outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--rule)] [&_blockquote]:pl-3 [&_blockquote]:text-[var(--text-muted)]`,
        },
      },
    },
    [extensions],
  );

  // Keep editor chrome class in sync when size prop changes without remounting.
  useEffect(() => {
    if (!editor) return;
    editor.setOptions({
      editorProps: {
        attributes: {
          class: `${SIZE_CLASS[size]} px-3 py-3 text-sm leading-relaxed text-[var(--ink)] outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--rule)] [&_blockquote]:pl-3 [&_blockquote]:text-[var(--text-muted)]`,
        },
      },
    });
  }, [editor, size]);

  const activeMarks = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: Boolean(current?.isActive("bold")),
      italic: Boolean(current?.isActive("italic")),
      underline: Boolean(current?.isActive("underline")),
      orderedList: Boolean(current?.isActive("orderedList")),
      bulletList: Boolean(current?.isActive("bulletList")),
      blockquote: Boolean(current?.isActive("blockquote")),
    }),
  });

  const count = richTextPlainLength(html);
  const over = count > max;
  const under = count > 0 && count < min;

  return (
    <div className="grid gap-1 text-sm">
      <div className="flex items-end justify-between gap-3">
        <span className="font-medium text-[var(--ink)]">{label}</span>
        <span
          className={`text-xs tabular-nums ${
            over || under ? "text-[var(--danger)]" : "text-[var(--text-muted)]"
          }`}
        >
          {count}/{max}
        </span>
      </div>
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--primary)]">
        <div
          role="toolbar"
          aria-label={t("editorToolbar")}
          className="flex flex-wrap items-center gap-0.5 border-b border-[var(--rule)] bg-[var(--canvas)] px-1.5 py-1"
        >
          <ToolbarButton
            label={t("editorBold")}
            active={activeMarks?.bold}
            onClick={() => {
              editor?.chain().focus().toggleBold().run();
            }}
          >
            <IconBold />
          </ToolbarButton>
          <ToolbarButton
            label={t("editorItalic")}
            active={activeMarks?.italic}
            onClick={() => {
              editor?.chain().focus().toggleItalic().run();
            }}
          >
            <IconItalic />
          </ToolbarButton>
          <ToolbarButton
            label={t("editorUnderline")}
            active={activeMarks?.underline}
            onClick={() => {
              editor?.chain().focus().toggleUnderline().run();
            }}
          >
            <IconUnderline />
          </ToolbarButton>
          <span aria-hidden className="mx-1 h-5 w-px bg-[var(--rule)]" />
          <ToolbarButton
            label={t("editorNumberedList")}
            active={activeMarks?.orderedList}
            onClick={() => {
              editor?.chain().focus().toggleOrderedList().run();
            }}
          >
            <IconNumberedList />
          </ToolbarButton>
          <ToolbarButton
            label={t("editorBulletList")}
            active={activeMarks?.bulletList}
            onClick={() => {
              editor?.chain().focus().toggleBulletList().run();
            }}
          >
            <IconBulletList />
          </ToolbarButton>
          <span aria-hidden className="mx-1 h-5 w-px bg-[var(--rule)]" />
          <ToolbarButton
            label={t("editorQuote")}
            active={activeMarks?.blockquote}
            onClick={() => {
              editor?.chain().focus().toggleBlockquote().run();
            }}
          >
            <IconQuote />
          </ToolbarButton>
        </div>
        <EditorContent editor={editor} />
      </div>
      {name ? (
        <input
          ref={hiddenRef}
          type="hidden"
          name={name}
          value={html}
          readOnly
        />
      ) : null}
      {count > 0 && (over || under) ? (
        <span role="alert" className="text-xs text-[var(--danger)]">
          {over ? `Maximum ${max} characters` : `Minimum ${min} characters`}
        </span>
      ) : null}
    </div>
  );
}

/** Convert stored plain text or HTML into TipTap-ready HTML. */
export function toParagraphEditorHtml(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "<p></p>";
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return sanitizeRichTextHtml(trimmed);
  const escaped = trimmed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<p>${escaped}</p>`;
}
