"use node";
// AI-powered data orchestrator for Mizan.
// Uses the Claude API (via raw fetch — no SDK dependency) to parse and validate
// government transparency data fetched from public sources.
//
// SETUP: Set the ANTHROPIC_API_KEY environment variable in your Convex dashboard
// (Settings → Environment Variables) before deploying this action.

import { internalAction, ActionCtx } from "../_generated/server";
import { internal, api } from "../_generated/api";
import { Id } from "../_generated/dataModel";

import {
  parseWorldBankResponse,
  validateDebtRecord,
} from "./validators";
import { callClaude } from "./providers/anthropic";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type RefreshCategory = "government" | "parliament" | "budget" | "debt" | "economy";

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── DEBT REFRESH ─────────────────────────────────────────────────────────────

async function refreshDebtData(
  ctx: ActionCtx
): Promise<{ recordsUpdated: number; sourceUrl?: string }> {
  // Fetch both external debt stock AND debt service from World Bank
  const DEBT_STOCK_URL =
    "https://api.worldbank.org/v2/country/EGY/indicator/DT.DOD.DECT.CD?format=json&per_page=10";
  const DEBT_SERVICE_URL =
    "https://api.worldbank.org/v2/country/EGY/indicator/DT.TDS.DECT.CD?format=json&per_page=10";

  // Fetch debt stock
  const stockResponse = await fetch(DEBT_STOCK_URL);
  if (!stockResponse.ok) {
    throw new Error(
      `World Bank debt stock API failed with status ${stockResponse.status}`
    );
  }
  const stockRaw: unknown = await stockResponse.json();
  const stockEntries = parseWorldBankResponse(stockRaw);

  // Fetch debt service (interest + principal payments)
  const serviceByDate: Record<string, number> = {};
  try {
    const serviceResponse = await fetch(DEBT_SERVICE_URL);
    if (serviceResponse.ok) {
      const serviceRaw: unknown = await serviceResponse.json();
      const serviceEntries = parseWorldBankResponse(serviceRaw);
      for (const entry of serviceEntries) {
        if (entry.value != null) {
          const date = entry.date.length === 4 ? `${entry.date}-12-31` : entry.date;
          serviceByDate[date] = entry.value / 1e9; // Convert to billions
        }
      }
    }
  } catch {
    console.warn("[dataAgent] Failed to fetch debt service data, continuing with stock only");
  }

  if (stockEntries.length === 0) {
    console.warn("[dataAgent] World Bank returned no debt entries for Egypt.");
    return { recordsUpdated: 0 };
  }

  let totalUpdated = 0;
  for (const entry of stockEntries) {
    const debtValueUsd = entry.value;
    if (debtValueUsd === null || debtValueUsd === undefined) continue;

    const debtInBillions = debtValueUsd / 1e9;
    const record = { totalExternalDebt: debtInBillions };

    const validation = validateDebtRecord(record);
    if (!validation.valid) {
      console.warn(
        `[dataAgent] Debt record for ${entry.date} failed validation: ${validation.errors.join("; ")}`
      );
      continue;
    }

    const date = entry.date.length === 4 ? `${entry.date}-12-31` : entry.date;
    const debtService = serviceByDate[date];

    const updated: number = await ctx.runMutation(
      internal.dataRefresh.upsertDebtRecord,
      {
        date,
        totalExternalDebt: debtInBillions,
        totalDebtService: debtService,
        sourceUrl: DEBT_STOCK_URL,
      }
    );
    totalUpdated += updated;
  }

  return { recordsUpdated: totalUpdated, sourceUrl: DEBT_STOCK_URL };
}

// ─── BUDGET REFRESH ───────────────────────────────────────────────────────────

