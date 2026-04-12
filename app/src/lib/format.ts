// ─── Number & Currency Formatting ────────────────────────────────────────────
// Pure utility — no React dependency. Replaces the old CurrencyProvider helpers.

interface FmtOpts {
  decimals?: number;
  compact?: boolean;
}

/**
 * Format a numeric value with locale-aware separators.
 * When `compact` is true, large values are abbreviated (K / M / B / T).
 */
export function fmt(value: number, opts?: FmtOpts): string {
  const d = opts?.decimals ?? (Math.abs(value) >= 100 ? 0 : 1);

  if (opts?.compact) {
    if (Math.abs(value) >= 1_000_000_000_000)
      return `${(value / 1_000_000_000_000).toFixed(d)}T`;
    if (Math.abs(value) >= 1_000_000_000)
      return `${(value / 1_000_000_000).toFixed(d)}B`;
    if (Math.abs(value) >= 1_000_000)
      return `${(value / 1_000_000).toFixed(d)}M`;
    if (Math.abs(value) >= 1_000)
      return `${(value / 1_000).toFixed(d)}K`;
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: d,
  });
}

/** Format as Egyptian Pounds: `"EGP 4.5T"`, `"EGP 1,234"` */
export function fmtEGP(value: number, opts?: FmtOpts): string {
  return `EGP ${fmt(value, opts)}`;
}

/** Format as US Dollars: `"$4.5B"`, `"$1,234"` */
export function fmtUSD(value: number, opts?: FmtOpts): string {
  return `$${fmt(value, opts)}`;
}
