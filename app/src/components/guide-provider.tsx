"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface GuideContextValue {
  isOpen: boolean;
  /** Inputs to apply to the current tool page (consumed once after navigation) */
  pendingInputs: Record<string, unknown> | null;
  /** CSS selector for driver.js to highlight */
  pendingHighlight: string | null;
  /** Hint text to show in the highlight popover */
  pendingHint: string | null;

  open: () => void;
  close: () => void;
  toggle: () => void;
  setPending: (inputs: Record<string, unknown> | null, highlight: string | null, hint: string | null) => void;
  consumePending: () => void;
}

// ─── Context ────────────────────────────────────────────────────────────────

const GuideContext = createContext<GuideContextValue>({
  isOpen: false,
  pendingInputs: null,
  pendingHighlight: null,
  pendingHint: null,
  open: () => undefined,
  close: () => undefined,
  toggle: () => undefined,
  setPending: () => undefined,
  consumePending: () => undefined,
});

// ─── Provider ───────────────────────────────────────────────────────────────

export function GuideProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingInputs, setPendingInputs] = useState<Record<string, unknown> | null>(null);
  const [pendingHighlight, setPendingHighlight] = useState<string | null>(null);
  const [pendingHint, setPendingHint] = useState<string | null>(null);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const setPending = useCallback((
    inputs: Record<string, unknown> | null,
    highlight: string | null,
    hint: string | null,
  ) => {
    setPendingInputs(inputs);
    setPendingHighlight(highlight);
    setPendingHint(hint);
  }, []);

  const consumePending = useCallback(() => {
    setPendingInputs(null);
    setPendingHighlight(null);
    setPendingHint(null);
  }, []);

  return (
    <GuideContext.Provider
      value={{
        isOpen, pendingInputs, pendingHighlight, pendingHint,
        open, close, toggle, setPending, consumePending,
      }}
    >
      {children}
    </GuideContext.Provider>
  );
}

export function useGuide(): GuideContextValue {
  return useContext(GuideContext);
}
