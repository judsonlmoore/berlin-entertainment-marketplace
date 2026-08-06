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
  debounceMs?: number;
  enabled?: boolean;
};

export function useProfileAutosave<T>({
  formRef,
  readPayload,
  save,
  debounceMs = 1100,
  enabled = true,
}: Options<T>) {
  const [phase, setPhase] = useState<AutosavePhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const timerRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);
  const saveRef = useRef(save);
  const readRef = useRef(readPayload);

  useEffect(() => {
    saveRef.current = save;
    readRef.current = readPayload;
  }, [save, readPayload]);

  const flush = useCallback(async (): Promise<ActionResult | null> => {
    const form = formRef.current;
    if (!form || !enabled) return null;

    const payload = readRef.current(new FormData(form));
    if (!payload) {
      setPhase("blocked");
      return null;
    }

    const requestId = ++requestIdRef.current;
    setPhase("saving");
    setErrorMessage(null);

    const result = await saveRef.current(payload);
    if (requestId !== requestIdRef.current) return result;

    if (!result.ok) {
      setPhase("error");
      setErrorMessage(result.message);
      return result;
    }

    setSavedAt(new Date());
    setPhase("saved");
    return result;
  }, [enabled, formRef]);

  const schedule = useCallback(() => {
    if (!enabled) return;
    setPhase((current) =>
      current === "saving" ? current : current === "saved" ? "dirty" : "dirty",
    );
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      void flush();
    }, debounceMs);
  }, [debounceMs, enabled, flush]);

  useEffect(() => {
    const form = formRef.current;
    if (!form || !enabled) return;

    const onChange = () => schedule();
    form.addEventListener("input", onChange);
    form.addEventListener("change", onChange);
    return () => {
      form.removeEventListener("input", onChange);
      form.removeEventListener("change", onChange);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [enabled, formRef, schedule]);

  useEffect(() => {
    if (!enabled) return;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (timerRef.current) window.clearTimeout(timerRef.current);
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
    saveNow: flush,
    isDirty: phase === "dirty" || phase === "saving" || phase === "error",
  };
}
