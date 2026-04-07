"use node";
// Parliament member scraper.
// Uses REGEX to extract names from parliament.gov.eg (fast, no AI per page).
// Then ONE Claude call per batch to verify/clean the extracted data.

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { callLLM as callClaude } from "./providers/registry";

const PARLIAMENT_BASE = "https://www.parliament.gov.eg/MembersDetails.aspx";

interface RawMember {
  id: number;
  nameAr: string;
  party: string;
  governorate: string;
}

async function fetchAndExtractRegex(id: number): Promise<RawMember | null> {
  try {
    const response = await fetch(`${PARLIAMENT_BASE}?id=${id}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const html = await response.text();
    if (html.length < 1000 || html.includes("Object moved")) return null;

    // Regex extraction -- these IDs are consistent across parliament.gov.eg
    const nameMatch = html.match(/ContentPlaceHolder1_Label2[^>]*>([^<]+)</);
    const partyMatch = html.match(/ContentPlaceHolder1_Label8[^>]*>([^<]+)/);
    const govMatch = html.match(/ContentPlaceHolder1_Label10[^>]*>([^<]+)/);

    const nameAr = nameMatch?.[1]?.trim() ?? "";
    if (!nameAr) return null;

    return {
      id,
      nameAr,
      party: partyMatch?.[1]?.trim() ?? "",
      governorate: govMatch?.[1]?.trim() ?? "",
    };
  } catch {
    return null;
  }
}

/**
 * Scrape a batch using regex (fast), then one Claude call to verify.
 */
export const scrapeMemberBatch = internalAction({
  args: { startId: v.number(), batchSize: v.number() },
  handler: async (ctx, args) => {
    const endId = args.startId + args.batchSize;

    // Phase 1: Fast regex extraction (no Claude, no delay needed)
    const rawMembers: RawMember[] = [];
    for (let id = args.startId; id < endId; id++) {
      const member = await fetchAndExtractRegex(id);
      if (member) rawMembers.push(member);
    }

    if (rawMembers.length === 0) {
      return { scraped: 0, saved: 0 };
    }

    // Phase 2: One Claude call to transliterate Arabic names to English
    const nameList = rawMembers.map((m) => `${m.id}: ${m.nameAr}`).join("\n");
    const claudeResponse = await callClaude(
      `Transliterate these Arabic names to English. Return JSON array:
[{"id": N, "nameEn": "English Name"}]
Names:
${nameList}`,
      "Transliterate Arabic names to English. JSON only, no markdown."
    );

    const englishNames: Record<number, string> = {};
    if (claudeResponse) {
      try {
        let jsonStr = claudeResponse;
        const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fence) jsonStr = fence[1];
        const parsed = JSON.parse(jsonStr.trim()) as Array<{ id: number; nameEn: string }>;
        for (const entry of parsed) {
          if (entry.id && entry.nameEn) englishNames[entry.id] = entry.nameEn;
        }
      } catch {
        // If Claude fails, use Arabic names as English (better than nothing)
      }
    }

    // Phase 3: Update placeholders in DB
    let updated = 0;
    for (const member of rawMembers) {
      const nameEn = englishNames[member.id] || member.nameAr;
      const didUpdate: boolean = await ctx.runMutation(
        internal.parliamentQueries.updatePlaceholderWithRealName,
        {
          nameAr: member.nameAr,
          nameEn,
          partyHint: member.party,
          governorateHint: member.governorate,
          sourceUrl: `${PARLIAMENT_BASE}?id=${member.id}`,
        }
      );
      if (didUpdate) updated++;
    }

    console.log(
      `[scraper] Batch ${args.startId}-${endId - 1}: fetched=${rawMembers.length} updated=${updated}`
    );
    return { scraped: rawMembers.length, saved: updated };
  },
});

export const scrapeAndContinue = internalAction({
  args: {
    startId: v.number(),
    maxId: v.number(),
    batchSize: v.number(),
    totalSaved: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.startId > args.maxId) {
      console.log(`[scraper] Complete: ${args.totalSaved} members updated`);
      const logId = await ctx.runMutation(
        internal.dataRefresh.logRefreshStart,
        { category: "parliament" }
      );
      await ctx.runMutation(internal.dataRefresh.logRefreshComplete, {
        logId,
        recordsUpdated: args.totalSaved,
        sourceUrl: "https://www.parliament.gov.eg/members.aspx",
      });
      return;
    }

    let batchSaved = 0;
    try {
      const result: { scraped: number; saved: number } = await ctx.runAction(
        internal.agents.parliamentScraper.scrapeMemberBatch,
        {
          startId: args.startId,
          batchSize: Math.min(args.batchSize, args.maxId - args.startId + 1),
        }
      );
      batchSaved = result.saved;
    } catch (err) {
      console.warn(`[scraper] Batch ${args.startId} failed: ${err}`);
    }

    await ctx.scheduler.runAfter(
      0,
      internal.agents.parliamentScraper.scrapeAndContinue,
      {
        startId: args.startId + args.batchSize,
        maxId: args.maxId,
        batchSize: args.batchSize,
        totalSaved: args.totalSaved + batchSaved,
      }
    );
  },
});

export const scrapeAllMembers = internalAction({
  args: { maxId: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const maxId = args.maxId ?? 600;
    console.log(`[scraper] Starting regex+Claude scrape (ids 1-${maxId})...`);
    // Bigger batches since regex is fast -- 30 per batch, 1 Claude call per batch
    await ctx.scheduler.runAfter(
      0,
      internal.agents.parliamentScraper.scrapeAndContinue,
      { startId: 1, maxId, batchSize: 30, totalSaved: 0 }
    );
    return { status: "started", maxId };
  },
});
