"use node";
// Parliament data agent.
// Two responsibilities:
// 1. Ensure party composition exists (from Wikipedia, only if parties table is empty)
// 2. Scrape real member names from parliament.gov.eg (replaces placeholders)
//
// The composition (party seats) changes only with elections (~every 5 years).
// Member names are scraped via the separate parliamentScraper.ts using scheduler.

import { internalAction, ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { z } from "zod";
import { callLLMStructuredWithUsage } from "./providers/registry";
import { ParliamentCompositionSchema, zodToToolSchema } from "./schemas";
import { verifyLLMOutput } from "./verify";

const WIKI_URL =
  "https://en.wikipedia.org/wiki/2025_Egyptian_parliamentary_election";

export const refreshParliament = internalAction({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    console.log("[parliamentAgent] Starting parliament check...");

    // Step 1: Check if party composition exists
    const partyCount: number = await ctx.runQuery(
      internal.parliamentQueries.getPartyCount,
      {}
    );
    const memberCount: number = await ctx.runQuery(
      internal.parliamentQueries.getMemberCount,
      {}
    );

    // If we already have parties and 500+ members, skip entirely
    if (partyCount > 0 && memberCount >= 500 && !args.force) {
      console.log(
        `[parliamentAgent] Parliament OK: ${partyCount} parties, ${memberCount} members`
      );
      return { status: "skipped", members: memberCount };
    }

    // Step 2: If no parties, load composition from Wikipedia
    if (partyCount === 0) {
      console.log("[parliamentAgent] No parties found, loading 2025 election composition...");
      await loadCompositionFromWikipedia(ctx);
    }

    // Step 3: If placeholders exist, schedule the name scraper
    // The scraper UPDATES existing placeholders in-place (no new records)
    const placeholderCount: number = await ctx.runQuery(
      internal.parliamentQueries.getPlaceholderCount,
      {}
    );
    if (placeholderCount > 0) {
      console.log(
        `[parliamentAgent] ${placeholderCount} placeholder members, scheduling name scraper...`
      );
      await ctx.scheduler.runAfter(
        0,
        internal.agents.parliamentScraper.scrapeAndContinue,
        { startId: 1, maxId: 600, batchSize: 10, totalSaved: 0 }
      );
    }

    const finalCount: number = await ctx.runQuery(
      internal.parliamentQueries.getMemberCount,
      {}
    );
    return { status: "success", partiesUpdated: finalCount };
  },
});

async function loadCompositionFromWikipedia(ctx: ActionCtx) {
  // Fetch Wikipedia article as clean text
  let wikiText = "";
  try {
    const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=2025_Egyptian_parliamentary_election&prop=extracts&explaintext=true&format=json`;
    const response = await fetch(apiUrl);
    if (response.ok) {
      const data = await response.json() as { query?: { pages?: Record<string, { extract?: string }> } };
      const pages = data?.query?.pages;
      if (pages) {
        const page = Object.values(pages)[0];
        wikiText = page?.extract ?? "";
      }
      wikiText = wikiText.slice(0, 15000);
    }
  } catch (err) {
    console.warn(`[parliamentAgent] Failed to fetch Wikipedia: ${err}`);
    return;
  }

  if (!wikiText) return;

  const toolSchema = zodToToolSchema(
    "extract_parliament_composition",
    "Extract Egyptian parliament party composition from election data",
    ParliamentCompositionSchema,
  );

  const { result } = await callLLMStructuredWithUsage<z.infer<typeof ParliamentCompositionSchema>>(
    `Extract the 2025 Egyptian House of Representatives election results.
Include ALL parties and independents. Total should be 596 seats.

Text: ${wikiText}`,
    toolSchema,
    "Extract Egyptian parliament election data into structured format.",
  );

  if (!result) {
    console.warn("[parliamentAgent] No structured result from LLM.");
    return;
  }

  const verified = verifyLLMOutput(ParliamentCompositionSchema, result, "parliament");
  if (!verified.ok) {
    console.error("[parliamentAgent] REJECTED by verifier:", verified.errors.join("; "));
    return;
  }

  const { parties } = verified.data;
  await ctx.runMutation(
    internal.parliamentQueries.upsertParliamentComposition,
    {
      parties: parties.map((p) => ({
        nameEn: p.nameEn,
        nameAr: p.nameAr || p.nameEn,
        seats: p.seats,
        color: p.color ?? "#7F8C8D",
        chamber: "house" as const,
      })),
      sourceUrl: WIKI_URL,
    }
  );
  console.log(`[parliamentAgent] Loaded ${parties.length} parties from Wikipedia`);
}
