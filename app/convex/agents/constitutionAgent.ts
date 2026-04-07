"use node";
// Constitution data pipeline tool.
// Fetches the official Egyptian Constitution PDF from FAO/FAOLEX,
// extracts text with pdf-parse, then uses Claude to structure
// individual articles. Only runs when constitution table is empty
// or manually triggered.

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { callLLM as callClaude } from "./providers/registry";

const CONSTITUTION_PDF_URL =
  "https://faolex.fao.org/docs/pdf/egy127542e.pdf";
const _CONSTITUTE_PROJECT_URL =
  "https://www.constituteproject.org/constitution/Egypt_2019";

// ─── PDF TEXT EXTRACTION ────────────────────────────────────────────────────

async function extractPdfText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  // pdf-parse is marked as external in convex.json
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
  const data = await pdfParse(Buffer.from(buffer));
  return data.text;
}

// ─── ARTICLE EXTRACTION VIA CLAUDE ──────────────────────────────────────────

interface ExtractedArticle {
  articleNumber: number;
  textEn: string;
  partNumber: number;
  wasAmended2019: boolean;
  keywords: string[];
}

/**
 * Uses Claude to structure raw PDF text into individual articles.
 * Processes in batches to stay within token limits.
 */
async function extractArticlesFromText(
  rawText: string,
  startArticle: number,
  endArticle: number
): Promise<Array<ExtractedArticle>> {
  const systemPrompt = `You are a legal document parser for the Egyptian Constitution of 2014 (with 2019 amendments).
Extract individual articles from the raw PDF text. Respond with valid JSON only — no markdown, no prose.

The Egyptian Constitution has 247 articles organized into 6 parts:
- Part 1: State (Articles 1-6)
- Part 2: Basic Components of Society (Articles 7-50)
- Part 3: Public Rights, Freedoms and Duties (Articles 51-93)
- Part 4: Rule of Law (Articles 94-100)
- Part 5: System of Government (Articles 101-221)
- Part 6: General and Transitional Provisions (Articles 222-247)

For each article, extract:
- articleNumber (integer)
- textEn (the FULL English text of the article, every word)
- partNumber (1-6 based on the ranges above)
- wasAmended2019 (true if the article mentions "amended" or was modified in 2019)
- keywords (3-5 relevant keywords in English)`;

  const prompt = `Extract articles ${startArticle} through ${endArticle} from this Egyptian Constitution text.
Return a JSON array of objects. Include the COMPLETE text of each article — do not summarize or truncate.

PDF Text (relevant section):
${rawText.slice(0, 30000)}

Return: [{"articleNumber": N, "textEn": "full text...", "partNumber": N, "wasAmended2019": bool, "keywords": ["..."]}]`;

  const response = await callClaude(prompt, systemPrompt);
  if (!response) return [];

  try {
    const parsed = JSON.parse(response) as Array<Record<string, unknown>>;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (a) =>
          typeof a.articleNumber === "number" &&
          typeof a.textEn === "string" &&
          a.textEn.length > 10
      )
      .map((a) => ({
        articleNumber: a.articleNumber as number,
        textEn: a.textEn as string,
        partNumber:
          typeof a.partNumber === "number" ? a.partNumber : getPartNumber(a.articleNumber as number),
        wasAmended2019:
          typeof a.wasAmended2019 === "boolean" ? a.wasAmended2019 : false,
        keywords: Array.isArray(a.keywords)
          ? (a.keywords as Array<string>).slice(0, 5)
          : [],
      }));
  } catch {
    console.error("[constitutionAgent] Failed to parse Claude response");
    return [];
  }
}

function getPartNumber(articleNumber: number): number {
  if (articleNumber <= 6) return 1;
  if (articleNumber <= 50) return 2;
  if (articleNumber <= 93) return 3;
  if (articleNumber <= 100) return 4;
  if (articleNumber <= 221) return 5;
  return 6;
}