async function refreshBudgetData(
  ctx: ActionCtx
): Promise<{ recordsUpdated: number; sourceUrl?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn(
      "[dataAgent] Skipping budget AI refresh — ANTHROPIC_API_KEY not set."
    );
    return { recordsUpdated: 0 };
  }

  // Fetch the Ministry of Finance open-data summary page (best-effort)
  const MOF_URL = "https://www.mof.gov.eg/en/open-data";
  let pageText = "";
  try {
    const response = await fetch(MOF_URL);
    if (response.ok) {
      pageText = await response.text();
      // Keep only a manageable slice for the prompt
      pageText = pageText.slice(0, 8000);
    } else {
      console.warn(
        `[dataAgent] MOF page returned status ${response.status}; using empty context.`
      );
    }
  } catch (fetchErr) {
    console.warn(
      `[dataAgent] Failed to fetch MOF page: ${String(fetchErr)}; using empty context.`
    );
  }

  const systemPrompt = `You are a data extraction assistant for Mizan, Egypt's government transparency platform.
Extract structured budget data from Egyptian government sources.
Always respond with valid JSON only — no markdown, no prose.`;

  const prompt = `Extract the most recent Egyptian national budget figures from the following page content.
Return a JSON object with these fields (use null for missing values):
{
  "fiscalYear": "<e.g. 2024/2025>",
  "totalRevenue": <number in EGP billions or null>,
  "totalExpenditure": <number in EGP billions or null>,
  "deficit": <number in EGP billions, negative means deficit, or null>
}

Page content:
${pageText || "(page content unavailable)"}`;

  const claudeResponse = await callClaude(prompt, systemPrompt);

  if (!claudeResponse) {
    console.warn("[dataAgent] Claude returned no budget data.");
    return { recordsUpdated: 0 };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(claudeResponse) as Record<string, unknown>;
  } catch {
    console.warn(
      `[dataAgent] Could not parse Claude budget response as JSON: ${claudeResponse}`
    );
    return { recordsUpdated: 0 };
  }

  const fiscalYear =
    typeof parsed.fiscalYear === "string" ? parsed.fiscalYear : null;
  if (!fiscalYear) {
    console.warn("[dataAgent] Claude did not return a fiscalYear.");
    return { recordsUpdated: 0 };
  }

  const totalRevenue =
    typeof parsed.totalRevenue === "number" ? parsed.totalRevenue : undefined;
  const totalExpenditure =
    typeof parsed.totalExpenditure === "number"
      ? parsed.totalExpenditure
      : undefined;
  const deficit =
    typeof parsed.deficit === "number" ? parsed.deficit : undefined;

  const recordsUpdated: number = await ctx.runMutation(
    internal.dataRefresh.upsertFiscalYear,
    {
      year: fiscalYear,
      totalRevenue,
      totalExpenditure,
      deficit,
      sourceUrl: MOF_URL,
    }
  );

  return { recordsUpdated, sourceUrl: MOF_URL };
}

// ─── GOVERNMENT REFRESH ───────────────────────────────────────────────────────

async function refreshGovernmentData(
  ctx: ActionCtx
): Promise<{ recordsUpdated: number; sourceUrl?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn(
      "[dataAgent] Skipping government AI refresh — ANTHROPIC_API_KEY not set."
    );
    return { recordsUpdated: 0 };
  }

  const CABINET_URL = "https://cabinet.gov.eg/en/";
  let pageText = "";
  try {
    const response = await fetch(CABINET_URL);
    if (response.ok) {
      pageText = await response.text();
      pageText = pageText.slice(0, 8000);
    } else {
      console.warn(
        `[dataAgent] Cabinet page returned status ${response.status}; using empty context.`
      );
    }
  } catch (fetchErr) {
    console.warn(
      `[dataAgent] Failed to fetch cabinet page: ${String(fetchErr)}; using empty context.`
    );
  }

  const systemPrompt = `You are a data extraction assistant for Mizan, Egypt's government transparency platform.
Extract structured Egyptian government data from official sources.
Always respond with valid JSON only — no markdown, no prose.`;

  const prompt = `Extract a list of current Egyptian cabinet ministers from the following page content.
Return a JSON array of objects, each with:
{
  "nameEn": "<English name>",
  "titleEn": "<English ministry/title>",
  "nameAr": "<Arabic name or empty string>",
  "titleAr": "<Arabic title or empty string>"
}
Return an empty array [] if no minister data is found.

Page content:
${pageText || "(page content unavailable)"}`;

  const claudeResponse = await callClaude(prompt, systemPrompt);

  if (!claudeResponse) {
    console.warn("[dataAgent] Claude returned no government data.");
    return { recordsUpdated: 0 };
  }

  let ministers: Array<{
    nameEn: string;
    titleEn: string;
    nameAr: string;
    titleAr: string;
  }>;
  try {
    const parsed: unknown = JSON.parse(claudeResponse);
    if (!Array.isArray(parsed)) {
      console.warn("[dataAgent] Claude government response is not an array.");
      return { recordsUpdated: 0 };
    }
    ministers = parsed as typeof ministers;
  } catch {
    console.warn(
      `[dataAgent] Could not parse Claude government response: ${claudeResponse}`
    );
    return { recordsUpdated: 0 };
  }

  if (ministers.length === 0) {
    console.warn("[dataAgent] Claude found no ministers in page content.");
    return { recordsUpdated: 0 };
  }

  // Flag potential changes for human review via a mutation
  const recordsUpdated: number = await ctx.runMutation(
    internal.dataRefresh.flagGovernmentChanges,
    {
      detectedMinisters: ministers,
      sourceUrl: CABINET_URL,
    }
  );

  return { recordsUpdated, sourceUrl: CABINET_URL };
}

