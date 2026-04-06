// ─── Sanad (سند) — Reference Confidence System ──────────────────────────────
// The only opinionated part of Mizan. 5 levels of source confidence.
// Future: LLM Council will automate scoring to reduce opinion.

export type SanadLevel = 1 | 2 | 3 | 4 | 5;

export interface SanadEntry {
  value: number;
  sanadLevel: number;
  sourceUrl?: string;
  sourceNameEn?: string;
  sourceNameAr?: string;
  date?: string;
  year?: string;
}

export const SANAD_CONFIG: Record<
  number,
  {
    dot: string;
    labelEn: string;
    labelAr: string;
    weight: number;
  }
> = {
  1: { dot: "bg-emerald-500", labelEn: "Official Gov", labelAr: "حكومي رسمي", weight: 5 },
  2: { dot: "bg-blue-500", labelEn: "Intl Org", labelAr: "منظمة دولية", weight: 4 },
  3: { dot: "bg-amber-500", labelEn: "News", labelAr: "إعلام", weight: 3 },
  4: { dot: "bg-muted-foreground", labelEn: "Other", labelAr: "أخرى", weight: 2 },
  5: { dot: "bg-violet-500", labelEn: "Derived", labelAr: "محسوب", weight: 1 },
};

/** Returns the entry with the highest trust (lowest sanadLevel). */
export function getBestSource<T extends { sanadLevel: number }>(sources: T[]): T | undefined {
  if (sources.length === 0) return undefined;
  return sources.reduce((best, s) => (s.sanadLevel < best.sanadLevel ? s : best));
}

/** Groups entries by a key field, sorting each group by sanadLevel (best first). */
export function groupByKey<T extends { sanadLevel: number }>(
  records: T[],
  keyFn: (r: T) => string
): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};
  for (const r of records) {
    const key = keyFn(r);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  }
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => a.sanadLevel - b.sanadLevel);
  }
  return grouped;
}

/**
 * Detects weighted consensus across multiple sources.
 * Weight per source = (6 - sanadLevel). Consensus requires score ≥ 6.
 * Tolerance is relative: values within ±tolerance of each other are "agreeing".
 */
export function detectConsensus(
  entries: SanadEntry[],
  tolerance = 0.005
): {
  isConsensus: boolean;
  consensusScore: number;
  consensusValue?: number;
  agreeingSources: SanadEntry[];
  conflictingSources: SanadEntry[];
} {
  if (entries.length <= 1) {
    return {
      isConsensus: false,
      consensusScore: entries.length === 1 ? (6 - entries[0].sanadLevel) : 0,
      consensusValue: entries[0]?.value,
      agreeingSources: entries,
      conflictingSources: [],
    };
  }

  // Sort by weight (highest trust first)
  const sorted = [...entries].sort((a, b) => a.sanadLevel - b.sanadLevel);
  const referenceValue = sorted[0].value;

  const agreeingSources: SanadEntry[] = [];
  const conflictingSources: SanadEntry[] = [];

  for (const entry of sorted) {
    const relDiff = referenceValue === 0
      ? (entry.value === 0 ? 0 : 1)
      : Math.abs(entry.value - referenceValue) / Math.abs(referenceValue);

    if (relDiff <= tolerance) {
      agreeingSources.push(entry);
    } else {
      conflictingSources.push(entry);
    }
  }

  const consensusScore = agreeingSources.reduce(
    (sum, s) => sum + (6 - s.sanadLevel),
    0
  );

  return {
    isConsensus: agreeingSources.length >= 2 && consensusScore >= 6,
    consensusScore,
    consensusValue: referenceValue,
    agreeingSources,
    conflictingSources,
  };
}

/** Format a stat value based on its unit. */
export function formatStatValue(value: number, unit: string): string {
  if (unit === "percent") return `${value.toFixed(1)}%`;
  if (unit === "index") return value.toFixed(3);
  if (unit === "per_km2") return `${Math.round(value).toLocaleString()}/km²`;
  if (unit === "km2") return `${Math.round(value).toLocaleString()} km²`;
  if (unit === "people" && value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}
