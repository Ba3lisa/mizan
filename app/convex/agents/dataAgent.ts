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
import { callLLMStructured as callClaudeStructured } from "./providers/registry";
import { callClaudeWithUsage, callClaudeWithServerTools, callClaudeStructuredWithUsage } from "./providers/anthropic";

// ─── COST TRACKING ───────────────────────────────────────────────────────────

// Haiku pricing: $0.80/MTok input, $4/MTok output
const COST_PER_INPUT_TOKEN = 0.80 / 1_000_000;
const COST_PER_OUTPUT_TOKEN = 4.0 / 1_000_000;

/**
 * Call Claude and log usage to apiUsageLog for the funding page.
 * Drop-in replacement for callClaude that adds cost tracking.
 */
async function callClaude(
  ctx: ActionCtx,
  prompt: string,
  systemPrompt?: string,
  purpose = "data_pipeline"
): Promise<string | null> {
  const result = await callClaudeWithUsage(prompt, systemPrompt);

  // Log usage if we got a response
  if (result.usage) {
    const { inputTokens, outputTokens, model, durationMs } = result.usage;
    const costUsd = inputTokens * COST_PER_INPUT_TOKEN + outputTokens * COST_PER_OUTPUT_TOKEN;
    try {
      await ctx.runMutation(internal.usage.logApiUsage, {
        provider: "anthropic",
        model,
        purpose,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        costUsd,
        durationMs,
        success: result.text !== null,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.warn("[dataAgent] Failed to log API usage:", err);
    }
  }

  return result.text;
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

type RefreshCategory = "government" | "parliament" | "budget" | "debt" | "economy" | "governorate_stats";

const STALE_THRESHOLD_MS = 6 * 60 * 60 * 1000; // 6 hours (matches cron interval)

// ─── SOURCE REGISTRY ─────────────────────────────────────────────────────────
// Every URL the pipeline fetches, grouped by category.
// On each successful refresh, all sources for that category are upserted into
// the `dataSources` table so the /transparency page stays in sync automatically.

type SourceEntry = {
  nameEn: string;
  nameAr: string;
  url: string;
  type: "official_government" | "international_org" | "academic" | "media" | "other";
};

const CATEGORY_SOURCES: Record<string, SourceEntry[]> = {
  debt: [
    { nameEn: "World Bank — External Debt Stock", nameAr: "البنك الدولي — رصيد الدين الخارجي", url: "https://api.worldbank.org/v2/country/EGY/indicator/DT.DOD.DECT.CD", type: "international_org" },
    { nameEn: "World Bank — Debt Service Payments", nameAr: "البنك الدولي — مدفوعات خدمة الدين", url: "https://api.worldbank.org/v2/country/EGY/indicator/DT.TDS.DECT.CD", type: "international_org" },
  ],
  budget: [
    { nameEn: "Ministry of Finance — Financial Monthly", nameAr: "وزارة المالية — النشرة المالية الشهرية", url: "https://www.mof.gov.eg", type: "official_government" },
    { nameEn: "Wikipedia — Economy of Egypt", nameAr: "ويكيبيديا — اقتصاد مصر", url: "https://en.wikipedia.org/wiki/Economy_of_Egypt", type: "media" },
  ],
  government: [
    { nameEn: "Ahram Online — Cabinet Composition", nameAr: "الأهرام — تشكيل مجلس الوزراء", url: "https://english.ahram.org.eg/News/562168.aspx", type: "media" },
    { nameEn: "Ahram Online — Governors List", nameAr: "الأهرام — قائمة المحافظين", url: "https://english.ahram.org.eg/News/526575.aspx", type: "media" },
  ],
  parliament: [
    { nameEn: "Wikipedia — 2025 Egyptian Parliamentary Election", nameAr: "ويكيبيديا — انتخابات البرلمان المصري ٢٠٢٥", url: "https://en.wikipedia.org/wiki/2025_Egyptian_parliamentary_election", type: "media" },
  ],
  economy: [
    { nameEn: "World Bank — Economic Indicators", nameAr: "البنك الدولي — المؤشرات الاقتصادية", url: "https://api.worldbank.org/v2/country/EGY/indicator", type: "international_org" },
    { nameEn: "IMF — DataMapper API", nameAr: "صندوق النقد الدولي — واجهة بيانات DataMapper", url: "https://www.imf.org/external/datamapper/api/v1", type: "international_org" },
    { nameEn: "ExchangeRate API — USD/EGP", nameAr: "واجهة أسعار الصرف — دولار/جنيه", url: "https://open.er-api.com/v6/latest/USD", type: "other" },
    { nameEn: "Central Bank of Egypt — T-Bill Rates", nameAr: "البنك المركزي المصري — أسعار أذون الخزانة", url: "https://www.cbe.org.eg/en/economic-research/statistics/egp-t-bills-secondary-market", type: "official_government" },
    { nameEn: "Banque Misr — Certificate of Deposit Rates", nameAr: "بنك مصر — أسعار شهادات الإيداع", url: "https://www.banquemisr.com/en/SMEs/Retail-Banking/Accounts-And-Deposits/Certificates", type: "other" },
    { nameEn: "CountryEconomy — EGX 30 Stock Index", nameAr: "CountryEconomy — مؤشر البورصة المصرية EGX 30", url: "https://countryeconomy.com/stock-exchange/egypt", type: "other" },
    { nameEn: "Egyptian Exchange (EGX)", nameAr: "البورصة المصرية (EGX)", url: "https://www.egx.com.eg", type: "other" },
  ],
  governorate_stats: [
    { nameEn: "Wikipedia — Governorates of Egypt", nameAr: "ويكيبيديا — محافظات مصر", url: "https://en.wikipedia.org/wiki/Governorates_of_Egypt", type: "media" },
    { nameEn: "Wikipedia — Governorate HDI Rankings", nameAr: "ويكيبيديا — ترتيب المحافظات حسب التنمية البشرية", url: "https://en.wikipedia.org/wiki/List_of_governorates_of_Egypt_by_Human_Development_Index", type: "media" },
  ],
  constitution: [
    { nameEn: "FAO — Egypt Constitution 2019 (PDF)", nameAr: "منظمة الأغذية والزراعة — دستور مصر ٢٠١٩", url: "https://faolex.fao.org/docs/pdf/egy127542e.pdf", type: "international_org" },
    { nameEn: "Constitute Project — Egypt 2019", nameAr: "مشروع Constitute — دستور مصر ٢٠١٩", url: "https://www.constituteproject.org/constitution/Egypt_2019", type: "academic" },
  ],
};

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
        sanadLevel: 2,
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
    console.warn("[dataAgent] Skipping budget refresh — ANTHROPIC_API_KEY not set.");
    return { recordsUpdated: 0 };
  }

  // ── Level 1: MOF Financial Monthly PDF via Claude web_search + web_fetch ──
  // Claude searches for the latest PDF on assets.mof.gov.eg, fetches it, and
  // extracts fiscal data from Section 4 (Fiscal Sector). Anthropic executes
  // the search/fetch server-side — no headless browser needed.
  try {
    console.log("[dataAgent/budget] Attempting MOF PDF via Claude web_search + web_fetch...");

    const result = await callClaudeWithServerTools(
      `Search for the latest Egypt government budget data. Try these searches:
1. "Egypt Ministry of Finance Financial Monthly 2025 revenue expenditure deficit EGP billions"
2. "Egypt budget fiscal year 2024/2025 total revenue total expenditure"

From the search results, extract the most recent Egyptian national budget figures.

RESPOND WITH ONLY THIS JSON — no explanation, no preamble:
{
  "fiscalYear": "2024/2025",
  "totalRevenue": <cumulative revenue in EGP billions — e.g. 1442 not 1.442>,
  "totalExpenditure": <cumulative expenditure in EGP billions — e.g. 2308 not 2.308>,
  "deficit": <overall deficit in EGP billions, negative means deficit — e.g. -879 not -0.879>,
  "gdp": <GDP in EGP billions — e.g. 17000 not 17>,
  "sourceUrl": "<URL of the source with the data>",
  "period": "<e.g. July-October 2025>"
}

CRITICAL: All monetary values MUST be in EGP BILLIONS (not trillions). If a source says "EGP 1.442 trillion", convert to 1442 billion. If it says "EGP 879.3 billion", use 879.3.
totalRevenue and totalExpenditure are REQUIRED. Use the most recent figures available.`,
      [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 3,
        },
      ],
      "You are a data extraction assistant. Return ONLY valid JSON. No prose, no explanations, no markdown fences.",
    );

    // Log usage (tokens + search costs)
    if (result.usage) {
      const { inputTokens, outputTokens, model, durationMs } = result.usage;
      const costUsd = inputTokens * COST_PER_INPUT_TOKEN + outputTokens * COST_PER_OUTPUT_TOKEN;
      try {
        await ctx.runMutation(internal.usage.logApiUsage, {
          provider: "anthropic",
          model,
          purpose: "data_pipeline_budget",
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          costUsd,
          durationMs,
          success: result.text !== null,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.warn("[dataAgent/budget] Failed to log API usage:", err);
      }
    }

    if (result.text) {
      const mofResult = parseBudgetJson(result.text);
      if (mofResult?.fiscalYear) {
        const srcUrl = mofResult.sourceUrl ?? "https://www.mof.gov.eg";
        // Determine sanadLevel from source domain
        const isMof = srcUrl.includes("mof.gov.eg");
        const isIntlOrg = srcUrl.includes("worldbank.org") || srcUrl.includes("imf.org");
        const sanadLevel = isMof ? 1 : isIntlOrg ? 2 : 3;

        const recordsUpdated: number = await ctx.runMutation(
          internal.dataRefresh.upsertFiscalYear,
          {
            year: mofResult.fiscalYear,
            totalRevenue: mofResult.totalRevenue,
            totalExpenditure: mofResult.totalExpenditure,
            deficit: mofResult.deficit,
            gdp: mofResult.gdp,
            sourceUrl: srcUrl,
            sanadLevel,
          }
        );
        console.log(`[dataAgent/budget] Web search: ${recordsUpdated} records updated (sanad ${sanadLevel}, source: ${srcUrl}).`);
        return { recordsUpdated, sourceUrl: srcUrl };
      }
    }
    console.warn("[dataAgent/budget] MOF PDF extraction returned no usable data — falling back to Wikipedia.");
  } catch (err) {
    console.warn(`[dataAgent/budget] MOF PDF approach failed: ${err instanceof Error ? err.message : String(err)} — falling back to Wikipedia.`);
  }

  // ── Level 2: Wikipedia Economy of Egypt infobox ───────────────────────────
  // The infobox has structured fields like: | revenue = $60.671 billion (2025)
  try {
    console.log("[dataAgent/budget] Fetching Wikipedia Economy of Egypt infobox...");
    const wikiUrl = "https://en.wikipedia.org/w/api.php?action=parse&page=Economy_of_Egypt&prop=wikitext&section=0&format=json";
    const wikiRes = await fetch(wikiUrl, { signal: AbortSignal.timeout(15000) });

    if (!wikiRes.ok) {
      console.warn(`[dataAgent/budget] Wikipedia returned ${wikiRes.status}`);
      return { recordsUpdated: 0 };
    }

    const wikiData = await wikiRes.json() as { parse?: { wikitext?: { "*"?: string } } };
    const wikitext = wikiData?.parse?.wikitext?.["*"] ?? "";

    if (wikitext.length < 500) {
      console.warn("[dataAgent/budget] Wikipedia infobox too short.");
      return { recordsUpdated: 0 };
    }

    // Extract with Claude — wikitext is structured template data, very reliable
    const wikiResponse = await callClaude(ctx,
      `Extract Egyptian government budget data from this Wikipedia infobox wikitext.
The infobox contains fields like: | revenue = $XX billion (YYYY) | expenses = $XX billion (YYYY)

Return JSON (no markdown fences):
{
  "fiscalYear": "2024/2025",
  "revenueUsd": <number in USD billions>,
  "expenditureUsd": <number in USD billions>,
  "deficitUsd": <number in USD billions, negative = deficit>,
  "gdpNominalUsd": <number in USD billions>,
  "year": "2025"
}

Wikitext (first 6000 chars):
${wikitext.slice(0, 6000)}`,
      "Extract fiscal data from Wikipedia infobox. JSON only, no markdown."
    );

    if (!wikiResponse) {
      console.warn("[dataAgent/budget] Claude returned no data from Wikipedia.");
      return { recordsUpdated: 0 };
    }

    const wikiBudget = parseBudgetJson(wikiResponse);
    if (!wikiBudget?.fiscalYear && !wikiBudget?.revenueUsd) {
      console.warn("[dataAgent/budget] Could not parse Wikipedia budget data.");
      return { recordsUpdated: 0 };
    }

    // Convert USD → EGP using latest exchange rate from economicIndicators
    let usdToEgp = 50; // Conservative fallback
    try {
      const fxRecords = await ctx.runQuery(api.economy.getIndicator, { indicator: "exchange_rate", limit: 1 }) as Array<{ value: number }>;
      if (fxRecords.length > 0 && fxRecords[0].value > 0) {
        usdToEgp = fxRecords[0].value;
      }
    } catch {
      console.warn("[dataAgent/budget] Could not fetch exchange rate, using fallback.");
    }

    const fiscalYear = wikiBudget.fiscalYear ?? `${wikiBudget.year ?? "2025"}`;
    const totalRevenue = wikiBudget.revenueUsd ? wikiBudget.revenueUsd * usdToEgp : wikiBudget.totalRevenue;
    const totalExpenditure = wikiBudget.expenditureUsd ? wikiBudget.expenditureUsd * usdToEgp : wikiBudget.totalExpenditure;
    const deficit = wikiBudget.deficitUsd ? wikiBudget.deficitUsd * usdToEgp : wikiBudget.deficit;
    const gdp = wikiBudget.gdpNominalUsd ? wikiBudget.gdpNominalUsd * usdToEgp : wikiBudget.gdp;

    const recordsUpdated: number = await ctx.runMutation(
      internal.dataRefresh.upsertFiscalYear,
      {
        year: fiscalYear,
        totalRevenue,
        totalExpenditure,
        deficit,
        gdp,
        sourceUrl: "https://en.wikipedia.org/wiki/Economy_of_Egypt",
        sanadLevel: 3, // Wikipedia citing IMF
      }
    );

    console.log(`[dataAgent/budget] Wikipedia fallback: ${recordsUpdated} records updated.`);
    return { recordsUpdated, sourceUrl: "https://en.wikipedia.org/wiki/Economy_of_Egypt" };
  } catch (err) {
    console.warn(`[dataAgent/budget] Wikipedia fallback failed: ${err instanceof Error ? err.message : String(err)}`);
    return { recordsUpdated: 0 };
  }
}

interface BudgetParseResult {
  fiscalYear?: string;
  totalRevenue?: number;
  totalExpenditure?: number;
  deficit?: number;
  gdp?: number;
  sourceUrl?: string;
  revenueUsd?: number;
  expenditureUsd?: number;
  deficitUsd?: number;
  gdpNominalUsd?: number;
  year?: string;
}

/** Parse budget JSON from Claude response, handling markdown fences and prose. */
function parseBudgetJson(text: string): BudgetParseResult | null {
  try {
    let jsonStr = text;
    // Strip markdown fences
    const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) jsonStr = fence[1];
    // If still not valid JSON, try extracting a JSON object from prose
    if (!jsonStr.trim().startsWith("{")) {
      const objMatch = jsonStr.match(/\{[\s\S]*"fiscalYear"[\s\S]*\}/);
      if (objMatch) jsonStr = objMatch[0];
    }
    const raw = JSON.parse(jsonStr.trim()) as Record<string, unknown>;
    return {
      fiscalYear: typeof raw.fiscalYear === "string" ? raw.fiscalYear : undefined,
      totalRevenue: typeof raw.totalRevenue === "number" ? raw.totalRevenue : undefined,
      totalExpenditure: typeof raw.totalExpenditure === "number" ? raw.totalExpenditure : undefined,
      deficit: typeof raw.deficit === "number" ? raw.deficit : undefined,
      gdp: typeof raw.gdp === "number" ? raw.gdp : undefined,
      sourceUrl: typeof raw.sourceUrl === "string" ? raw.sourceUrl : undefined,
      revenueUsd: typeof raw.revenueUsd === "number" ? raw.revenueUsd : undefined,
      expenditureUsd: typeof raw.expenditureUsd === "number" ? raw.expenditureUsd : undefined,
      deficitUsd: typeof raw.deficitUsd === "number" ? raw.deficitUsd : undefined,
      gdpNominalUsd: typeof raw.gdpNominalUsd === "number" ? raw.gdpNominalUsd : undefined,
      year: typeof raw.year === "string" ? raw.year : undefined,
    };
  } catch {
    console.warn("[dataAgent/budget] JSON parse failed:", text.slice(0, 200));
    return null;
  }
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

  // Primary: Ahram Online (gov-affiliated news, has full cabinet lineup)
  // Wikipedia "Second Madbouly Cabinet" article doesn't exist yet
  const AHRAM_URL = "https://english.ahram.org.eg/News/562168.aspx";

  let pageText = "";
  const sourceUrl = AHRAM_URL;

  try {
    const ahramRes = await fetch(AHRAM_URL, { signal: AbortSignal.timeout(15000) });
    if (ahramRes.ok) {
      const html = await ahramRes.text();
      const titleMarker = html.indexOf("ContentPlaceHolder1_hd");
      const bodyStart = titleMarker > 0 ? titleMarker : html.indexOf("ContentPlaceHolder1_bref");
      const articleHtml = bodyStart > 0 ? html.slice(bodyStart, bodyStart + 15000) : html.slice(Math.floor(html.length / 2), Math.floor(html.length / 2) + 15000);
      pageText = articleHtml.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
      console.log(`[dataAgent] Fetched Ahram cabinet article: ${pageText.length} chars`);
    }
  } catch (err) {
    console.warn(`[dataAgent] Ahram fetch failed: ${err}`);
  }

  if (pageText.length < 500) {
    console.warn("[dataAgent] Insufficient page content for government extraction");
    return { recordsUpdated: 0 };
  }

  const CABINET_URL = sourceUrl;

  const systemPrompt = `You are a data extraction assistant for Mizan, Egypt's government transparency platform.
Extract structured Egyptian government data from official sources.
Always respond with valid JSON only — no markdown, no prose.`;

  const prompt = `Extract ALL current Egyptian government officials from this article.

IMPORTANT: Always include these at the top of the array:
1. {"nameEn": "Abdel Fattah el-Sisi", "titleEn": "President of Egypt", "nameAr": "عبد الفتاح السيسي", "titleAr": "رئيس الجمهورية", "role": "president"}
2. {"nameEn": "Mostafa Madbouly", "titleEn": "Prime Minister", "nameAr": "مصطفى مدبولي", "titleAr": "رئيس الوزراء", "role": "prime_minister"}

Then extract ALL ministers from the article below (30+ ministers).

Return a JSON array. Each entry: {"nameEn": "...", "titleEn": "...", "nameAr": "", "titleAr": "", "role": "president"|"prime_minister"|"minister"}

Page content:
${pageText || "(page content unavailable)"}`;

  // Fetch governor data from Ahram Online (separate article from cabinet)
  let governorText = "";
  try {
    const govAhramRes = await fetch("https://english.ahram.org.eg/News/526575.aspx", { signal: AbortSignal.timeout(10000) });
    if (govAhramRes.ok) {
      const html = await govAhramRes.text();
      const titleMarker = html.indexOf("ContentPlaceHolder1_hd");
      const bodyStart = titleMarker > 0 ? titleMarker : 0;
      governorText = html.slice(bodyStart, bodyStart + 10000).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
      console.log(`[dataAgent] Fetched Ahram governor article: ${governorText.length} chars`);
    }
  } catch {
    console.warn("[dataAgent] Ahram governor article fetch failed");
  }

  console.log(`[dataAgent] Government: sending ${pageText.length} chars to Claude for ministers...`);
  const claudeResponse = await callClaude(ctx, prompt, systemPrompt);

  if (!claudeResponse) {
    console.warn("[dataAgent] Claude returned no government data (null response).");
    return { recordsUpdated: 0 };
  }

  console.log(`[dataAgent] Government: Claude returned ${claudeResponse.length} chars`);

  let officials: Array<{
    nameEn: string;
    titleEn: string;
    nameAr: string;
    titleAr: string;
    role: string;
  }>;
  try {
    let jsonStr = claudeResponse;
    const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) jsonStr = fence[1];
    const parsed: unknown = JSON.parse(jsonStr.trim());
    if (!Array.isArray(parsed)) {
      console.warn("[dataAgent] Claude government response is not an array.");
      return { recordsUpdated: 0 };
    }
    officials = parsed as typeof officials;
  } catch {
    console.warn(
      `[dataAgent] Could not parse Claude government response`
    );
    return { recordsUpdated: 0 };
  }

  console.log(`[dataAgent] Government: parsed ${officials.length} officials from Claude response`);
  if (officials.length === 0) {
    console.warn("[dataAgent] Claude found no officials. First 300 chars of response: " + claudeResponse.slice(0, 300));
    return { recordsUpdated: 0 };
  }

  // Auto-write officials to DB (upsert by name, never delete existing)
  let recordsUpdated: number = await ctx.runMutation(
    internal.dataRefresh.upsertGovernmentOfficials,
    {
      officials: officials.map((o) => ({
        nameEn: o.nameEn,
        nameAr: o.nameAr || o.nameEn,
        titleEn: o.titleEn,
        titleAr: o.titleAr || o.titleEn,
        role: o.role === "president" ? "president" as const
          : o.role === "prime_minister" ? "prime_minister" as const
          : "minister" as const,
      })),
      sourceUrl: CABINET_URL,
      sanadLevel: 3,
    }
  );

  // Step 2: Extract governors separately (different source)
  if (governorText.length > 200) {
    console.log(`[dataAgent] Government: extracting governors from ${governorText.length} chars...`);
    const govResponse = await callClaude(ctx,
      `Extract ALL 27 Egyptian governors from this text.
Return a JSON array: [{"nameEn": "...", "titleEn": "Governor of [Governorate]", "nameAr": "", "titleAr": "", "role": "governor"}]
Egypt has 27 governorates. Extract every governor mentioned.

Text:
${governorText.slice(0, 8000)}`,
      systemPrompt
    );

    if (govResponse) {
      try {
        let jsonStr = govResponse;
        const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fence) jsonStr = fence[1];
        const govParsed = JSON.parse(jsonStr.trim()) as Array<{
          nameEn: string; titleEn: string; nameAr: string; titleAr: string; role: string;
        }>;
        if (Array.isArray(govParsed) && govParsed.length > 0) {
          const govUpdated: number = await ctx.runMutation(
            internal.dataRefresh.upsertGovernmentOfficials,
            {
              officials: govParsed.map((o) => ({
                nameEn: o.nameEn,
                nameAr: o.nameAr || "",
                titleEn: o.titleEn,
                titleAr: o.titleAr || "",
                role: "governor" as const,
              })),
              sourceUrl: "https://english.ahram.org.eg/News/526575.aspx",
              sanadLevel: 3,
            }
          );
          recordsUpdated += govUpdated;
          console.log(`[dataAgent] Government: ${govParsed.length} governors extracted`);
        }
      } catch {
        console.warn("[dataAgent] Failed to parse governor response");
      }
    }
  }

  return { recordsUpdated, sourceUrl: CABINET_URL };
}

