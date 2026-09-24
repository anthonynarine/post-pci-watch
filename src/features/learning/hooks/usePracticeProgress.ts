// # Filename: src/features/learning/hooks/usePracticeProgress.ts
import { useCallback, useMemo, useSyncExternalStore } from "react";

import type { ItemProgress } from "../types/learning";

/**
 * Per-browser practice progress, kept in localStorage under one key per deck.
 *
 * Read through useSyncExternalStore — the same hydration-safe pattern as ThemeToggle: the
 * server snapshot is null, so the server markup and the first client render agree, and the
 * stored value arrives on the re-render that follows. Nothing here is sent anywhere; it is
 * a convenience for one learner on one device, not a record of anything.
 *
 * Every storage access is wrapped: in a private window or with storage blocked, practice
 * still works and simply does not remember between visits.
 */

const CHANGE_EVENT = "post-pci-watch:practice-progress";

function storageKey(deckId: string) {
  return `post-pci-watch:practice:${deckId}`;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parse(raw: string | null): Record<string, ItemProgress> {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" ? (value as Record<string, ItemProgress>) : {};
  } catch {
    return {};
  }
}

export function usePracticeProgress(deckId: string) {
  const key = storageKey(deckId);

  // A string snapshot compares by value, so an unchanged store never causes a re-render.
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(key),
    () => null,
  );
  const progress = useMemo(() => parse(raw), [raw]);

  /** Returns false when the browser refused to store, so the UI can say so. */
  const save = useCallback(
    (next: Record<string, ItemProgress>): boolean => {
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
        window.dispatchEvent(new Event(CHANGE_EVENT));
        return true;
      } catch {
        return false;
      }
    },
    [key],
  );

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      // Nothing stored means nothing to reset.
    }
  }, [key]);

  return { progress, save, reset };
}
