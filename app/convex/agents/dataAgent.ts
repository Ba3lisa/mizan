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

  // Primary: Wikipedia Madbouly Cabinet page (comprehensive, regularly updated)
  // Fallback: Ahram Online (gov-affiliated news)
  const WIKI_URL = "https://en.wikipedia.org/wiki/Madbouly_Cabinet";
  const AHRAM_URL = "https://english.ahram.org.eg/News/562168.aspx";

  let pageText = "";
  let sourceUrl = WIKI_URL;

  // Try Wikipedia first (most complete source)
  try {
    const wikiRes = await fetch(WIKI_URL, { signal: AbortSignal.timeout(15000) });
    if (wikiRes.ok) {
      const html = await wikiRes.text();
      // Extract the main content area
      const bodyStart = html.indexOf('<div id="mw-content-text"');
      const bodyEnd = html.indexOf('<div id="catlinks"');
      const articleHtml = bodyStart > 0 && bodyEnd > bodyStart
        ? html.slice(bodyStart, bodyEnd)
        : html.slice(0, 50000);
      pageText = articleHtml.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
      console.log(`[dataAgent] Fetched Wikipedia cabinet page: ${pageText.length} chars`);
    }
  } catch (err) {
    console.warn(`[dataAgent] Wikipedia fetch failed: ${err}`);
  }

  // Fallback to Ahram Online if Wikipedia fails
  if (pageText.length < 500) {
    console.log("[dataAgent] Wikipedia insufficient, trying Ahram Online fallback...");
    sourceUrl = AHRAM_URL;
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
  }

  if (pageText.length < 500) {
    console.warn("[dataAgent] Insufficient page content for government extraction");
    return { recordsUpdated: 0 };
  }

  const CABINET_URL = sourceUrl;

  const systemPrompt = `You are a data extraction assistant for Mizan, Egypt's government transparency platform.
Extract structured Egyptian government data from official sources.
Always respond with valid JSON only — no markdown, no prose.`;

  const prompt = `Extract the COMPLETE list of current Egyptian cabinet ministers from this Wikipedia/news page.
Include: President, Prime Minister, Deputy PM(s), and ALL ministers.
Egypt's current cabinet (Second Madbouly Cabinet, 2024) has 30+ ministers including:
- Minister of Finance (Ahmed Kouchouk)
- Minister of Defence
- Minister of Interior
Make sure you extract ALL of them, not just a subset.

Return a JSON array. Each entry must have:
{
  "nameEn": "Full English name",
  "titleEn": "Full English title (e.g. Minister of Finance)",
  "nameAr": "Arabic name (if available, otherwise empty string)",
  "titleAr": "Arabic title (if available, otherwise empty string)",
  "role": "president" | "prime_minister" | "minister"
}

Be thorough — do NOT skip any ministers. Return an empty array [] if no data is found.

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
  const claudeResponse = await callClaude(prompt, systemPrompt);

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
    }
  );

  // Step 2: Extract governors separately (different source)
  if (governorText.length > 200) {
    console.log(`[dataAgent] Government: extracting governors from ${governorText.length} chars...`);
    const govResponse = await callClaude(
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
  {
    code: "PA.NUS.FCRF",
    indicator: "exchange_rate",
    unit: "egp_per_usd",
    sourceNameEn: "World Bank — Official exchange rate (LCU per USD, period average)",
  },
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

  // Also refresh EGX 30 stock market index
  const stockResult = await refreshStockMarket(ctx);
  totalUpdated += stockResult.recordsUpdated;

  return {
    recordsUpdated: totalUpdated,
    sourceUrl: "https://api.worldbank.org/v2/country/EGY/indicator",
  };
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

  // Try regex to extract EGX 30 value from a <td> tag
  // The page typically has patterns like: <td>EGX 30</td><td>30,000.00</td>
  // or a number like 30123.45 near "EGX 30"
  let egx30Value: number | null = null;

  const egxRegex = /EGX\s*30[^<]*<\/td>\s*<td[^>]*>([0-9,]+(?:\.[0-9]+)?)/i;
  const match = egxRegex.exec(pageText);
  if (match) {
    const raw = match[1].replace(/,/g, "");
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed > 0) {
      egx30Value = parsed;
    }
  }

  // Fallback: try a broader pattern for any number near EGX 30
  if (egx30Value === null) {
    const broadRegex = /EGX[\s\-_]*30[^0-9]*([0-9]{4,6}(?:[.,][0-9]+)?)/i;
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
      const claudeResponse = await callClaude(
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

  const updated: number = await ctx.runMutation(
    internal.dataRefresh.upsertEconomicIndicator,
    {
      indicator: "egx30",
      date: today,
      year,
      value: egx30Value,
      unit: "points",
      sourceUrl: SOURCE_URL,
      sourceNameEn: "Country Economy — EGX 30",
    }
  );

  console.log(`[dataAgent/stock] EGX 30 = ${egx30Value} (updated: ${updated})`);
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
Generate concise, factual, apolitical economic insights based on data.
Always respond with valid JSON only — no markdown, no prose.`;

  const prompt = `Based on these latest Egyptian economic indicators, generate 3-5 concise economic insights.
Each insight must:
- Tell a data-driven story
- Be apolitical and factual
- Cite the specific numbers from the data
- Be bilingual (English and Arabic)

Indicators:
${indicatorSummary}

Return a JSON object with this structure:
{
  "titleEn": "Egypt Economic Update <year>",
  "titleAr": "تحديث الاقتصاد المصري <year>",
  "summaryEn": "Brief 1-2 sentence summary in English",
  "summaryAr": "ملخص موجز بالعربية",
  "contentEn": "Full narrative with 3-5 insights in English, each citing specific numbers",
  "contentAr": "السرد الكامل بالعربية مع 3-5 رؤى مع ذكر الأرقام المحددة"
}`;

  const claudeResponse = await callClaude(prompt, systemPrompt);
  if (!claudeResponse) {
    console.warn("[dataAgent/narrative] Claude returned no narrative.");
    return;
  }

  let parsed: Record<string, unknown>;
  try {
    let jsonStr = claudeResponse;
    const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) jsonStr = fence[1];
    parsed = JSON.parse(jsonStr.trim()) as Record<string, unknown>;
  } catch {
    console.warn("[dataAgent/narrative] Could not parse Claude narrative response as JSON.");
    return;
  }

  const titleEn = typeof parsed.titleEn === "string" ? parsed.titleEn : "Egypt Economic Update";
  const titleAr = typeof parsed.titleAr === "string" ? parsed.titleAr : "تحديث الاقتصاد المصري";
  const summaryEn = typeof parsed.summaryEn === "string" ? parsed.summaryEn : "";
  const summaryAr = typeof parsed.summaryAr === "string" ? parsed.summaryAr : "";
  const contentEn = typeof parsed.contentEn === "string" ? parsed.contentEn : "";
  const contentAr = typeof parsed.contentAr === "string" ? parsed.contentAr : "";

  if (!summaryEn || !contentEn) {
    console.warn("[dataAgent/narrative] Incomplete narrative from Claude — skipping insert.");
    return;
  }

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

    // Update the central source registry so pages always read live references.
    const sourceRegistryMap: Record<RefreshCategory, { nameEn: string; nameAr: string; type: "official_government" | "international_org" | "academic" | "media" | "other" }> = {
      government: { nameEn: "Wikipedia — Madbouly Cabinet", nameAr: "ويكيبيديا — حكومة مدبولي", type: "media" },
      parliament: { nameEn: "Wikipedia — 2025 Egyptian Parliamentary Election", nameAr: "ويكيبيديا — انتخابات البرلمان المصري 2025", type: "media" },
      budget: { nameEn: "Ministry of Finance", nameAr: "وزارة المالية", type: "official_government" },
      debt: { nameEn: "World Bank — Egypt External Debt", nameAr: "البنك الدولي — الدين الخارجي لمصر", type: "international_org" },
      economy: { nameEn: "World Bank — Egypt Economic Indicators", nameAr: "البنك الدولي — المؤشرات الاقتصادية لمصر", type: "international_org" },
    };
    const categorySourceUrlMap: Record<RefreshCategory, string> = {
      government: "https://en.wikipedia.org/wiki/Madbouly_Cabinet",
      parliament: "https://en.wikipedia.org/wiki/2025_Egyptian_parliamentary_election",
      budget: "https://www.mof.gov.eg",
      debt: "https://data.worldbank.org",
      economy: "https://data.worldbank.org",
    };
    const registryMeta = sourceRegistryMap[category];
    const registryUrl = sourceUrl ?? categorySourceUrlMap[category];
    if (registryUrl) {
      try {
        await ctx.runMutation(internal.sources.upsertSourceInternal, {
          nameEn: registryMeta.nameEn,
          nameAr: registryMeta.nameAr,
          url: registryUrl,
          category,
          type: registryMeta.type,
        });
      } catch (srcErr) {
        console.warn(`[dataAgent] Failed to update source registry for ${category}: ${srcErr}`);
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
        continue;
      }

      if (isEmpty) {
        console.log(`[dataAgent] Category "${category}" table is EMPTY — forcing refresh.`);
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

    // After all category refreshes, generate AI economic narrative
    try {
      await generateEconomicNarrative(ctx);
    } catch (err) {
      console.warn(
        `[dataAgent] Economic narrative generation failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    console.log("[dataAgent] orchestrateRefresh completed.");

    // After all category refreshes, process community corrections from GitHub
    await ctx.runAction(internal.agents.githubAgent.processGitHubIssues, {});

    return null;
  },
});
