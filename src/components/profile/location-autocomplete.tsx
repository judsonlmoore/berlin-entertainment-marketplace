"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type Suggestion = {
  id: string;
  label: string;
  latitude: string;
  longitude: string;
};

type Props = {
  label: string;
  hint?: string;
  nameLabel: string;
  nameLatitude: string;
  nameLongitude: string;
  defaultLabel?: string;
  defaultLatitude?: string;
  defaultLongitude?: string;
};

export function LocationAutocomplete({
  label,
  hint,
  nameLabel,
  nameLatitude,
  nameLongitude,
  defaultLabel = "",
  defaultLatitude = "",
  defaultLongitude = "",
}: Props) {
  const t = useTranslations("profile");
  const listId = useId();
  const [query, setQuery] = useState(defaultLabel);
  const [selectedLabel, setSelectedLabel] = useState(defaultLabel);
  const [latitude, setLatitude] = useState(defaultLatitude);
  const [longitude, setLongitude] = useState(defaultLongitude);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const labelRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3 || trimmed === selectedLabel) {
      return;
    }

    const timer = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const requestId = ++requestIdRef.current;

      setPending(true);
      setError(null);

      void fetch(`/api/geocode/search?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = (await response.json()) as {
            ok?: boolean;
            results?: Suggestion[];
          };
          if (requestId !== requestIdRef.current) return;
          if (!response.ok || !payload.ok) {
            setError(t("locationSearchFailed"));
            setResults([]);
            return;
          }
          setResults(payload.results ?? []);
          setOpen(true);
        })
        .catch((err: unknown) => {
          if ((err as Error).name === "AbortError") return;
          if (requestId !== requestIdRef.current) return;
          setError(t("locationSearchFailed"));
        })
        .finally(() => {
          if (requestId === requestIdRef.current) {
            setPending(false);
          }
        });
    }, 350);

    return () => {
      window.clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [query, selectedLabel, t]);

  function choose(item: Suggestion) {
    setQuery(item.label);
    setSelectedLabel(item.label);
    setLatitude(item.latitude);
    setLongitude(item.longitude);
    setResults([]);
    setOpen(false);
    setError(null);
    // Notify the parent form for autosave (hidden fields update on next paint).
    window.setTimeout(() => {
      labelRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
    }, 0);
  }

  const confirmed =
    selectedLabel.trim().length > 0 &&
    latitude.trim().length > 0 &&
    longitude.trim().length > 0 &&
    query.trim() === selectedLabel.trim();

  const canShowResults =
    open &&
    query.trim().length >= 3 &&
    query.trim() !== selectedLabel &&
    results.length > 0;

  return (
    <div className="grid gap-1 text-sm">
      <span className="font-medium text-[var(--ink)]">{label}</span>
      {hint ? <p className="text-xs text-[var(--text-muted)]">{hint}</p> : null}
      <div className="relative">
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            if (event.target.value.trim() !== selectedLabel.trim()) {
              setResults([]);
            }
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 150);
          }}
          className="field"
          autoComplete="off"
          role="combobox"
          aria-expanded={canShowResults}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder={t("locationPlaceholder")}
        />
        {canShowResults ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)] py-1 shadow-sm"
          >
            {results.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--canvas)]"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(item)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <input
        ref={labelRef}
        type="hidden"
        name={nameLabel}
        value={confirmed ? selectedLabel : ""}
      />
      <input
        type="hidden"
        name={nameLatitude}
        value={confirmed ? latitude : ""}
      />
      <input
        type="hidden"
        name={nameLongitude}
        value={confirmed ? longitude : ""}
      />
      {pending ? (
        <p className="text-xs text-[var(--text-muted)]">
          {t("locationSearching")}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-[var(--danger)]">
          {error}
        </p>
      ) : null}
      {query.trim().length >= 3 && !confirmed && !pending ? (
        <p className="text-xs text-[var(--text-muted)]">
          {t("locationSelectHint")}
        </p>
      ) : null}
      {confirmed ? (
        <p className="text-xs text-[var(--primary)]">
          {t("locationConfirmed")}
        </p>
      ) : null}
    </div>
  );
}