// ─── MAIN REFRESH ACTION ────────────────────────────────────────────────────

export const refreshConstitution = internalAction({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    console.log("[constitutionAgent] Starting constitution refresh...");

    // Check if constitution data already exists and is complete
    const existingCount: number = await ctx.runQuery(
      internal.constitutionQueries.getArticleCount,
      {}
    );

    if (existingCount >= 247 && !args.force) {
      console.log(
        `[constitutionAgent] Constitution already has ${existingCount} articles, skipping`
      );
      return { status: "skipped", articlesLoaded: existingCount };
    }

    console.log(
      `[constitutionAgent] Constitution has ${existingCount}/247 articles, refreshing from PDF...`
    );

    // Step 1: Fetch and extract PDF text
    let pdfText: string;
    try {
      pdfText = await extractPdfText(CONSTITUTION_PDF_URL);
      console.log(
        `[constitutionAgent] Extracted ${pdfText.length} chars from PDF`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[constitutionAgent] PDF extraction failed: ${message}`
      );
      return { status: "failed", error: message };
    }

    // Step 2: Ensure constitution parts exist
    await ctx.runMutation(
      internal.constitutionQueries.ensureConstitutionParts,
      {}
    );

    // Step 3: Extract articles in batches using Claude
    // Process in chunks to stay within token limits
    const batches = [
      { start: 1, end: 50 },
      { start: 51, end: 100 },
      { start: 101, end: 150 },
      { start: 151, end: 200 },
      { start: 201, end: 247 },
    ];

    let totalInserted = 0;

    for (const batch of batches) {
      console.log(
        `[constitutionAgent] Extracting articles ${batch.start}-${batch.end}...`
      );

      // Find the relevant section of the PDF text
      const startMarker = `Article ${batch.start}`;
      const endMarker =
        batch.end < 247
          ? `Article ${batch.end + 1}`
          : ""; // Last batch goes to end

      let sectionStart = pdfText.indexOf(startMarker);
      if (sectionStart === -1) sectionStart = 0;

      let sectionEnd = endMarker
        ? pdfText.indexOf(endMarker, sectionStart + startMarker.length)
        : pdfText.length;
      if (sectionEnd === -1) sectionEnd = pdfText.length;

      // Add some overlap for context
      const section = pdfText.slice(
        Math.max(0, sectionStart - 200),
        Math.min(pdfText.length, sectionEnd + 500)
      );

      const articles = await extractArticlesFromText(
        section,
        batch.start,
        batch.end
      );

      if (articles.length > 0) {
        const inserted: number = await ctx.runMutation(
          internal.constitutionQueries.upsertArticles,
          {
            articles: articles.map((a) => ({
              articleNumber: a.articleNumber,
              textEn: a.textEn,
              textAr: "", // Arabic text to be added separately
              partNumber: a.partNumber,
              wasAmended2019: a.wasAmended2019,
              keywords: a.keywords,
            })),
            sourceUrl: CONSTITUTION_PDF_URL,
          }
        );
        totalInserted += inserted;
        console.log(
          `[constitutionAgent] Inserted/updated ${inserted} articles from batch ${batch.start}-${batch.end}`
        );
      } else {
        console.warn(
          `[constitutionAgent] No articles extracted for batch ${batch.start}-${batch.end}`
        );
      }
    }

    // Step 4: Log the refresh
    const logId = await ctx.runMutation(
      internal.dataRefresh.logRefreshStart,
      { category: "constitution" }
    );
    await ctx.runMutation(internal.dataRefresh.logRefreshComplete, {
      logId,
      recordsUpdated: totalInserted,
      sourceUrl: CONSTITUTION_PDF_URL,
    });

    console.log(
      `[constitutionAgent] Constitution refresh complete: ${totalInserted} articles loaded`
    );

    return { status: "success", articlesLoaded: totalInserted };
  },
});
