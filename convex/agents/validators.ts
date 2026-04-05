// Deterministic validation functions for Mizan data integrity checks.
// These are pure TypeScript helpers — no Convex runtime needed.

// ─── BUDGET VALIDATORS ────────────────────────────────────────────────────────

export interface BudgetItem {
  category: string;
  amount: number;
}

/**
 * Validates that the sum of budget items matches the expected total within a
 * small floating-point tolerance.
 */
export function validateBudgetTotals(
  items: Array<BudgetItem>,
  expectedTotal: number
): boolean {
  const sum = items.reduce((acc, item) => acc + item.amount, 0);
  return Math.abs(sum - expectedTotal) < 0.01;
}

// ─── PARLIAMENT VALIDATORS ────────────────────────────────────────────────────

export interface ParliamentMember {
  chamber: string;
}

export interface ExpectedParliamentCounts {
  house: number;
  senate: number;
}

export interface ParliamentCountResult {
  valid: boolean;
  actual: { house: number; senate: number };
}

/**
 * Validates that the counts of house and senate members match expectations.
 */
export function validateParliamentCounts(
  members: Array<ParliamentMember>,
  expected: ExpectedParliamentCounts
): ParliamentCountResult {
  const house = members.filter((m) => m.chamber === "house").length;
  const senate = members.filter((m) => m.chamber === "senate").length;
  return {
    valid: house === expected.house && senate === expected.senate,
    actual: { house, senate },
  };
}

// ─── DEBT VALIDATORS ─────────────────────────────────────────────────────────

export interface DebtRecord {
  totalExternalDebt?: number;
  totalDomesticDebt?: number;
  debtToGdpRatio?: number;
}

/**
 * Sanity-checks a debt record:
 * - Debt values must be positive when present
 * - Debt-to-GDP ratio must be between 0 and 500 (a very wide safety band)
 */
export function validateDebtRecord(record: DebtRecord): {
  valid: boolean;
  errors: Array<string>;
} {
  const errors: Array<string> = [];

  if (
    record.totalExternalDebt !== undefined &&
    record.totalExternalDebt < 0
  ) {
    errors.push("totalExternalDebt must be non-negative");
  }

  if (
    record.totalDomesticDebt !== undefined &&
    record.totalDomesticDebt < 0
  ) {
    errors.push("totalDomesticDebt must be non-negative");
  }

  if (record.debtToGdpRatio !== undefined) {
    if (record.debtToGdpRatio < 0 || record.debtToGdpRatio > 500) {
      errors.push("debtToGdpRatio must be between 0 and 500");
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── WORLD BANK RESPONSE PARSER ───────────────────────────────────────────────

export interface WorldBankIndicatorEntry {
  date: string;
  value: number | null;
  country?: { id: string; value: string };
}

/**
 * Parses a World Bank API v2 JSON response for a single indicator.
 * The API returns a two-element array: [metadata, dataArray].
 * Returns only entries with non-null values, sorted newest-first.
 */
export function parseWorldBankResponse(
  raw: unknown
): Array<WorldBankIndicatorEntry> {
  if (!Array.isArray(raw) || raw.length < 2) return [];

  const dataArray = raw[1];
  if (!Array.isArray(dataArray)) return [];

  const entries: Array<WorldBankIndicatorEntry> = [];

  for (const item of dataArray) {
    if (
      typeof item === "object" &&
      item !== null &&
      typeof (item as Record<string, unknown>).date === "string" &&
      (item as Record<string, unknown>).value !== undefined
    ) {
      const cast = item as Record<string, unknown>;
      if (cast.value !== null) {
        entries.push({
          date: cast.date as string,
          value: cast.value as number,
          country:
            typeof cast.country === "object" && cast.country !== null
              ? (cast.country as { id: string; value: string })
              : undefined,
        });
      }
    }
  }

  // Sort descending by date string (ISO year format "2023", "2022", ...)
  entries.sort((a, b) => b.date.localeCompare(a.date));

  return entries;
}

// ─── CLAUDE RESPONSE PARSER ───────────────────────────────────────────────────

/**
 * Extracts the text content from a Claude API chat-completions style response.
 * Returns null if the response cannot be parsed.
 */
export function extractClaudeText(raw: unknown): string | null {
  if (typeof raw !== "object" || raw === null) return null;
  const cast = raw as Record<string, unknown>;
  if (!Array.isArray(cast.content)) return null;
  const first = cast.content[0];
  if (
    typeof first === "object" &&
    first !== null &&
    (first as Record<string, unknown>).type === "text"
  ) {
    const text = (first as Record<string, unknown>).text;
    return typeof text === "string" ? text : null;
  }
  return null;
}