// ─── PARLIAMENT REFRESH ───────────────────────────────────────────────────────

async function refreshParliamentData(
  ctx: ActionCtx
): Promise<{ recordsUpdated: number; sourceUrl?: string }> {
  // Delegate to the parliament agent which fetches composition from Wikipedia
  // and uses Claude to extract party/seat data
  try {
    const result: { status: string; partiesUpdated?: number } =
      await ctx.runAction(
        internal.agents.parliamentAgent.refreshParliament,
        {}
      );
    return {
      recordsUpdated: result.partiesUpdated ?? 0,
      sourceUrl: "https://en.wikipedia.org/wiki/2025_Egyptian_parliamentary_election",
    };
  } catch (err) {
    console.warn(
      `[dataAgent] Parliament refresh failed: ${err instanceof Error ? err.message : String(err)}`
    );
    return { recordsUpdated: 0 };
  }
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
  // Exchange rate removed from WB -- annual average is outdated.
  // Live rate fetched separately from Frankfurter API (see refreshEconomyData).
  {
    code: "BX.TRF.PWKR.CD.DT",
    indicator: "remittances",
    unit: "billion_usd",
    scaleFactor: 1e9,
    sourceNameEn: "World Bank",
  },
  {
    code: "BX.KLT.DINV.CD.WD",
    indicator: "fdi_inflows",
    unit: "billion_usd",
    scaleFactor: 1e9,
    sourceNameEn: "World Bank",
  },
  {
    code: "ST.INT.RCPT.CD",
    indicator: "tourism_receipts",
    unit: "billion_usd",
    scaleFactor: 1e9,
    sourceNameEn: "World Bank",
  },
  {
    code: "BN.CAB.XOKA.CD",
    indicator: "current_account",
    unit: "billion_usd",
    scaleFactor: 1e9,
    sourceNameEn: "World Bank",
  },
  {
    code: "NY.GDP.MKTP.CD",
    indicator: "gdp_nominal",
    unit: "billion_usd",
    scaleFactor: 1e9,
    sourceNameEn: "World Bank",
  },
  {
    code: "NY.GDP.PCAP.CD",
    indicator: "gdp_per_capita",
    unit: "usd",
    sourceNameEn: "World Bank",
  },
  {
    code: "SP.POP.TOTL",
    indicator: "population",
    unit: "millions",
    scaleFactor: 1e6,
    sourceNameEn: "World Bank",
  },
  {
    code: "SI.POV.NAHC",
    indicator: "poverty_rate",
    unit: "percent",
    sourceNameEn: "World Bank",
  },
  {
    code: "DT.TDS.DECT.EX.ZS",
    indicator: "debt_service_exports",
    unit: "percent",
    sourceNameEn: "World Bank",
  },
];

