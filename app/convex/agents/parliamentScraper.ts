"use node";
// Parliament member scraper.
// Fetches individual member pages from parliament.gov.eg/MembersDetails.aspx?id=N
// and uses Claude to extract structured data. No JS rendering needed --
// individual pages return HTML directly.
//
// Runs in batches to avoid overwhelming the server and Convex action timeouts.

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { callClaude } from "./providers/anthropic";

const PARLIAMENT_BASE = "https://www.parliament.gov.eg/MembersDetails.aspx";

interface ParsedMember {
  nameAr: string;
  nameEn: string;
  party: string;
  governorate: string;
  constituency: string;
  membershipType: string;
  committee: string;
}

async function fetchMemberPage(id: number): Promise<string | null> {
  try {
    const response = await fetch(`${PARLIAMENT_BASE}?id=${id}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    const html = await response.text();
    // Skip empty/error pages
    if (html.length < 1000 || html.includes("Object moved")) return null;
    // The member data is deep in the HTML (after CSS/JS). Find the content area.
    const contentStart = html.indexOf("ContentPlaceHolder1");
    if (contentStart === -1) return null;
    // Extract a window around the content area
    return html.slice(Math.max(0, contentStart - 500), contentStart + 5000);
  } catch {
    return null;
  }
}

async function parseMemberHtml(html: string): Promise<ParsedMember | null> {
  const response = await callClaude(
    `Extract the Egyptian parliament member data from this HTML page.
Return JSON only: {"nameAr": "...", "nameEn": "...", "party": "...", "governorate": "...", "constituency": "...", "membershipType": "individual|list|appointed", "committee": "..."}
If any field is not found, use empty string.

HTML:
${html}`,
    "You are a data extraction assistant. Extract structured data from Egyptian parliament member pages. Always respond with valid JSON only."
  );

  if (!response) return null;

  try {
    let jsonStr = response;
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1];
    return JSON.parse(jsonStr.trim()) as ParsedMember;
  } catch {
    return null;
  }
}

/**
 * Scrape a batch of parliament member pages.
 * Call with startId and batchSize to process a range.
 * Designed to be called multiple times to cover all ~600 members.
 */
export const scrapeMemberBatch = internalAction({
  args: {
    startId: v.number(),
    batchSize: v.number(),
  },
  handler: async (ctx, args) => {
    const endId = args.startId + args.batchSize;
    console.log(`[parliamentScraper] Scraping members ${args.startId}-${endId - 1}...`);

    let scraped = 0;
    let saved = 0;

    for (let id = args.startId; id < endId; id++) {
      const html = await fetchMemberPage(id);
      if (!html) continue;
      scraped++;

      const member = await parseMemberHtml(html);
      if (!member || !member.nameAr) {
        console.warn(`[parliamentScraper] Failed to parse member id=${id}, member=${JSON.stringify(member)}`);
        continue;
      }
      console.log(`[parliamentScraper] Parsed: ${member.nameEn} (${member.party})`);


      // Save to Convex
      await ctx.runMutation(internal.parliamentQueries.upsertMember, {
        nameAr: member.nameAr,
        nameEn: member.nameEn || member.nameAr,
        partyNameEn: member.party,
        governorate: member.governorate,
        constituency: member.constituency,
        membershipType: member.membershipType === "list" ? "party_list" as const
          : member.membershipType === "appointed" ? "presidential_appointment" as const
          : "constituency" as const,
        committee: member.committee,
        sourceUrl: `${PARLIAMENT_BASE}?id=${id}`,
        chamber: "house" as const,
      });
      saved++;

      // Small delay to be respectful to parliament.gov.eg
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log(`[parliamentScraper] Batch ${args.startId}-${endId - 1}: scraped ${scraped}, saved ${saved}`);
    return { scraped, saved };
  },
});

/**
 * Orchestrates scraping all parliament members in batches.
 * Each batch is a separate action call to avoid timeout.
 */
export const scrapeAllMembers = internalAction({
  args: { maxId: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const maxId = args.maxId ?? 600;
    const batchSize = 20; // 20 members per batch (10s per member = ~200s per batch)
    let totalSaved = 0;

    for (let startId = 1; startId <= maxId; startId += batchSize) {
      try {
        const result: { scraped: number; saved: number } = await ctx.runAction(
          internal.agents.parliamentScraper.scrapeMemberBatch,
          { startId, batchSize: Math.min(batchSize, maxId - startId + 1) }
        );
        totalSaved += result.saved;
        console.log(`[parliamentScraper] Progress: ${startId + batchSize - 1}/${maxId}, total saved: ${totalSaved}`);
      } catch (err) {
        console.warn(`[parliamentScraper] Batch starting at ${startId} failed: ${err}`);
      }
    }

    // Log the refresh
    const logId = await ctx.runMutation(
      internal.dataRefresh.logRefreshStart,
      { category: "parliament" }
    );
    await ctx.runMutation(internal.dataRefresh.logRefreshComplete, {
      logId,
      recordsUpdated: totalSaved,
      sourceUrl: "https://www.parliament.gov.eg/members.aspx",
    });

    console.log(`[parliamentScraper] Complete: ${totalSaved} members scraped from parliament.gov.eg`);
    return { totalSaved };
  },
});
