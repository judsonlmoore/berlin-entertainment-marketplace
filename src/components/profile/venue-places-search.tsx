"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { PlacesPrefill } from "@/src/integrations/google-places";

type Prediction = {
  placeId: string;
  label: string;
  secondaryText: string | null;
};

type Props = {
  locale: "en" | "de";
  onPrefill: (prefill: PlacesPrefill) => void;
  disabled?: boolean;
};

function newSessionToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `places-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function VenuePlacesSearch({ locale, onPrefill, disabled }: Props) {
  const t = useTranslations("profile");
  const listId = useId();
  const [query, setQuery] = useState("");
  const [sessionToken, setSessionToken] = useState(newSessionToken);
  const [results, setResults] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  function search(nextQuery: string) {
    setQuery(nextQuery);
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (nextQuery.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const res = await fetch(
          `/api/places/autocomplete?q=${encodeURIComponent(nextQuery.trim())}&sessionToken=${encodeURIComponent(sessionToken)}&lang=${locale}`,
          { signal: controller.signal },
        );
        const payload = (await res.json()) as {
          ok: boolean;
          error?: string;
          results?: Prediction[];
        };
        if (payload.error === "places_not_configured") {
          setConfigured(false);
          setResults([]);
          setOpen(false);
          return;
        }
        if (payload.error === "places_forbidden") {
          setError(t("placesForbidden"));
          setResults([]);
          setOpen(false);
          return;
        }
        if (!payload.ok) {
          setError(t("placesSearchError"));
          setResults([]);
          setOpen(false);
          return;
        }
        setConfigured(true);
        setResults(payload.results ?? []);
        setOpen(true);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(t("placesSearchError"));
      } finally {
        setLoading(false);
      }
    }, 280);
  }

  async function selectPrediction(prediction: Prediction) {
    setOpen(false);
    setQuery(prediction.label);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/places/details?placeId=${encodeURIComponent(prediction.placeId)}&sessionToken=${encodeURIComponent(sessionToken)}&lang=${locale}`,
      );
      const payload = (await res.json()) as {
        ok: boolean;
        error?: string;
        prefill?: PlacesPrefill;
      };
      if (!payload.ok || !payload.prefill) {
        setError(t("placesSearchError"));
        return;
      }
      onPrefill(payload.prefill);
      setSessionToken(newSessionToken());
    } catch {
      setError(t("placesSearchError"));
    } finally {
      setLoading(false);
    }
  }

  if (!configured) {
    return (
      <p className="text-sm text-[var(--text-muted)]">{t("placesNotConfigured")}</p>
    );
  }

  return (
    <div className="grid gap-2">
      <label className="label">
        <span className="field-label">{t("placesSearchLabel")}</span>
        <input
          type="search"
          className="field min-h-11"
          value={query}
          disabled={disabled || loading}
          placeholder={t("placesSearchPlaceholder")}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          onChange={(e) => search(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          onBlur={() => {
            // Allow click on option before closing.
            window.setTimeout(() => setOpen(false), 150);
          }}
        />
      </label>
      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">{t("placesSearching")}</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}
      {open && results.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="max-h-56 overflow-auto rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)]"
        >
          {results.map((row) => (
            <li key={row.placeId} role="option" aria-selected={false}>
              <button
                type="button"
                className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left text-sm hover:bg-[var(--canvas)]"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void selectPrediction(row)}
              >
                <span className="font-medium text-[var(--ink)]">{row.label}</span>
                {row.secondaryText ? (
                  <span className="text-[var(--text-muted)]">
                    {row.secondaryText}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-sm text-[var(--text-muted)]">{t("placesSearchHint")}</p>
    </div>
  );
}