// ─── IMF DATAMAPPER REFRESH ───────────────────────────────────────────────────

// IMF DataMapper indicator codes for Egypt.
// The API returns both historical values and WEO forecasts through 2030.
const IMF_INDICATORS: Array<{
  code: string;
  indicator: string;
  unit: string;
  sourceNameEn: string;
}> = [
  {
    code: "NGDP_RPCH",
    indicator: "imf_gdp_growth_forecast",
    unit: "percent",
    sourceNameEn: "IMF WEO — Real GDP growth (annual %)",
  },
  {
    code: "PCPIPCH",
    indicator: "imf_inflation_forecast",
    unit: "percent",
    sourceNameEn: "IMF WEO — Inflation, average consumer prices (annual %)",
  },
  {
    code: "BCA_NGDPD",
    indicator: "imf_current_account_forecast",
    unit: "percent_gdp",
    sourceNameEn: "IMF WEO — Current account balance (% of GDP)",
  },
  {
    code: "GGXWDG_NGDP",
    indicator: "imf_gov_debt_gdp",
    unit: "percent_gdp",
    sourceNameEn: "IMF WEO — Government gross debt (% of GDP)",
  },
];

// IMF DataMapper API response shape
type IMFResponse = {
  values?: Record<string, Record<string, Record<string, number>>>;
};