// ─── PARLIAMENT REFRESH ───────────────────────────────────────────────────────

async function refreshParliamentData(
  _ctx: ActionCtx
): Promise<{ recordsUpdated: number; sourceUrl?: string }> {
  // Parliament data changes rarely; log a no-op for now and return 0.
  // When a data source becomes available, implement fetch + Claude parse here.
  console.log(
    "[dataAgent] Parliament refresh: no automated source configured yet."
  );
  return { recordsUpdated: 0 };
}

// ─── ECONOMY REFRESH ──────────────────────────────────────────────────────────

// World Bank indicator codes for Egypt
const WB_INDICATORS: Array<{
  code: string;
  indicator: string;
  unit: string;
  sourceNameEn: string;
  scaleFactor?: number;
}> = [
  {
    code: "NY.GDP.MKTP.KD.ZG",
    indicator: "gdp_growth",
    unit: "percent",
    sourceNameEn: "World Bank — GDP growth (annual %)",
  },
  {
    code: "FP.CPI.TOTL.ZG",
    indicator: "inflation",
    unit: "percent",
    sourceNameEn: "World Bank — Inflation, consumer prices (annual %)",
  },
  {
    code: "SL.UEM.TOTL.ZS",
    indicator: "unemployment",
    unit: "percent",
    sourceNameEn: "World Bank — Unemployment, total (% of total labor force)",
  },
  {
    code: "FI.RES.TOTL.CD",
    indicator: "reserves",
    unit: "billion_usd",
    sourceNameEn: "World Bank — Total reserves (current USD)",
    scaleFactor: 1e9, // API returns raw USD; divide to get billions
  },
  {
    code: "PA.NUS.FCRF",
    indicator: "exchange_rate",
    unit: "egp_per_usd",
    sourceNameEn: "World Bank — Official exchange rate (LCU per USD, period average)",
  },
];

async function refreshEconomyData(
  ctx: ActionCtx
): Promise<{ recordsUpdated: number; sourceUrl?: string }> {
  let totalUpdated = 0;
  const BASE_URL = "https://api.worldbank.org/v2/country/EGY/indicator";

  for (const wb of WB_INDICATORS) {
    const url = `${BASE_URL}/${wb.code}?format=json&per_page=15&mrv=15`;
    let entries: Array<{ date: string; value: number | null }>;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(
          `[dataAgent/economy] World Bank API returned ${response.status} for indicator ${wb.code}`
        );
        continue;
      }
      const raw: unknown = await response.json();
      entries = parseWorldBankResponse(raw);
    } catch (err) {
      console.warn(
        `[dataAgent/economy] Failed to fetch ${wb.code}: ${String(err)}`
      );
      continue;
    }

    for (const entry of entries) {
      if (entry.value === null || entry.value === undefined) continue;

      // World Bank dates are either "YYYY" or "YYYY-MM-DD"
      const date =
        entry.date.length === 4 ? `${entry.date}-12-31` : entry.date;
      const year = entry.date.length === 4 ? entry.date : entry.date.slice(0, 4);
      const value =
        wb.scaleFactor !== undefined ? entry.value / wb.scaleFactor : entry.value;

      const updated: number = await ctx.runMutation(
        internal.dataRefresh.upsertEconomicIndicator,
        {
          indicator: wb.indicator,
          date,
          year,
          value,
          unit: wb.unit,
          sourceUrl: url,
          sourceNameEn: wb.sourceNameEn,
        }
      );
      totalUpdated += updated;
    }
  }

  return {
    recordsUpdated: totalUpdated,
    sourceUrl: "https://api.worldbank.org/v2/country/EGY/indicator",
  };
}

// ─── CATEGORY DISPATCHER ─────────────────────────────────────────────────────

