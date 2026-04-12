import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Like useState but persists to localStorage.
 * Key is prefixed with "mizan-tool-" to avoid collisions.
 * Always initializes with `initialValue` on both server and client
 * to avoid hydration mismatch, then restores from localStorage in useEffect.
 */
export function usePersistedState<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const storageKey = `mizan-tool-${key}`;
  const hydrated = useRef(false);

  // Always start with initialValue (SSR-safe)
  const [state, setState] = useState<T>(initialValue);

  // Restore from localStorage after hydration
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        setState(JSON.parse(stored) as T);
      }
    } catch {
      // localStorage unavailable — keep initialValue
    }
  }, [storageKey]);

  // Sync to localStorage on change (skip the initial hydration restore)
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // localStorage full or unavailable
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