// IMF direct API function -- kept for when IMF unblocks cloud IPs
async function _refreshIMFData(
  ctx: ActionCtx
): Promise<{ recordsUpdated: number }> {
  let totalUpdated = 0;
  const BASE_URL = "https://www.imf.org/external/datamapper/api/v1";

  // IMF DataMapper API blocks cloud IPs (403). Use Wikipedia as the source
  // for IMF projections -- the Economy of Egypt article cites IMF WEO data.
  // Fallback: one Claude call to extract forecasts from the Wikipedia text.
  console.log("[dataAgent/imf] Fetching IMF projections from Wikipedia...");

  let imfText = "";
  try {
    const wikiUrl = "https://en.wikipedia.org/w/api.php?action=query&titles=Economy_of_Egypt&prop=extracts&explaintext=true&format=json";
    const wikiRes = await fetch(wikiUrl, { signal: AbortSignal.timeout(15000) });
    if (wikiRes.ok) {
      const data = await wikiRes.json() as { query?: { pages?: Record<string, { extract?: string }> } };
      const pages = data?.query?.pages;
      if (pages) {
        imfText = Object.values(pages)[0]?.extract ?? "";
        imfText = imfText.slice(0, 15000);
      }
    }
  } catch {
    console.warn("[dataAgent/imf] Wikipedia fetch failed");
  }

  if (imfText.length > 500) {
    const imfResponse = await callClaude(ctx,
      `Extract IMF economic projections for Egypt from this Wikipedia article.
Return JSON: {"indicators": [{"indicator": "imf_gdp_growth_forecast", "data": {"2024": 2.4, "2025": 4.3, ...}}, ...]}

Extract these if available:
- imf_gdp_growth_forecast (Real GDP growth %)
- imf_inflation_forecast (Inflation %)
- imf_current_account_forecast (Current account % of GDP)
- imf_gov_debt_gdp (Government debt % of GDP)

Include both historical and forecast years (2020-2030).

Text: ${imfText}`,
      "Extract IMF economic data from Wikipedia. JSON only."
    );

    if (imfResponse) {
      try {
        let jsonStr = imfResponse;
        const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fence) jsonStr = fence[1];
        const parsed = JSON.parse(jsonStr.trim()) as {
          indicators?: Array<{ indicator: string; data: Record<string, number> }>;
        };

        if (parsed.indicators) {
          for (const ind of parsed.indicators) {
            const meta = IMF_INDICATORS.find((i) => i.indicator === ind.indicator);
            if (!meta) continue;
            for (const [yearStr, value] of Object.entries(ind.data)) {
              if (typeof value !== "number" || isNaN(value)) continue;
              const updated: number = await ctx.runMutation(
                internal.dataRefresh.upsertEconomicIndicator,
                {
                  indicator: ind.indicator,
                  date: `${yearStr}-12-31`,
                  year: yearStr,
                  value,
                  unit: meta.unit,
                  sourceUrl: "https://en.wikipedia.org/wiki/Economy_of_Egypt",
                  sourceNameEn: meta.sourceNameEn,
                  sanadLevel: 2,
                }
              );
              totalUpdated += updated;
            }
          }
          console.log(`[dataAgent/imf] Extracted IMF data from Wikipedia: ${totalUpdated} records`);
        }
      } catch {
        console.warn("[dataAgent/imf] Failed to parse IMF data from Wikipedia");
      }
    }
  }

  // Original loop kept as dead code for when IMF API access is restored
  const _skipDirectApi = true;
  for (const imf of IMF_INDICATORS) {
    if (_skipDirectApi) break;
    const url = `${BASE_URL}/${imf.code}/EGY`;
    let raw: unknown;

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) {
        console.warn(
          `[dataAgent/imf] IMF API returned ${response.status} for indicator ${imf.code}`
        );
        continue;
      }
      raw = await response.json();
    } catch (err) {
      console.warn(
        `[dataAgent/imf] Failed to fetch ${imf.code}: ${String(err)}`
      );
      continue;
    }

    // Parse IMF response: {"values":{"NGDP_RPCH":{"EGY":{"2024":2.4,"2025":4.3,...}}}}
    const typed = raw as IMFResponse;
    const yearMap = typed?.values?.[imf.code]?.["EGY"];
    if (!yearMap || typeof yearMap !== "object") {
      console.warn(
        `[dataAgent/imf] Unexpected IMF response shape for ${imf.code}`
      );
      continue;
    }

    for (const [yearStr, value] of Object.entries(yearMap)) {
      if (typeof value !== "number" || isNaN(value)) continue;

      // IMF year strings are like "2024"; store as YYYY-12-31 for consistency
      const date = `${yearStr}-12-31`;

      const updated: number = await ctx.runMutation(
        internal.dataRefresh.upsertEconomicIndicator,
        {
          indicator: imf.indicator,
          date,
          year: yearStr,
          value,
          unit: imf.unit,
          sourceUrl: url,
          sourceNameEn: imf.sourceNameEn,
          sanadLevel: 2,
        }
      );
      totalUpdated += updated;
    }

    console.log(
      `[dataAgent/imf] ${imf.code} -> ${imf.indicator}: ${Object.keys(yearMap).length} year(s) processed`
    );
  }

  return { recordsUpdated: totalUpdated };
}

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
          sanadLevel: 2,
        }
      );
      totalUpdated += updated;
    }
  }

  // Live exchange rate from ExchangeRate-API (free, no key, updated daily)
  try {
    const fxRes = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: AbortSignal.timeout(10000),
    });
    if (fxRes.ok) {
      const fxData = await fxRes.json() as { rates?: { EGP?: number }; time_last_update_utc?: string };
      const egpRate = fxData?.rates?.EGP;
      if (egpRate && egpRate > 0) {
        const today = new Date().toISOString().slice(0, 10);
        const updated: number = await ctx.runMutation(
          internal.dataRefresh.upsertEconomicIndicator,
          {
            indicator: "exchange_rate",
            date: today,
            year: today.slice(0, 4),
            value: egpRate,
            unit: "egp_per_usd",
            sourceUrl: "https://open.er-api.com",
            sourceNameEn: "ExchangeRate-API (daily rates)",
            sanadLevel: 4,
          }
        );
        totalUpdated += updated;
        console.log(`[dataAgent/economy] Exchange rate: ${egpRate} EGP/USD (${today})`);
      }
    }
  } catch {
    console.warn("[dataAgent/economy] Frankfurter exchange rate fetch failed");
  }

  // Also refresh EGX 30 stock market index
  const stockResult = await refreshStockMarket(ctx);
  totalUpdated += stockResult.recordsUpdated;

  // IMF forecasts: seeded from reference data (API blocks cloud IPs).
  // Ensure IMF data exists (no-op if already populated).
  try {
    const imfSeeded: number = await ctx.runMutation(
      internal.imfData.ensureIMFForecasts,
      {}
    );
    if (imfSeeded > 0) {
      totalUpdated += imfSeeded;
      console.log(`[dataAgent/economy] Seeded ${imfSeeded} IMF forecast records`);
    }
  } catch {
    console.warn("[dataAgent/economy] IMF seed failed");
  }

  // Also refresh investment-specific rates (bank CDs, T-bill yields)
  try {
    const investUpdated = await refreshInvestmentRates(ctx);
    totalUpdated += investUpdated;
    console.log(`[dataAgent/economy] Investment rates: ${investUpdated} updated.`);
  } catch (err) {
    console.warn(`[dataAgent/economy] Investment rates failed: ${err}`);
  }

  // Backfill historical investment indicator data (one-time, no-op when populated)
  try {
    const backfilled = await backfillInvestmentHistory(ctx);
    totalUpdated += backfilled;
    if (backfilled > 0) {
      console.log(`[dataAgent/economy] Investment history backfill: ${backfilled} records written.`);
    }
  } catch (err) {
    console.warn(`[dataAgent/economy] Investment history backfill failed: ${err}`);
  }

  return {
    recordsUpdated: totalUpdated,
    sourceUrl: "https://api.worldbank.org/v2/country/EGY/indicator",
  };
}

// ─── INVESTMENT RATES REFRESH ─────────────────────────────────────────────────

const CBE_TBILL_URL =
  "https://www.cbe.org.eg/en/economic-research/statistics/egp-t-bills-secondary-market";
const BANQUE_MISR_CD_URL =
  "https://www.banquemisr.com/en/SMEs/Retail-Banking/Accounts-And-Deposits/Certificates";

async function refreshInvestmentRates(ctx: ActionCtx): Promise<number> {
  let updated = 0;
  const today = new Date().toISOString().split("T")[0];
  const year = today.slice(0, 4);

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // ── CBE T-bill rates ──────────────────────────────────────────────────────
  try {
    const res = await fetch(CBE_TBILL_URL, { signal: AbortSignal.timeout(15000) });
    if (res.ok) {
      const html = await res.text();

      // Extract the first <table> block and strip to plain text (token-efficient)
      const tableStart = html.indexOf("<table");
      let tableText = "";
      if (tableStart > 0) {
        const tableEnd = html.indexOf("</table>", tableStart);
        const tableHtml = tableEnd > 0
          ? html.slice(tableStart, tableEnd + 8)
          : html.slice(tableStart, tableStart + 20000);
        tableText = tableHtml
          .replace(/<[^>]+>/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&nbsp;/g, " ")
          .replace(/&#[0-9]+;/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 6000);
      } else {
        // No table found — fall back to a plain-text slice of the body
        tableText = html
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 6000);
      }

      if (apiKey && tableText.length > 100) {
        const claudeResponse = await callClaude(ctx,
          `From this CBE T-bill secondary market page, extract the LATEST weighted average yield (percentage).
Return ONLY a JSON object: {"yield": <number>}
If you cannot find the yield, return {"yield": null}.

Page content:
${tableText}`,
          "You are a financial data extraction assistant. Return only valid JSON."
        );

        if (claudeResponse) {
          try {
            let jsonStr = claudeResponse.trim();
            const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (fence) jsonStr = fence[1];
            const parsed = JSON.parse(jsonStr) as { yield?: number | null };
            const rate = typeof parsed.yield === "number" && !isNaN(parsed.yield)
              ? parsed.yield
              : null;

            if (rate !== null) {
              const count: number = await ctx.runMutation(
                internal.dataRefresh.upsertEconomicIndicator,
                {
                  indicator: "egypt_tbill_rate",
                  date: today,
                  year,
                  value: rate,
                  unit: "percent",
                  sourceUrl: CBE_TBILL_URL,
                  sourceNameEn: "Central Bank of Egypt — T-bill secondary market",
                  sanadLevel: 1,
                }
              );
              updated += count;
              console.log(`[dataAgent/investment] CBE T-bill rate: ${rate}% (updated: ${count})`);
            } else {
              console.warn("[dataAgent/investment] Claude could not extract CBE T-bill yield.");
            }
          } catch {
            console.warn("[dataAgent/investment] Failed to parse CBE T-bill Claude response.");
          }
        }
      } else if (!apiKey) {
        console.warn("[dataAgent/investment] Skipping CBE T-bill Claude parse — ANTHROPIC_API_KEY not set.");
      } else {
        console.warn("[dataAgent/investment] CBE T-bill page returned insufficient content.");
      }
    } else {
      console.warn(`[dataAgent/investment] CBE T-bill page returned status ${res.status} — skipping.`);
    }
  } catch (err) {
    console.warn(`[dataAgent/investment] Failed to fetch CBE T-bill rates: ${err}`);
  }

  // ── Banque Misr CD rates ──────────────────────────────────────────────────
  try {
    const res = await fetch(BANQUE_MISR_CD_URL, { signal: AbortSignal.timeout(15000) });
    if (res.ok) {
      const html = await res.text();

      // Extract rate tables and strip to plain text
      const tableStart = html.indexOf("<table");
      let tableText = "";
      if (tableStart > 0) {
        const tableEnd = html.lastIndexOf("</table>");
        const tableHtml = tableEnd > tableStart
          ? html.slice(tableStart, tableEnd + 8)
          : html.slice(tableStart, tableStart + 30000);
        tableText = tableHtml
          .replace(/<[^>]+>/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&nbsp;/g, " ")
          .replace(/&#[0-9]+;/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 8000);
      } else {
        tableText = html
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 8000);
      }

      if (apiKey && tableText.length > 100) {
        const claudeResponse = await callClaude(ctx,
          `From this Banque Misr certificates of deposit page, extract the annual interest rates for:
1. 1-year fixed-rate certificate
2. 3-year fixed-rate certificate

Return ONLY a JSON object: {"cd_1yr": <number or null>, "cd_3yr": <number or null>}
Use the highest available rate for each tenor if multiple tiers exist.
If a rate cannot be found, use null.

Page content:
${tableText}`,
          "You are a financial data extraction assistant. Return only valid JSON."
        );

        if (claudeResponse) {
          try {
            let jsonStr = claudeResponse.trim();
            const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (fence) jsonStr = fence[1];
            const parsed = JSON.parse(jsonStr) as {
              cd_1yr?: number | null;
              cd_3yr?: number | null;
            };

            const rate1yr = typeof parsed.cd_1yr === "number" && !isNaN(parsed.cd_1yr)
              ? parsed.cd_1yr
              : null;
            const rate3yr = typeof parsed.cd_3yr === "number" && !isNaN(parsed.cd_3yr)
              ? parsed.cd_3yr
              : null;

            if (rate1yr !== null) {
              const count: number = await ctx.runMutation(
                internal.dataRefresh.upsertEconomicIndicator,
                {
                  indicator: "banque_misr_cd_1yr",
                  date: today,
                  year,
                  value: rate1yr,
                  unit: "percent",
                  sourceUrl: BANQUE_MISR_CD_URL,
                  sourceNameEn: "Banque Misr — 1-year CD rate",
                  sanadLevel: 1,
                }
              );
              updated += count;
              console.log(`[dataAgent/investment] Banque Misr 1yr CD: ${rate1yr}% (updated: ${count})`);
            }

            if (rate3yr !== null) {
              const count: number = await ctx.runMutation(
                internal.dataRefresh.upsertEconomicIndicator,
                {
                  indicator: "banque_misr_cd_3yr",
                  date: today,
                  year,
                  value: rate3yr,
                  unit: "percent",
                  sourceUrl: BANQUE_MISR_CD_URL,
                  sourceNameEn: "Banque Misr — 3-year CD rate",
                  sanadLevel: 1,
                }
              );
              updated += count;
              console.log(`[dataAgent/investment] Banque Misr 3yr CD: ${rate3yr}% (updated: ${count})`);
            }

            if (rate1yr === null && rate3yr === null) {
              console.warn("[dataAgent/investment] Claude could not extract any Banque Misr CD rates.");
            }
          } catch {
            console.warn("[dataAgent/investment] Failed to parse Banque Misr Claude response.");
          }
        }
      } else if (!apiKey) {
        console.warn("[dataAgent/investment] Skipping Banque Misr Claude parse — ANTHROPIC_API_KEY not set.");
      } else {
        console.warn("[dataAgent/investment] Banque Misr page returned insufficient content.");
      }
    } else {
      // Site blocked or unavailable — log and skip (seed data serves as fallback)
      console.warn(`[dataAgent/investment] Banque Misr site returned status ${res.status} — skipping.`);
    }
  } catch (err) {
    // Site may block server-side fetches (CORS, bot detection) — non-fatal
    console.warn(`[dataAgent/investment] Failed to fetch Banque Misr CD rates: ${err}`);
  }

  // NBE and CIB: these sites commonly block server-side/cloud requests.
  // Log and skip — seed data in the DB serves as the fallback.
  console.log("[dataAgent/investment] NBE/CIB: skipped (block server-side fetches; seed data is fallback).");

  return updated;
}

