"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { useRef, useState, useEffect, type ReactNode } from "react";
import {
  richTextPlainLength,
  sanitizeRichTextHtml,
} from "@/src/domain/sanitize-input";

type RichTextProps = {
  name?: string;
  label: string;
  defaultValue?: string;
  min: number;
  max: number;
  placeholder?: string;
  onChange?: (html: string) => void;
};

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
      onClick={onClick}
      className={`inline-flex h-8 min-w-8 items-center justify-center rounded px-2 text-xs font-semibold ${
        active
          ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
          : "bg-transparent text-[var(--ink)] hover:bg-[var(--canvas)]"
      }`}
    >
      {children}
    </button>
  );
}

export function RichTextField({
  name,
  label,
  defaultValue = "",
  min,
  max,
  placeholder,
  onChange,
}: RichTextProps) {
  const [html, setHtml] = useState(() =>
    sanitizeRichTextHtml(defaultValue || "<p></p>"),
  );
  const hiddenRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
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
    content: defaultValue || "<p></p>",
    onUpdate: ({ editor: current }) => {
      const next = sanitizeRichTextHtml(current.getHTML());
      setHtml(next);
      onChangeRef.current?.(next);
      if (hiddenRef.current) {
        hiddenRef.current.value = next;
        hiddenRef.current.dispatchEvent(new Event("input", { bubbles: true }));
      }
    },
    editorProps: {
      attributes: {
        class:
          "min-h-36 px-3 py-3 text-sm text-[var(--ink)] outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--rule)] [&_blockquote]:pl-3 [&_blockquote]:text-[var(--text-muted)]",
      },
      handlePaste(_view, event) {
        const text = event.clipboardData?.getData("text/plain") ?? "";
        if (/https?:\/\//i.test(text) || /www\.\S+/i.test(text)) {
          event.preventDefault();
          return true;
        }
        return false;
      },
    },
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
        <div className="flex flex-wrap gap-1 border-b border-[var(--rule)] bg-[var(--canvas)] px-2 py-1.5">
          <ToolbarButton
            label="Bold"
            active={Boolean(editor?.isActive("bold"))}
            onClick={() => {
              editor?.chain().focus().toggleBold().run();
            }}
          >
            B
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            active={Boolean(editor?.isActive("italic"))}
            onClick={() => {
              editor?.chain().focus().toggleItalic().run();
            }}
          >
            <span className="italic">I</span>
          </ToolbarButton>
          <ToolbarButton
            label="Underline"
            active={Boolean(editor?.isActive("underline"))}
            onClick={() => {
              editor?.chain().focus().toggleUnderline().run();
            }}
          >
            <span className="underline">U</span>
          </ToolbarButton>
          <ToolbarButton
            label="Bullet list"
            active={Boolean(editor?.isActive("bulletList"))}
            onClick={() => {
              editor?.chain().focus().toggleBulletList().run();
            }}
          >
            •
          </ToolbarButton>
          <ToolbarButton
            label="Numbered list"
            active={Boolean(editor?.isActive("orderedList"))}
            onClick={() => {
              editor?.chain().focus().toggleOrderedList().run();
            }}
          >
            1.
          </ToolbarButton>
          <ToolbarButton
            label="Quote"
            active={Boolean(editor?.isActive("blockquote"))}
            onClick={() => {
              editor?.chain().focus().toggleBlockquote().run();
            }}
          >
            “
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

type CountedProps = {
  name: string;
  label: string;
  defaultValue?: string;
  min: number;
  max: number;
  rows?: number;
};

export function CharacterCountedTextarea({
  name,
  label,
  defaultValue = "",
  min,
  max,
  rows = 3,
}: CountedProps) {
  const [value, setValue] = useState(defaultValue);
  const count = value.trim().length;
  const over = count > max;
  const under = count > 0 && count < min;

  return (
    <label className="grid gap-1 text-sm">
      <span className="flex items-end justify-between gap-3">
        <span className="font-medium text-[var(--ink)]">{label}</span>
        <span
          className={`text-xs tabular-nums ${
            over || under ? "text-[var(--danger)]" : "text-[var(--text-muted)]"
          }`}
        >
          {count}/{max}
        </span>
      </span>
      <textarea
        name={name}
        rows={rows}
        value={value}
        maxLength={max}
        onChange={(event) => setValue(event.target.value)}
        className="field"
      />
      {count > 0 && (over || under) ? (
        <span role="alert" className="text-xs text-[var(--danger)]">
          {over ? `Maximum ${max} characters` : `Minimum ${min} characters`}
        </span>
      ) : null}
    </label>
  );
}
