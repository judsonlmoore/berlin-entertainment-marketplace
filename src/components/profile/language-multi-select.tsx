"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  WORLD_LANGUAGES,
  languageLabel,
  parseLanguageCodes,
  serializeLanguageCodes,
} from "@/src/domain/languages";

type Props = {
  name: string;
  defaultValue?: string | null | undefined;
  label: string;
  hint?: string;
};

export function LanguageMultiSelect({
  name,
  defaultValue,
  label,
  hint,
}: Props) {
  const t = useTranslations("profile");
  const locale = useLocale() === "de" ? "de" : "en";
  const [selected, setSelected] = useState<string[]>(() =>
    parseLanguageCodes(defaultValue),
  );
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const skipNotifyRef = useRef(true);

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return WORLD_LANGUAGES.filter((lang) => {
      if (selected.includes(lang.code)) return false;
      if (!q) return true;
      return (
        lang.labelEn.toLowerCase().includes(q) ||
        lang.labelDe.toLowerCase().includes(q) ||
        lang.code.includes(q)
      );
    }).slice(0, 12);
  }, [query, selected]);

  // Notify parent form autosave after commit — never from a setState updater.
  useEffect(() => {
    if (skipNotifyRef.current) {
      skipNotifyRef.current = false;
      return;
    }
    hiddenRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
  }, [selected]);

  function add(code: string) {
    setSelected((prev) => (prev.includes(code) ? prev : [...prev, code]));
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function remove(code: string) {
    setSelected((prev) => prev.filter((item) => item !== code));
    inputRef.current?.focus();
  }

  return (
    <div className="grid gap-1">
      <span className="text-sm font-medium text-[var(--ink)]">{label}</span>
      {hint ? <p className="text-xs text-[var(--text-muted)]">{hint}</p> : null}
      <input
        ref={hiddenRef}
        type="hidden"
        name={name}
        value={serializeLanguageCodes(selected)}
      />
      <div
        className="flex min-h-11 flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)] px-2.5 py-1.5 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--primary)]"
        onClick={() => inputRef.current?.focus()}
      >
        {selected.map((code) => (
          <span
            key={code}
            className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--canvas)] px-2 py-1 text-sm font-medium text-[var(--ink)]"
          >
            {languageLabel(code, locale)}
            <button
              type="button"
              aria-label={t("languageRemove", {
                language: languageLabel(code, locale),
              })}
              onClick={(event) => {
                event.stopPropagation();
                remove(code);
              }}
              className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--rule)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--primary)]"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 150);
          }}
          placeholder={selected.length === 0 ? t("languagesAdd") : ""}
          className="min-w-[8rem] flex-1 border-0 bg-transparent py-1.5 text-sm text-[var(--ink)] outline-none"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="language-options"
        />
      </div>
      <div className="relative">
        {open && available.length > 0 ? (
          <ul
            id="language-options"
            role="listbox"
            className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)] py-1 shadow-sm"
          >
            {available.map((lang) => (
              <li key={lang.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  className="flex w-full px-3 py-2 text-left text-sm hover:bg-[var(--canvas)]"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => add(lang.code)}
                >
                  {languageLabel(lang.code, locale)}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