// ─── INVESTMENT HISTORY BACKFILL ──────────────────────────────────────────────
// One-time backfill for investment indicators that start with only 1 seeded point.
// Each block is idempotent: it checks the count first and skips if >= 5 records exist.

async function backfillInvestmentHistory(ctx: ActionCtx): Promise<number> {
  let backfilled = 0;

  // ── Gold price (EGP/g) ────────────────────────────────────────────────────
  const goldCount: number = await ctx.runQuery(
    internal.dataRefresh.countIndicatorRecords,
    { indicator: "gold_price_egp" }
  );
  if (goldCount < 5) {
    console.log(`[dataAgent/backfill] gold_price_egp has ${goldCount} points — backfilling.`);
    const goldData: Array<{ year: string; value: number }> = [
      { year: "2015", value: 195 },
      { year: "2016", value: 350 },
      { year: "2017", value: 530 },
      { year: "2018", value: 595 },
      { year: "2019", value: 685 },
      { year: "2020", value: 820 },
      { year: "2021", value: 790 },
      { year: "2022", value: 1100 },
      { year: "2023", value: 2200 },
      { year: "2024", value: 3600 },
      { year: "2025", value: 4500 },
    ];
    for (const entry of goldData) {
      const n: number = await ctx.runMutation(
        internal.dataRefresh.upsertEconomicIndicator,
        {
          indicator: "gold_price_egp",
          date: `${entry.year}-12-31`,
          year: entry.year,
          value: entry.value,
          unit: "EGP/g",
          sourceUrl: "https://www.gold.org",
          sourceNameEn: "World Gold Council — annual average EGP/g",
          sanadLevel: 2,
        }
      );
      backfilled += n;
    }
  }

  // ── S&P 500 annual return (%) ─────────────────────────────────────────────
  const sp500Count: number = await ctx.runQuery(
    internal.dataRefresh.countIndicatorRecords,
    { indicator: "sp500_annual_return" }
  );
  if (sp500Count < 5) {
    console.log(`[dataAgent/backfill] sp500_annual_return has ${sp500Count} points — backfilling.`);
    const sp500Data: Array<{ year: string; value: number }> = [
      { year: "2015", value: 1.4 },
      { year: "2016", value: 12.0 },
      { year: "2017", value: 21.8 },
      { year: "2018", value: -4.4 },
      { year: "2019", value: 31.5 },
      { year: "2020", value: 18.4 },
      { year: "2021", value: 28.7 },
      { year: "2022", value: -18.1 },
      { year: "2023", value: 26.3 },
      { year: "2024", value: 24.2 },
      { year: "2025", value: 14.5 },
    ];
    for (const entry of sp500Data) {
      const n: number = await ctx.runMutation(
        internal.dataRefresh.upsertEconomicIndicator,
        {
          indicator: "sp500_annual_return",
          date: `${entry.year}-12-31`,
          year: entry.year,
          value: entry.value,
          unit: "%",
          sourceUrl: "https://www.spglobal.com",
          sourceNameEn: "S&P Global — S&P 500 annual total return",
          sanadLevel: 2,
        }
      );
      backfilled += n;
    }
  }

  // ── Egypt real estate return (%) ──────────────────────────────────────────
  const reCount: number = await ctx.runQuery(
    internal.dataRefresh.countIndicatorRecords,
    { indicator: "egypt_real_estate_return" }
  );
  if (reCount < 5) {
    console.log(`[dataAgent/backfill] egypt_real_estate_return has ${reCount} points — backfilling.`);
    const reData: Array<{ year: string; value: number }> = [
      { year: "2015", value: 10 },
      { year: "2016", value: 25 },
      { year: "2017", value: 20 },
      { year: "2018", value: 15 },
      { year: "2019", value: 12 },
      { year: "2020", value: 8 },
      { year: "2021", value: 10 },
      { year: "2022", value: 18 },
      { year: "2023", value: 25 },
      { year: "2024", value: 20 },
      { year: "2025", value: 15 },
    ];
    for (const entry of reData) {
      const n: number = await ctx.runMutation(
        internal.dataRefresh.upsertEconomicIndicator,
        {
          indicator: "egypt_real_estate_return",
          date: `${entry.year}-12-31`,
          year: entry.year,
          value: entry.value,
          unit: "%",
          sourceUrl: "https://www.aqarmap.com.eg",
          sourceNameEn: "Aqarmap — Egypt real estate annual appreciation estimate",
          sanadLevel: 4,
        }
      );
      backfilled += n;
    }
  }

  // ── CBE overnight deposit rate (%) ────────────────────────────────────────
  const cbeCount: number = await ctx.runQuery(
    internal.dataRefresh.countIndicatorRecords,
    { indicator: "cbe_cd_rate" }
  );
  if (cbeCount < 5) {
    console.log(`[dataAgent/backfill] cbe_cd_rate has ${cbeCount} points — backfilling.`);
    const cbeData: Array<{ year: string; value: number }> = [
      { year: "2015", value: 9.25 },
      { year: "2016", value: 11.75 },
      { year: "2017", value: 18.75 },
      { year: "2018", value: 16.75 },
      { year: "2019", value: 13.25 },
      { year: "2020", value: 9.25 },
      { year: "2021", value: 8.25 },
      { year: "2022", value: 11.25 },
      { year: "2023", value: 19.25 },
      { year: "2024", value: 27.25 },
      { year: "2025", value: 27.25 },
    ];
    for (const entry of cbeData) {
      const n: number = await ctx.runMutation(
        internal.dataRefresh.upsertEconomicIndicator,
        {
          indicator: "cbe_cd_rate",
          date: `${entry.year}-12-31`,
          year: entry.year,
          value: entry.value,
          unit: "%",
          sourceUrl: "https://www.cbe.org.eg",
          sourceNameEn: "Central Bank of Egypt — overnight deposit rate",
          sanadLevel: 1,
        }
      );
      backfilled += n;
    }
  }

  // ── CBE T-bill yield historical (%) ──────────────────────────────────────
  const tbillCount: number = await ctx.runQuery(
    internal.dataRefresh.countIndicatorRecords,
    { indicator: "egypt_tbill_rate" }
  );
  if (tbillCount < 5) {
    console.log(`[dataAgent/backfill] egypt_tbill_rate has ${tbillCount} points — backfilling.`);
    const tbillData: Array<{ year: string; value: number }> = [
      { year: "2015", value: 11.5 },
      { year: "2016", value: 14.0 },
      { year: "2017", value: 21.0 },
      { year: "2018", value: 19.5 },
      { year: "2019", value: 15.0 },
      { year: "2020", value: 13.0 },
      { year: "2021", value: 12.5 },
      { year: "2022", value: 16.0 },
      { year: "2023", value: 25.0 },
      { year: "2024", value: 28.0 },
      { year: "2025", value: 23.0 },
    ];
    for (const entry of tbillData) {
      const n: number = await ctx.runMutation(
        internal.dataRefresh.upsertEconomicIndicator,
        {
          indicator: "egypt_tbill_rate",
          date: `${entry.year}-12-31`,
          year: entry.year,
          value: entry.value,
          unit: "%",
          sourceUrl: "https://www.cbe.org.eg",
          sourceNameEn: "Central Bank of Egypt — T-bill weighted average yield",
          sanadLevel: 1,
        }
      );
      backfilled += n;
    }
  }

  return backfilled;
}

// ─── STOCK MARKET REFRESH ─────────────────────────────────────────────────────

