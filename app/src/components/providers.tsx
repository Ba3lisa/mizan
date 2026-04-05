"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { type Lang, type Translations, getTranslations } from "@/lib/translations";
import { TooltipProvider } from "@/components/ui/tooltip";

// ─── Theme ──────────────────────────────────────────────────────────────────

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => undefined,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("mizan-theme") as Theme | null;
    if (stored) {
      setTheme(stored);
    } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      setTheme("light");
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("mizan-theme", theme);
  }, [theme, mounted]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

// ─── Language ────────────────────────────────────────────────────────────────

interface LanguageContextValue {
  lang: Lang;
  dir: "rtl" | "ltr";
  t: Translations;
  toggleLang: () => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "ar",
  dir: "rtl",
  t: getTranslations("ar"),
  toggleLang: () => undefined,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("ar");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("mizan-lang") as Lang | null;
    if (stored === "en" || stored === "ar") {
      setLang(stored);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
    localStorage.setItem("mizan-lang", lang);
  }, [lang, mounted]);

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === "ar" ? "en" : "ar"));
  }, []);

  const dir: "rtl" | "ltr" = lang === "ar" ? "rtl" : "ltr";
  const t = getTranslations(lang);

  return (
    <LanguageContext.Provider value={{ lang, dir, t, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}

// ─── Currency ──────────────────────────────────────────────────────────────

type Currency = "EGP" | "USD";

interface CurrencyContextValue {
  currency: Currency;
  toggleCurrency: () => void;
  /** Convert EGP amount to current currency */
  fromEGP: (egp: number) => number;
  /** Convert USD amount to current currency */
  fromUSD: (usd: number) => number;
  /** Format a value with currency symbol */
  fmt: (value: number, opts?: { decimals?: number; compact?: boolean }) => string;
  /** Current exchange rate: 1 USD = X EGP */
  rate: number;
  /** Currency label */
  label: string;
  /** Currency symbol */
  symbol: string;
}

const FALLBACK_RATE = 48.5; // 1 USD ≈ 48.5 EGP (April 2026 approximate)

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "EGP",
  toggleCurrency: () => undefined,
  fromEGP: (v) => v,
  fromUSD: (v) => v * FALLBACK_RATE,
  fmt: (v) => v.toLocaleString(),
  rate: FALLBACK_RATE,
  label: "EGP",
  symbol: "ج.م",
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>("EGP");
  const [rate, setRate] = useState(FALLBACK_RATE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("mizan-currency") as Currency | null;
    if (stored === "EGP" || stored === "USD") setCurrency(stored);
    setMounted(true);

    // Fetch live rate (free API, no auth)
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((r) => r.json())
      .then((data) => {
        if (data?.rates?.EGP && typeof data.rates.EGP === "number") {
          setRate(data.rates.EGP);
        }
      })
      .catch(() => {
        // Keep fallback rate
      });
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("mizan-currency", currency);
  }, [currency, mounted]);

  const toggleCurrency = useCallback(() => {
    setCurrency((prev) => (prev === "EGP" ? "USD" : "EGP"));
  }, []);

  const fromEGP = useCallback(
    (egp: number) => (currency === "EGP" ? egp : egp / rate),
    [currency, rate]
  );

  const fromUSD = useCallback(
    (usd: number) => (currency === "USD" ? usd : usd * rate),
    [currency, rate]
  );

  const symbol = currency === "EGP" ? "ج.م" : "$";
  const label = currency;

  const fmt = useCallback(
    (value: number, opts?: { decimals?: number; compact?: boolean }) => {
      const d = opts?.decimals ?? (value >= 100 ? 0 : 1);
      if (opts?.compact && Math.abs(value) >= 1_000_000_000) {
        return `${(value / 1_000_000_000).toFixed(d)}B`;
      }
      if (opts?.compact && Math.abs(value) >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(d)}M`;
      }
      if (opts?.compact && Math.abs(value) >= 1_000) {
        return `${(value / 1_000).toFixed(d)}K`;
      }
      return value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: d,
      });
    },
    []
  );

  return (
    <CurrencyContext.Provider
      value={{ currency, toggleCurrency, fromEGP, fromUSD, fmt, rate, label, symbol }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  return useContext(CurrencyContext);
}

// ─── Combined Providers ───────────────────────────────────────────────────────

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <CurrencyProvider>
          <TooltipProvider delayDuration={300}>
            {children}
          </TooltipProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