async function refreshCategory(
  ctx: ActionCtx,
  category: RefreshCategory
): Promise<void> {
  const logId = await ctx.runMutation(
    internal.dataRefresh.logRefreshStart,
    { category }
  ) as Id<"dataRefreshLog">;

  console.log(`[dataAgent] Starting refresh for category: ${category}`);

  try {
    let result: { recordsUpdated: number; sourceUrl?: string } = { recordsUpdated: 0 };

    switch (category) {
      case "debt":
        result = await refreshDebtData(ctx);
        break;
      case "budget":
        result = await refreshBudgetData(ctx);
        break;
      case "government":
        result = await refreshGovernmentData(ctx);
        break;
      case "parliament":
        result = await refreshParliamentData(ctx);
        break;
      case "economy":
        result = await refreshEconomyData(ctx);
        break;
    }

    const { recordsUpdated, sourceUrl } = result;

    // Only log detailed change entries when something actually changed.
    // The dataRefreshLog already records that a refresh ran — the change log
    // should only track meaningful changes to keep storage lean.
    if (recordsUpdated > 0) {
      const descriptionEnMap: Record<RefreshCategory, string> = {
        debt: `Updated ${recordsUpdated} debt record(s) from World Bank API`,
        budget: `Updated ${recordsUpdated} budget record(s) from Ministry of Finance`,
        government: `Flagged ${recordsUpdated} potential government change(s) for human review`,
        parliament: `Parliament refresh complete — ${recordsUpdated} record(s) updated`,
        economy: `Updated ${recordsUpdated} economic indicator(s) from World Bank API`,
      };
      const descriptionArMap: Record<RefreshCategory, string> = {
        debt: `تم تحديث ${recordsUpdated} سجل ديون من بيانات البنك الدولي`,
        budget: `تم تحديث ${recordsUpdated} سجل ميزانية من وزارة المالية`,
        government: `تم الإشارة إلى ${recordsUpdated} تغيير محتمل في الحكومة للمراجعة البشرية`,
        parliament: `اكتمل تحديث البرلمان — ${recordsUpdated} سجل محدث`,
        economy: `تم تحديث ${recordsUpdated} مؤشر اقتصادي من بيانات البنك الدولي`,
      };
      const tableNameMap: Record<RefreshCategory, string> = {
        debt: "debtRecords",
        budget: "fiscalYears",
        government: "officials",
        parliament: "parliamentMembers",
        economy: "economicIndicators",
      };

      await ctx.runMutation(internal.dataRefresh.logChange, {
        refreshLogId: logId,
        category,
        action: "updated" as const,
        tableName: tableNameMap[category],
        descriptionEn: descriptionEnMap[category],
        descriptionAr: descriptionArMap[category],
        sourceUrl,
      });
    }

    await ctx.runMutation(internal.dataRefresh.logRefreshComplete, {
      logId,
      recordsUpdated,
      sourceUrl,
    });

    console.log(
      `[dataAgent] Completed refresh for ${category}: ${recordsUpdated} records updated.`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[dataAgent] Refresh failed for ${category}: ${message}`);
    await ctx.runMutation(internal.dataRefresh.logRefreshFailed, {
      logId,
      errorMessage: message,
    });
  }
}

// ─── ORCHESTRATOR ACTION ──────────────────────────────────────────────────────

/**
 * Main AI orchestrator. Checks which data categories are stale (>24 h since
 * last successful refresh) and refreshes them using public APIs and Claude.
 *
 * Called by the cron job every 6 hours and can also be triggered manually.
 */
export const orchestrateRefresh = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("[dataAgent] orchestrateRefresh started.");

    // Ensure reference data is loaded before running the AI refresh.
    // This is a no-op if all tables are already populated (zero writes).
    await ctx.runMutation(internal.referenceData.ensureAllReferenceData, {});

    // Fetch last-updated timestamps for all categories
    const lastUpdated = await ctx.runQuery(api.dataRefresh.getAllLastUpdated, {});

    const now = Date.now();
    const categories: Array<RefreshCategory> = [
      "government",
      "parliament",
      "budget",
      "debt",
      "economy",
    ];

    for (const category of categories) {
      const lastTime = lastUpdated[category];
      if (lastTime !== null && now - lastTime < STALE_THRESHOLD_MS) {
        console.log(
          `[dataAgent] Category "${category}" is fresh — skipping (last updated ${new Date(lastTime).toISOString()}).`
        );
        continue;
      }

      await refreshCategory(ctx, category);
    }

    // Ensure reference data exists (zero cost if tables already populated)
    await ctx.runMutation(internal.referenceData.ensureAllReferenceData, {});

    // Ensure constitution is complete (only runs if < 247 articles)
    try {
      await ctx.runAction(
        internal.agents.constitutionAgent.refreshConstitution,
        {}
      );
    } catch (err) {
      console.warn(
        `[dataAgent] Constitution refresh failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    console.log("[dataAgent] orchestrateRefresh completed.");

    // After all category refreshes, process community corrections from GitHub
    await ctx.runAction(internal.agents.githubAgent.processGitHubIssues, {});

    return null;
  },
});