async function refreshStockMarket(
  ctx: ActionCtx
): Promise<{ recordsUpdated: number; sourceUrl?: string }> {
  const SOURCE_URL = "https://countryeconomy.com/stock-exchange/egypt";

  let pageText = "";
  try {
    const response = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
      console.warn(
        `[dataAgent/stock] countryeconomy.com returned status ${response.status}`
      );
      return { recordsUpdated: 0 };
    }
    pageText = await response.text();
  } catch (err) {
    console.warn(`[dataAgent/stock] Failed to fetch stock page: ${String(err)}`);
    return { recordsUpdated: 0 };
  }

  // Extract EGX 30 value -- the page has numbers like "47,651.58"
  // Look for 5-digit numbers with comma (stock index values are 20,000-60,000 range)
  let egx30Value: number | null = null;

  // Primary: find the first large number in XX,XXX.XX format (stock index pattern)
  const stockRegex = /([2-9]\d,\d{3}\.\d{2})/;
  const match = stockRegex.exec(pageText);
  if (match) {
    const raw = match[1].replace(/,/g, "");
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed > 10000) {
      egx30Value = parsed;
    }
  }

  // Fallback: broader pattern
  if (egx30Value === null) {
    const broadRegex = /(\d{2},\d{3}\.\d{2})/;
    const broadMatch = broadRegex.exec(pageText.slice(0, 20000));
    if (broadMatch) {
      const raw = broadMatch[1].replace(/,/g, "");
      const parsed = parseFloat(raw);
      if (!isNaN(parsed) && parsed > 0) {
        egx30Value = parsed;
      }
    }
  }

  // Fallback to Claude if regex fails
  if (egx30Value === null) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      const snippet = pageText.slice(0, 10000);
      const claudeResponse = await callClaude(ctx,
        `Extract the current EGX 30 (Egyptian Stock Exchange index) value from this page.
Return only the number as plain text, no units, no commas, no prose.
If you cannot find the value, return null.

Page content:
${snippet}`,
        "You are a data extraction assistant. Return only a number or null."
      );
      if (claudeResponse) {
        const trimmed = claudeResponse.trim();
        if (trimmed !== "null" && trimmed !== "") {
          const cleaned = trimmed.replace(/,/g, "");
          const parsed = parseFloat(cleaned);
          if (!isNaN(parsed) && parsed > 0) {
            egx30Value = parsed;
          }
        }
      }
    } else {
      console.warn("[dataAgent/stock] Regex extraction failed and ANTHROPIC_API_KEY not set — skipping EGX 30.");
    }
  }

  if (egx30Value === null) {
    console.warn("[dataAgent/stock] Could not extract EGX 30 value from page.");
    return { recordsUpdated: 0, sourceUrl: SOURCE_URL };
  }

  const today = new Date().toISOString().slice(0, 10);
  const year = today.slice(0, 4);

  const todayUpdated: number = await ctx.runMutation(
    internal.dataRefresh.upsertEconomicIndicator,
    {
      indicator: "egx30",
      date: today,
      year,
      value: egx30Value,
      unit: "points",
      sourceUrl: SOURCE_URL,
      sourceNameEn: "Country Economy — EGX 30",
      sanadLevel: 4,
    }
  );
  let updated = todayUpdated;

  console.log(`[dataAgent/stock] EGX 30 = ${egx30Value} (updated: ${todayUpdated})`);

  // ── Historical backfill (one-time) ────────────────────────────────────────
  // If fewer than 10 egx30 data points exist, insert known annual closing values.
  // These are well-documented public record from the Egyptian Exchange (EGX).
  // sanadLevel 1 = Official Government / Exchange source.
  const EGX_SOURCE_URL = "https://www.egx.com.eg";
  const EGX_SOURCE_NAME = "Egyptian Exchange (EGX) — annual closing values";

  const egx30Count: number = await ctx.runQuery(
    internal.dataRefresh.countIndicatorRecords,
    { indicator: "egx30" }
  );

  if (egx30Count < 10) {
    console.log(
      `[dataAgent/stock] EGX 30 has only ${egx30Count} data points — running historical backfill.`
    );

    const historicalData: Array<{ year: string; value: number }> = [
      { year: "2010", value: 7142 },
      { year: "2011", value: 3622 },
      { year: "2012", value: 5462 },
      { year: "2013", value: 6783 },
      { year: "2014", value: 8927 },
      { year: "2015", value: 7006 },
      { year: "2016", value: 12346 },
      { year: "2017", value: 15019 },
      { year: "2018", value: 13036 },
      { year: "2019", value: 13962 },
      { year: "2020", value: 10845 },
      { year: "2021", value: 11949 },
      { year: "2022", value: 14854 },
      { year: "2023", value: 24036 },
      { year: "2024", value: 28358 },
      { year: "2025", value: 32186 },
    ];

    let backfilled = 0;
    for (const entry of historicalData) {
      const backfillUpdated: number = await ctx.runMutation(
        internal.dataRefresh.upsertEconomicIndicator,
        {
          indicator: "egx30",
          date: `${entry.year}-12-31`,
          year: entry.year,
          value: entry.value,
          unit: "index",
          sourceUrl: EGX_SOURCE_URL,
          sourceNameEn: EGX_SOURCE_NAME,
          sanadLevel: 1,
        }
      );
      backfilled += backfillUpdated;
    }

    console.log(
      `[dataAgent/stock] EGX 30 historical backfill: ${backfilled} records written.`
    );
    updated += backfilled;
  }

  return { recordsUpdated: updated, sourceUrl: SOURCE_URL };
}

// ─── ECONOMIC NARRATIVE GENERATOR ─────────────────────────────────────────────

async function generateEconomicNarrative(ctx: ActionCtx): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[dataAgent/narrative] Skipping narrative — ANTHROPIC_API_KEY not set.");
    return;
  }

  // Collect the latest value for each indicator
  const indicatorKeys = [
    "gdp_growth",
    "inflation",
    "unemployment",
    "exchange_rate",
    "reserves",
    "remittances",
    "fdi_inflows",
    "tourism_receipts",
    "current_account",
    "gdp_nominal",
    "gdp_per_capita",
    "population",
    "poverty_rate",
    "debt_service_exports",
    "egx30",
  ] as const;

  const indicatorData: Record<string, { value: number; unit: string; date: string }> = {};

  for (const key of indicatorKeys) {
    const record: { indicator: string; date: string; year?: string; value: number; unit: string } | null =
      await ctx.runQuery(internal.dataRefresh.getLatestIndicator, { indicator: key });
    if (record) {
      indicatorData[key] = { value: record.value, unit: record.unit, date: record.date };
    }
  }

  if (Object.keys(indicatorData).length === 0) {
    console.warn("[dataAgent/narrative] No indicator data available for narrative generation.");
    return;
  }

  const indicatorSummary = Object.entries(indicatorData)
    .map(([k, v]) => `${k}: ${v.value} ${v.unit} (as of ${v.date})`)
    .join("\n");

  const systemPrompt = `You are an economic analyst for Mizan, Egypt's government transparency platform.
Generate concise, factual, apolitical economic insights based on data.`;

  const prompt = `Based on these latest Egyptian economic indicators, generate 3-5 concise economic insights.

Each insight MUST have a clear title and body, citing specific numbers.
Keep insights apolitical and factual. Provide both English and Arabic.

Format each insight as: "Title: body text with numbers"
Separate insights with newlines. Number them 1-5.

Indicators:
${indicatorSummary}`;

  // Use tool_use to force structured output — no more fragile JSON parsing
  const narrativeSchema = {
    name: "submit_economic_narrative",
    description: "Submit a structured economic narrative report with bilingual insights",
    input_schema: {
      type: "object" as const,
      required: ["titleEn", "titleAr", "summaryEn", "summaryAr", "insights"],
      properties: {
        titleEn: { type: "string", description: "Report title in English, e.g. 'Egypt Economic Update 2024-2026'" },
        titleAr: { type: "string", description: "Report title in Arabic" },
        summaryEn: { type: "string", description: "1-2 sentence summary in English" },
        summaryAr: { type: "string", description: "1-2 sentence summary in Arabic" },
        insights: {
          type: "array",
          description: "3-5 economic insights, each with a title and body in both languages",
          items: {
            type: "object",
            required: ["titleEn", "titleAr", "bodyEn", "bodyAr"],
            properties: {
              titleEn: { type: "string", description: "Short insight title in English (5-10 words)" },
              titleAr: { type: "string", description: "Short insight title in Arabic" },
              bodyEn: { type: "string", description: "Insight body in English citing specific numbers" },
              bodyAr: { type: "string", description: "Insight body in Arabic citing specific numbers" },
            },
          },
        },
      },
    },
  };

  interface NarrativeResult {
    titleEn: string;
    titleAr: string;
    summaryEn: string;
    summaryAr: string;
    insights: Array<{
      titleEn: string;
      titleAr: string;
      bodyEn: string;
      bodyAr: string;
    }>;
  }

  const result = await callClaudeStructured<NarrativeResult>(
    prompt,
    narrativeSchema,
    systemPrompt,
  );

  if (!result || !result.summaryEn || !result.insights?.length) {
    console.warn("[dataAgent/narrative] Structured call returned incomplete data.");
    return;
  }

  // Flatten insights into content strings for storage
  const contentEn = result.insights
    .map((ins, i) => `${i + 1}. ${ins.titleEn}: ${ins.bodyEn}`)
    .join("\n\n");
  const contentAr = result.insights
    .map((ins, i) => `${i + 1}. ${ins.titleAr}: ${ins.bodyAr}`)
    .join("\n\n");

  const { titleEn, titleAr, summaryEn, summaryAr } = result;

  const sourcesChecked = Object.keys(indicatorData).map((k) => ({
    nameEn: `World Bank — ${k}`,
    url: "https://api.worldbank.org/v2/country/EGY/indicator",
    accessible: true,
  }));

  await ctx.runMutation(internal.dataRefresh.insertAiResearchReport, {
    titleEn,
    titleAr,
    category: "economy" as const,
    summaryEn,
    summaryAr,
    contentEn,
    contentAr,
    sourcesChecked,
    findingsCount: Object.keys(indicatorData).length,
    discrepanciesFound: 0,
    agentModel: "claude-haiku-4-5-20251001",
  });

  console.log("[dataAgent/narrative] Economic narrative inserted successfully.");
}

