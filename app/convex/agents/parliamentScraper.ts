"use node";
// Parliament member scraper.
// Fetches individual member pages from parliament.gov.eg and UPDATES
// existing placeholder records with real names. Does NOT create new records.

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { callClaude } from "./providers/anthropic";

const PARLIAMENT_BASE = "https://www.parliament.gov.eg/MembersDetails.aspx";

async function fetchMemberPage(id: number): Promise<string | null> {
  try {
    const response = await fetch(`${PARLIAMENT_BASE}?id=${id}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    const html = await response.text();
    if (html.length < 1000 || html.includes("Object moved")) return null;
    const contentStart = html.indexOf("ContentPlaceHolder1");
    if (contentStart === -1) return null;
    return html.slice(Math.max(0, contentStart - 500), contentStart + 5000);
  } catch {
    return null;
  }
}

async function parseMemberHtml(html: string): Promise<{
  nameAr: string;
  nameEn: string;
  party: string;
  governorate: string;
} | null> {
  const response = await callClaude(
    `Extract the Egyptian parliament member data from this HTML.
Return JSON only: {"nameAr": "...", "nameEn": "...", "party": "...", "governorate": "..."}
If not found use empty string.

HTML:
${html}`,
    "Extract structured data from Egyptian parliament pages. JSON only."
  );
  if (!response) return null;
  try {
    let jsonStr = response;
    const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) jsonStr = fence[1];
    const parsed = JSON.parse(jsonStr.trim()) as Record<string, string>;
    if (!parsed.nameAr && !parsed.nameEn) return null;
    return {
      nameAr: parsed.nameAr || "",
      nameEn: parsed.nameEn || "",
      party: parsed.party || "",
      governorate: parsed.governorate || "",
    };
  } catch {
    return null;
  }
}

/**
 * Scrape a batch and UPDATE existing placeholder members.
 * Does NOT create new records.
 */
export const scrapeMemberBatch = internalAction({
  args: { startId: v.number(), batchSize: v.number() },
  handler: async (ctx, args) => {
    const endId = args.startId + args.batchSize;
    console.log(`[scraper] Batch ${args.startId}-${endId - 1}`);

    let scraped = 0;
    let updated = 0;

    for (let id = args.startId; id < endId; id++) {
      const html = await fetchMemberPage(id);
      if (!html) continue;
      scraped++;

      const member = await parseMemberHtml(html);
      if (!member || (!member.nameAr && !member.nameEn)) continue;

      // Update an existing placeholder -- do NOT create new records
      const didUpdate: boolean = await ctx.runMutation(
        internal.parliamentQueries.updatePlaceholderWithRealName,
        {
          nameAr: member.nameAr,
          nameEn: member.nameEn || member.nameAr,
          partyHint: member.party,
          governorateHint: member.governorate,
          sourceUrl: `${PARLIAMENT_BASE}?id=${id}`,
        }
      );

      if (didUpdate) updated++;

      // Be respectful to parliament.gov.eg
      await new Promise((r) => setTimeout(r, 300));
    }

    console.log(`[scraper] Batch done: scraped=${scraped} updated=${updated}`);
    return { scraped, saved: updated };
  },
});

/**
 * Chain batches via scheduler to avoid timeout.
 */
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
    console.log(`[scraper] Starting (ids 1-${maxId})...`);
    await ctx.scheduler.runAfter(
      0,
      internal.agents.parliamentScraper.scrapeAndContinue,
      { startId: 1, maxId, batchSize: 10, totalSaved: 0 }
    );
    return { status: "started", maxId };
  },
});
