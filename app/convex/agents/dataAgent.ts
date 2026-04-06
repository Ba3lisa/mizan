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

type RefreshCategory = "government" | "parliament" | "budget" | "debt";

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── DEBT REFRESH ─────────────────────────────────────────────────────────────

async function refreshDebtData(
  ctx: ActionCtx
): Promise<{ recordsUpdated: number; sourceUrl?: string }> {
  const SOURCE_URL =
    "https://api.worldbank.org/v2/country/EGY/indicator/DT.DOD.DECT.CD?format=json&per_page=10";

  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(
      `World Bank API request failed with status ${response.status}`
    );
  }

  const raw: unknown = await response.json();
  const entries = parseWorldBankResponse(raw);

  if (entries.length === 0) {
    console.warn("[dataAgent] World Bank returned no debt entries for Egypt.");
    return { recordsUpdated: 0 };
  }

  // Take the most recent entry
  const latest = entries[0];
  const debtValueUsd = latest.value; // already confirmed non-null by parser

  const record = {
    totalExternalDebt: debtValueUsd ?? undefined,
  };

  const validation = validateDebtRecord(record);
  if (!validation.valid) {
    throw new Error(
      `Debt record failed validation: ${validation.errors.join("; ")}`
    );
  }

  // Upsert the debt record via a mutation
  const recordsUpdated: number = await ctx.runMutation(
    internal.dataRefresh.upsertDebtRecord,
    {
      date: latest.date,
      totalExternalDebt: debtValueUsd ?? undefined,
      sourceUrl: SOURCE_URL,
    }
  );

  return { recordsUpdated, sourceUrl: SOURCE_URL };
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
      };
      const descriptionArMap: Record<RefreshCategory, string> = {
        debt: `تم تحديث ${recordsUpdated} سجل ديون من بيانات البنك الدولي`,
        budget: `تم تحديث ${recordsUpdated} سجل ميزانية من وزارة المالية`,
        government: `تم الإشارة إلى ${recordsUpdated} تغيير محتمل في الحكومة للمراجعة البشرية`,
        parliament: `اكتمل تحديث البرلمان — ${recordsUpdated} سجل محدث`,
      };
      const tableNameMap: Record<RefreshCategory, string> = {
        debt: "debtRecords",
        budget: "fiscalYears",
        government: "officials",
        parliament: "parliamentMembers",
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