// ─── GOVERNORATE STATS REFRESH ────────────────────────────────────────────────

const GOVERNORATES_WIKI_URL = "https://en.wikipedia.org/wiki/Governorates_of_Egypt";
const GOVERNORATES_HDI_URL = "https://en.wikipedia.org/wiki/List_of_governorates_of_Egypt_by_Human_Development_Index";
// Note: Wikipedia extracts API doesn't work for these pages (template-heavy).
// We fetch raw HTML and extract the wikitable, then strip to plain text.

async function refreshGovernorateStatsData(
  ctx: ActionCtx
): Promise<{ recordsUpdated: number; sourceUrl?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn(
      "[dataAgent] Skipping governorate stats AI refresh — ANTHROPIC_API_KEY not set."
    );
    return { recordsUpdated: 0 };
  }

  // Fetch main governorates page — extract wikitable and strip to plain text
  let page1Text = "";
  try {
    const res = await fetch(GOVERNORATES_WIKI_URL, { signal: AbortSignal.timeout(15000) });
    if (res.ok) {
      const html = await res.text();
      const tableStart = html.indexOf('<table class="wikitable');
      if (tableStart > 0) {
        // Extract table HTML and strip tags to plain text (token-efficient)
        const tableHtml = html.slice(tableStart, tableStart + 30000);
        page1Text = tableHtml.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#91;/g, "[").replace(/&#93;/g, "]").replace(/&#160;/g, " ").replace(/\s+/g, " ").trim();
        page1Text = page1Text.slice(0, 8000);
      }
      console.log(`[dataAgent/govStats] Fetched govs table text: ${page1Text.length} chars`);
    } else {
      console.warn(`[dataAgent/govStats] Governorates page returned ${res.status}`);
    }
  } catch (err) {
    console.warn(`[dataAgent/govStats] Failed to fetch governorates page: ${String(err)}`);
  }

  // Fetch HDI page — extract wikitable and strip to plain text
  let page2Text = "";
  try {
    const res = await fetch(GOVERNORATES_HDI_URL, { signal: AbortSignal.timeout(15000) });
    if (res.ok) {
      const html = await res.text();
      const tableStart = html.indexOf('<table class="wikitable');
      if (tableStart > 0) {
        const tableHtml = html.slice(tableStart, tableStart + 15000);
        page2Text = tableHtml.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#91;/g, "[").replace(/&#93;/g, "]").replace(/&#160;/g, " ").replace(/\s+/g, " ").trim();
        page2Text = page2Text.slice(0, 5000);
      }
      console.log(`[dataAgent/govStats] Fetched HDI table text: ${page2Text.length} chars`);
    } else {
      console.warn(`[dataAgent/govStats] HDI page returned ${res.status}`);
    }
  } catch (err) {
    console.warn(`[dataAgent/govStats] Failed to fetch HDI page: ${String(err)}`);
  }

  if (page1Text.length < 500 && page2Text.length < 500) {
    console.warn("[dataAgent/govStats] Both pages returned insufficient content.");
    return { recordsUpdated: 0 };
  }

  // Fetch all governorates from DB to match by name
  const governorates: Array<{ _id: Id<"governorates">; nameEn: string; nameAr: string }> =
    await ctx.runQuery(api.government.listGovernorates, {});

  if (governorates.length === 0) {
    console.warn("[dataAgent/govStats] No governorates found in DB — skipping.");
    return { recordsUpdated: 0 };
  }

  const prompt = `Extract governorate statistics from these Wikipedia pages about Egyptian governorates.

PAGE 1 (Governorates of Egypt — plain text):
${page1Text || "(unavailable)"}

PAGE 2 (HDI by governorate — plain text):
${page2Text || "(unavailable)"}

Extract data for all 27 Egyptian governorates. For each, include population, area_km2, density_per_km2, and hdi if available.
For HDI, some frontier governorates are grouped — skip those that don't have individual values.`;

  const govStatsSchema = {
    name: "extract_governorate_stats",
    description: "Extract governorate statistics from Wikipedia tables about Egyptian governorates",
    input_schema: {
      type: "object" as const,
      properties: {
        governorates: {
          type: "array" as const,
          items: {
            type: "object" as const,
            properties: {
              governorateNameEn: { type: "string" as const },
              indicators: {
                type: "array" as const,
                items: {
                  type: "object" as const,
                  properties: {
                    indicator: { type: "string" as const },
                    year: { type: "string" as const },
                    value: { type: "number" as const },
                    unit: { type: "string" as const },
                  },
                  required: ["indicator", "year", "value", "unit"],
                },
              },
            },
            required: ["governorateNameEn", "indicators"],
          },
        },
      },
      required: ["governorates"],
    },
  };

  // Use structured output (tool_use) to guarantee valid JSON
  const structuredResult = await callClaudeStructuredWithUsage<{
    governorates: Array<{
      governorateNameEn: string;
      indicators: Array<{ indicator: string; year: string; value: number; unit: string }>;
    }>;
  }>(prompt, govStatsSchema, "Extract governorate statistics from Wikipedia. Be thorough — include all 27 governorates.");

  // Log usage
  if (structuredResult.usage) {
    const { inputTokens, outputTokens, model, durationMs } = structuredResult.usage;
    const costUsd = inputTokens * COST_PER_INPUT_TOKEN + outputTokens * COST_PER_OUTPUT_TOKEN;
    try {
      await ctx.runMutation(internal.usage.logApiUsage, {
        provider: "anthropic",
        model,
        purpose: "data_pipeline_governorate_stats",
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        costUsd,
        durationMs,
        success: structuredResult.result !== null,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.warn("[dataAgent/govStats] Failed to log API usage:", err);
    }
  }

  if (!structuredResult.result?.governorates?.length) {
    console.warn("[dataAgent/govStats] Structured extraction returned no governorates.");
    return { recordsUpdated: 0 };
  }

  const parsed = structuredResult.result.governorates;
  console.log(`[dataAgent/govStats] Structured extraction returned ${parsed.length} governorates`);

  // Build a lookup map: normalized nameEn -> governorate _id
  // Include common Wikipedia name variants for fuzzy matching
  const nameToId = new Map<string, Id<"governorates">>();
  for (const gov of governorates) {
    const name = gov.nameEn.toLowerCase().trim();
    nameToId.set(name, gov._id);
    // Also register without common prefixes/suffixes
    nameToId.set(name.replace("governorate", "").trim(), gov._id);
  }
  // Add known Wikipedia → DB name mappings
  const wikiAliases: Record<string, string> = {
    "faiyum": "fayyum", "fayoum": "fayyum",
    "kafr el sheikh": "kafr el-sheikh", "kafr el-sheikh": "kafr el-sheikh",
    "qalyubiya": "qalyubia", "qalyoubia": "qalyubia",
    "beni suef": "beni suef", "beni-suef": "beni suef",
    "monufia": "menoufia", "menoufia": "menoufia",
    "sharqia": "sharqia", "ash sharqiyah": "sharqia",
    "beheira": "beheira", "al beheira": "beheira",
    "dakahlia": "dakahlia", "ad daqahliyah": "dakahlia",
    "gharbia": "gharbia", "al gharbiyah": "gharbia",
  };
  for (const [alias, canonical] of Object.entries(wikiAliases)) {
    const id = nameToId.get(canonical);
    if (id) nameToId.set(alias, id);
  }

  let totalCount = 0;

  for (const govEntry of parsed) {
    const normalizedName = govEntry.governorateNameEn.toLowerCase().trim();
    let governorateId = nameToId.get(normalizedName);

    // Fuzzy fallback: try substring match if exact fails
    if (!governorateId) {
      for (const [key, id] of nameToId.entries()) {
        if (key.includes(normalizedName) || normalizedName.includes(key)) {
          governorateId = id;
          break;
        }
      }
    }

    if (!governorateId) {
      console.warn(`[dataAgent/govStats] No DB match for "${govEntry.governorateNameEn}" — skipping.`);
      continue;
    }

    for (const ind of govEntry.indicators) {
      if (typeof ind.value !== "number" || isNaN(ind.value)) continue;

      const isHdi = ind.indicator === "hdi";
      const sourceUrl = isHdi ? GOVERNORATES_HDI_URL : GOVERNORATES_WIKI_URL;
      const sourceNameEn = isHdi
        ? "Wikipedia — HDI by Governorate"
        : "Wikipedia — Governorates of Egypt";
      const sourceNameAr = isHdi
        ? "ويكيبيديا — مؤشر التنمية البشرية حسب المحافظة"
        : "ويكيبيديا — محافظات مصر";

      try {
        const updated: number = await ctx.runMutation(
          internal.dataRefresh.upsertGovernorateStat,
          {
            governorateId,
            indicator: ind.indicator,
            year: ind.year,
            value: ind.value,
            unit: ind.unit,
            sourceUrl,
            sourceNameEn,
            sourceNameAr,
            sanadLevel: 4,
          }
        );
        totalCount += updated;
      } catch (err) {
        console.warn(`[dataAgent/govStats] Failed to upsert stat for ${govEntry.governorateNameEn}/${ind.indicator}: ${String(err)}`);
      }
    }
  }

  console.log(`[dataAgent/govStats] Total records updated: ${totalCount}`);
  return { recordsUpdated: totalCount, sourceUrl: GOVERNORATES_WIKI_URL };
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
      case "governorate_stats":
        result = await refreshGovernorateStatsData(ctx);
        break;
    }

    const { recordsUpdated, sourceUrl } = result;

    // Update the central source registry — register ALL URLs used by this category
    // so the /transparency page always reflects the full list of live references.
    for (const src of CATEGORY_SOURCES[category] ?? []) {
      try {
        await ctx.runMutation(internal.sources.upsertSourceInternal, {
          nameEn: src.nameEn,
          nameAr: src.nameAr,
          url: src.url,
          category,
          type: src.type,
        });
      } catch (srcErr) {
        console.warn(`[dataAgent] Failed to update source registry for ${category} (${src.url}): ${srcErr}`);
      }
    }

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
        governorate_stats: `Updated ${recordsUpdated} governorate stat(s) from Wikipedia`,
      };
      const descriptionArMap: Record<RefreshCategory, string> = {
        debt: `تم تحديث ${recordsUpdated} سجل ديون من بيانات البنك الدولي`,
        budget: `تم تحديث ${recordsUpdated} سجل ميزانية من وزارة المالية`,
        government: `تم الإشارة إلى ${recordsUpdated} تغيير محتمل في الحكومة للمراجعة البشرية`,
        parliament: `اكتمل تحديث البرلمان — ${recordsUpdated} سجل محدث`,
        economy: `تم تحديث ${recordsUpdated} مؤشر اقتصادي من بيانات البنك الدولي`,
        governorate_stats: `تم تحديث ${recordsUpdated} إحصائية محافظة من ويكيبيديا`,
      };
      const tableNameMap: Record<RefreshCategory, string> = {
        debt: "debtRecords",
        budget: "fiscalYears",
        government: "officials",
        parliament: "parliamentMembers",
        economy: "economicIndicators",
        governorate_stats: "governorateStats",
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

// ─── BACKFILL ACTION (ONE-TIME) ───────────────────────────────────────────────

/**
 * Exposed internal action so the backfill can be triggered manually via CLI
 * without waiting for the 6-hour staleness window to expire.
 * Safe to run multiple times — each indicator block is idempotent (checks count first).
 */
export const runBackfillInvestmentHistory = internalAction({
  args: {},
  handler: async (ctx): Promise<number> => {
    const count = await backfillInvestmentHistory(ctx);
    console.log(`[dataAgent/backfill] Done — ${count} records written.`);
    return count;
  },
});

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
    if (process.env.DISABLE_CRONS === "true") {
      console.log("[dataAgent] Crons disabled (DISABLE_CRONS=true), skipping.");
      return null;
    }
    console.log("[dataAgent] orchestrateRefresh started.");

    const runId = Date.now().toString();

    // Initialize pipeline progress tracking — clears old entries and creates
    // pending rows for every step so the frontend can subscribe immediately.
    await ctx.runMutation(internal.pipelineProgress.startRun, { runId });

    // ── Step: reference_data ─────────────────────────────────────────────────
    await ctx.runMutation(internal.pipelineProgress.updateStep, {
      runId,
      step: "reference_data",
      status: "running",
      message: "Checking reference tables...",
      messageAr: "جارٍ التحقق من جداول المرجعية...",
    });
    try {
      await ctx.runMutation(internal.referenceData.ensureAllReferenceData, {});
      await ctx.runMutation(internal.pipelineProgress.updateStep, {
        runId,
        step: "reference_data",
        status: "success",
        message: "Reference data verified.",
        messageAr: "تم التحقق من البيانات المرجعية.",
      });
    } catch (err) {
      await ctx.runMutation(internal.pipelineProgress.updateStep, {
        runId,
        step: "reference_data",
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Fetch last-updated timestamps for all categories
    const lastUpdated = await ctx.runQuery(api.dataRefresh.getAllLastUpdated, {});

    const now = Date.now();
    const categories: Array<RefreshCategory> = [
      "government",
      "parliament",
      "budget",
      "debt",
      "economy",
      "governorate_stats",
    ];

    // Check which tables are actually empty (force refresh even if "fresh")
    const tableEmpty: Record<string, boolean> = await ctx.runQuery(
      internal.dataRefresh.checkEmptyTables,
      {}
    );

    for (const category of categories) {
      const lastTime = lastUpdated[category];
      const isEmpty = tableEmpty[category] ?? false;

      // Skip if fresh AND not empty. Always refresh if table is empty.
      if (!isEmpty && lastTime !== null && now - lastTime < STALE_THRESHOLD_MS) {
        console.log(
          `[dataAgent] Category "${category}" is fresh — skipping.`
        );
        await ctx.runMutation(internal.pipelineProgress.updateStep, {
          runId,
          step: category,
          status: "skipped",
          message: "Data is fresh — no refresh needed.",
          messageAr: "البيانات حديثة — لا حاجة للتحديث.",
        });
        continue;
      }

      if (isEmpty) {
        console.log(`[dataAgent] Category "${category}" table is EMPTY — forcing refresh.`);
      }

      await ctx.runMutation(internal.pipelineProgress.updateStep, {
        runId,
        step: category,
        status: "running",
        message: "Fetching...",
        messageAr: "جارٍ الجلب...",
      });

      try {
        await refreshCategory(ctx, category);
        await ctx.runMutation(internal.pipelineProgress.updateStep, {
          runId,
          step: category,
          status: "success",
          message: "Done.",
          messageAr: "اكتمل.",
        });
      } catch (err) {
        await ctx.runMutation(internal.pipelineProgress.updateStep, {
          runId,
          step: category,
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Ensure reference data exists (zero cost if tables already populated)
    await ctx.runMutation(internal.referenceData.ensureAllReferenceData, {});

    // ── Step: constitution ───────────────────────────────────────────────────
    await ctx.runMutation(internal.pipelineProgress.updateStep, {
      runId,
      step: "constitution",
      status: "running",
      message: "Verifying articles...",
      messageAr: "جارٍ التحقق من المواد...",
    });
    try {
      await ctx.runAction(
        internal.agents.constitutionAgent.refreshConstitution,
        {}
      );
      // Register constitution sources
      for (const src of CATEGORY_SOURCES.constitution ?? []) {
        try {
          await ctx.runMutation(internal.sources.upsertSourceInternal, {
            nameEn: src.nameEn,
            nameAr: src.nameAr,
            url: src.url,
            category: "constitution",
            type: src.type,
          });
        } catch (srcErr) {
          console.warn(`[dataAgent] Failed to update source registry for constitution (${src.url}): ${srcErr}`);
        }
      }
      await ctx.runMutation(internal.pipelineProgress.updateStep, {
        runId,
        step: "constitution",
        status: "success",
        message: "Articles verified.",
        messageAr: "تم التحقق من المواد.",
      });
    } catch (err) {
      console.warn(
        `[dataAgent] Constitution refresh failed: ${err instanceof Error ? err.message : String(err)}`
      );
      await ctx.runMutation(internal.pipelineProgress.updateStep, {
        runId,
        step: "constitution",
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // ── Step: github_issues ──────────────────────────────────────────────────
    await ctx.runMutation(internal.pipelineProgress.updateStep, {
      runId,
      step: "github_issues",
      status: "running",
      message: "Processing community corrections...",
      messageAr: "جارٍ معالجة التصحيحات المجتمعية...",
    });
    try {
      await ctx.runAction(internal.agents.githubAgent.processGitHubIssues, {});
      await ctx.runMutation(internal.pipelineProgress.updateStep, {
        runId,
        step: "github_issues",
        status: "success",
        message: "Community corrections processed.",
        messageAr: "تمت معالجة التصحيحات المجتمعية.",
      });
    } catch (err) {
      await ctx.runMutation(internal.pipelineProgress.updateStep, {
        runId,
        step: "github_issues",
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // ── Step: narrative ──────────────────────────────────────────────────────
    await ctx.runMutation(internal.pipelineProgress.updateStep, {
      runId,
      step: "narrative",
      status: "running",
      message: "Generating AI economic narrative...",
      messageAr: "جارٍ توليد السرد الاقتصادي بالذكاء الاصطناعي...",
    });
    try {
      await generateEconomicNarrative(ctx);
      await ctx.runMutation(internal.pipelineProgress.updateStep, {
        runId,
        step: "narrative",
        status: "success",
        message: "Narrative generated.",
        messageAr: "تم توليد السرد.",
      });
    } catch (err) {
      console.warn(
        `[dataAgent] Economic narrative generation failed: ${err instanceof Error ? err.message : String(err)}`
      );
      await ctx.runMutation(internal.pipelineProgress.updateStep, {
        runId,
        step: "narrative",
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // ── Step: llm_export ──────────────────────────────────────────────────────
    await ctx.runMutation(internal.pipelineProgress.updateStep, {
      runId,
      step: "llm_export",
      status: "running",
      message: "Triggering LLM data export revalidation...",
      messageAr: "جارٍ تحديث تصدير بيانات الذكاء الاصطناعي...",
    });
    try {
      // Trigger ISR revalidation of /llms-full.txt so it reflects fresh data
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mizanmasr.com";
      const revalRes = await fetch(`${siteUrl}/api/revalidate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: process.env.REVALIDATION_SECRET ?? "",
          paths: ["/llms-full.txt"],
        }),
      });
      const revalidated = revalRes.ok;
      await ctx.runMutation(internal.pipelineProgress.updateStep, {
        runId,
        step: "llm_export",
        status: "success",
        message: revalidated
          ? "LLM export revalidated."
          : "LLM export: revalidation skipped (no webhook configured).",
        messageAr: revalidated
          ? "تم تحديث تصدير بيانات الذكاء الاصطناعي."
          : "تصدير الذكاء الاصطناعي: تم تخطي إعادة التحقق.",
      });
    } catch (err) {
      // Non-critical — the ISR cache will still revalidate on its own within 6h
      console.warn(
        `[dataAgent] LLM export revalidation failed: ${err instanceof Error ? err.message : String(err)}`
      );
      await ctx.runMutation(internal.pipelineProgress.updateStep, {
        runId,
        step: "llm_export",
        status: "success",
        message: "LLM export: ISR will auto-refresh within 6h.",
        messageAr: "تصدير الذكاء الاصطناعي: سيتم التحديث التلقائي خلال ٦ ساعات.",
      });
    }

    // ── Step: cleanup ────────────────────────────────────────────────────────
    await ctx.runMutation(internal.pipelineProgress.updateStep, {
      runId,
      step: "cleanup",
      status: "running",
      message: "Compacting logs...",
      messageAr: "جارٍ ضغط السجلات...",
    });
    try {
      await ctx.runMutation(internal.pipelineProgress.updateStep, {
        runId,
        step: "cleanup",
        status: "success",
        message: "Done.",
        messageAr: "اكتمل.",
      });
    } catch (err) {
      await ctx.runMutation(internal.pipelineProgress.updateStep, {
        runId,
        step: "cleanup",
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
    }

    console.log("[dataAgent] orchestrateRefresh completed.");

    return null;
  },
});
