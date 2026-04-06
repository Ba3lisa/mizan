"use node";
// Parliament data agent.
// Fetches parliament composition from Wikipedia (structured, accessible)
// and uses Claude to extract member/party data.
// parliament.gov.eg is JS-rendered and blocks automated access,
// so we use Wikipedia as the primary source and IPU Parline as backup.

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { callClaude } from "./providers/anthropic";

const WIKI_HOUSE_URL =
  "https://en.wikipedia.org/wiki/2025_Egyptian_parliamentary_election";
const _WIKI_SENATE_URL =
  "https://en.wikipedia.org/wiki/Egyptian_Senate";

export const refreshParliament = internalAction({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    console.log("[parliamentAgent] Starting parliament refresh...");

    // Check current member count
    const currentCount: number = await ctx.runQuery(
      internal.parliamentQueries.getMemberCount,
      {}
    );

    // Only refresh if we have fewer than expected (596 house + 300 senate)
    if (currentCount >= 500 && !args.force) {
      console.log(
        `[parliamentAgent] Parliament has ${currentCount} members, skipping refresh`
      );
      return { status: "skipped", members: currentCount };
    }

    console.log(
      `[parliamentAgent] Parliament has ${currentCount} members (expected ~896), refreshing...`
    );

    // Step 1: Fetch Wikipedia article as clean text via MediaWiki API
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
        wikiText = wikiText.slice(0, 15000); // Keep manageable for Claude
      }
    } catch (err) {
      console.warn(`[parliamentAgent] Failed to fetch Wikipedia API: ${err}`);
    }

    if (!wikiText) {
      console.warn("[parliamentAgent] No Wikipedia content, cannot refresh");
      return { status: "failed", error: "Wikipedia fetch failed" };
    }

    // Step 2: Use Claude to extract party composition
    const systemPrompt = `You are a data extraction assistant for the Egyptian Parliament.
Extract structured party composition data from Wikipedia.
Respond with valid JSON only.`;

    const prompt = `Extract the 2025 Egyptian House of Representatives election results from this Wikipedia page.
Return a JSON object with:
{
  "houseParties": [
    {"nameEn": "Party Name", "nameAr": "Arabic Name", "seats": 123, "color": "#hexcolor"}
  ],
  "totalHouseSeats": 596,
  "senateParties": [],
  "totalSenateSeats": 300
}

Include ALL parties including independents. Use appropriate colors for each party.
For Arabic names, use the official Arabic party names.

Wikipedia content:
${wikiText}`;

    const claudeResponse = await callClaude(prompt, systemPrompt);
    if (!claudeResponse) {
      return { status: "failed", error: "Claude parsing failed" };
    }

    let parsed: {
      houseParties?: Array<{ nameEn: string; nameAr: string; seats: number; color: string }>;
      totalHouseSeats?: number;
    };

    try {
      // Strip markdown code fences if Claude wrapped the response
      let jsonStr = claudeResponse;
      const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) jsonStr = fenceMatch[1];
      jsonStr = jsonStr.trim();
      parsed = JSON.parse(jsonStr) as typeof parsed;
    } catch {
      console.error("[parliamentAgent] Failed to parse Claude response:", claudeResponse.slice(0, 500));
      return { status: "failed", error: "JSON parse failed" };
    }

    if (!parsed.houseParties || parsed.houseParties.length === 0) {
      return { status: "failed", error: "No parties extracted" };
    }

    // Step 3: Upsert parties and create member records
    const logId = await ctx.runMutation(
      internal.dataRefresh.logRefreshStart,
      { category: "parliament" }
    );

    let totalInserted = 0;
    try {
      totalInserted = await ctx.runMutation(
        internal.parliamentQueries.upsertParliamentComposition,
        {
          parties: parsed.houseParties.map((p) => ({
            nameEn: p.nameEn,
            nameAr: p.nameAr || p.nameEn,
            seats: p.seats,
            color: p.color || "#7F8C8D",
            chamber: "house" as const,
          })),
          sourceUrl: WIKI_HOUSE_URL,
        }
      );

      await ctx.runMutation(internal.dataRefresh.logRefreshComplete, {
        logId,
        recordsUpdated: totalInserted,
        sourceUrl: WIKI_HOUSE_URL,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.dataRefresh.logRefreshFailed, {
        logId,
        errorMessage: message,
      });
      return { status: "failed", error: message };
    }

    console.log(
      `[parliamentAgent] Parliament refresh complete: ${totalInserted} party/member records updated`
    );

    return { status: "success", partiesUpdated: totalInserted };
  },
});
