import { useState, useEffect, useCallback } from "react";

/**
 * Like useState but persists to localStorage.
 * Key is prefixed with "mizan-tool-" to avoid collisions.
 * Falls back to initialValue if localStorage is unavailable or value is invalid.
 */
export function usePersistedState<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const storageKey = `mizan-tool-${key}`;

  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === null) return initialValue;
      return JSON.parse(stored) as T;
    } catch {
      return initialValue;
    }
  });

  // Sync to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // localStorage full or unavailable — ignore
    }
  }, [storageKey, state]);

  const setPersistedState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState(value);
    },
    []
  );

  return [state, setPersistedState];
}
