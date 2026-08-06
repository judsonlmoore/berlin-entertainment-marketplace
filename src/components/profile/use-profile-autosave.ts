"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { ActionResult } from "@/src/actions/_shared";

export type AutosavePhase =
  "idle" | "dirty" | "saving" | "saved" | "error" | "blocked";

type Options<T> = {
  formRef: RefObject<HTMLFormElement | null>;
  /** Return null to skip this tick (e.g. display name still empty). */
  readPayload: (form: FormData) => T | null;
  save: (payload: T) => Promise<ActionResult>;
  /**
   * Save after the user pauses typing this long.
   * Continuous typing is capped by `maxWaitMs` instead.
   */
  debounceMs?: number;
  /** While edits keep coming, force a save at least this often. */
  maxWaitMs?: number;
  enabled?: boolean;
};

/**
 * Profile autosave: mark dirty on every edit, but only hit the server when the
 * user pauses, leaves a field, hits the max-wait ceiling, or hides the tab.
 */
export function useProfileAutosave<T>({
  formRef,
  readPayload,
  save,
  debounceMs = 3000,
  maxWaitMs = 10_000,
  enabled = true,
}: Options<T>) {
  const [phase, setPhase] = useState<AutosavePhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const maxWaitTimerRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);
  const dirtyRef = useRef(false);
  const saveRef = useRef(save);
  const readRef = useRef(readPayload);

  useEffect(() => {
    saveRef.current = save;
    readRef.current = readPayload;
  }, [save, readPayload]);

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (maxWaitTimerRef.current) {
      window.clearTimeout(maxWaitTimerRef.current);
      maxWaitTimerRef.current = null;
    }
  }, []);

  const flush = useCallback(
    async (options?: { force?: boolean }): Promise<ActionResult | null> => {
      const form = formRef.current;
      if (!form || !enabled) return null;

      clearTimers();

      const payload = readRef.current(new FormData(form));
      if (!payload) {
        dirtyRef.current = false;
        setPhase("blocked");
        return null;
      }

      // Blur / idle / max-wait skip when already persisted; Publish always forces.
      if (!options?.force && !dirtyRef.current) return null;

      dirtyRef.current = false;
      const requestId = ++requestIdRef.current;
      setPhase("saving");
      setErrorMessage(null);

      const result = await saveRef.current(payload);
      if (requestId !== requestIdRef.current) return result;

      if (!result.ok) {
        dirtyRef.current = true;
        setPhase("error");
        setErrorMessage(result.message);
        return result;
      }

      setSavedAt(new Date());
      setPhase("saved");
      return result;
    },
    [clearTimers, enabled, formRef],
  );

  const schedule = useCallback(() => {
    if (!enabled) return;

    const wasClean = !dirtyRef.current;
    dirtyRef.current = true;
    // Avoid re-rendering the whole form on every keystroke once already dirty.
    setPhase((current) => {
      if (current === "saving" || current === "dirty") return current;
      return "dirty";
    });

    // Idle debounce: reset on every keystroke.
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = window.setTimeout(() => {
      void flush();
    }, debounceMs);

    // Max wait: start once per dirty burst so continuous typing still saves.
    if (wasClean && !maxWaitTimerRef.current) {
      maxWaitTimerRef.current = window.setTimeout(() => {
        void flush();
      }, maxWaitMs);
    }
  }, [debounceMs, enabled, flush, maxWaitMs]);

  useEffect(() => {
    const form = formRef.current;
    if (!form || !enabled) return;

    const onInput = () => schedule();
    const onChange = () => schedule();
    const onFocusOut = (event: FocusEvent) => {
      // Skip when focus stays inside the form (e.g. rich-text toolbar).
      const next = event.relatedTarget;
      if (next instanceof Node && form.contains(next)) return;
      if (dirtyRef.current) void flush();
    };

    form.addEventListener("input", onInput);
    form.addEventListener("change", onChange);
    form.addEventListener("focusout", onFocusOut);
    return () => {
      form.removeEventListener("input", onInput);
      form.removeEventListener("change", onChange);
      form.removeEventListener("focusout", onFocusOut);
      clearTimers();
    };
  }, [clearTimers, enabled, flush, formRef, schedule]);

  useEffect(() => {
    if (!enabled) return;
    const onVisibility = () => {
      if (document.visibilityState === "hidden" && dirtyRef.current) {
        void flush();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [enabled, flush]);

  useEffect(() => {
    if (!enabled) return;
    const dirty = phase === "dirty" || phase === "saving" || phase === "error";
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [enabled, phase]);

  return {
    phase,
    errorMessage,
    savedAt,
    saveNow: () => flush({ force: true }),
    isDirty: phase === "dirty" || phase === "saving" || phase === "error",
  };
}
