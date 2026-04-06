"use node";
// Parliament member scraper -- CURRENTLY DISABLED.
// The scraper creates duplicate records instead of updating placeholders.
// TODO: Fix upsertMember to match by party + seat number and update in-place.

import { internalAction } from "../_generated/server";
import { v } from "convex/values";

// All functions are no-ops until the duplicate issue is fixed.

export const scrapeMemberBatch = internalAction({
  args: { startId: v.number(), batchSize: v.number() },
  handler: async () => {
    return { scraped: 0, saved: 0 };
  },
});

export const scrapeAndContinue = internalAction({
  args: {
    startId: v.number(),
    maxId: v.number(),
    batchSize: v.number(),
    totalSaved: v.number(),
  },
  handler: async () => {
    // No-op: kills any remaining scheduled chains
    return;
  },
});

export const scrapeAllMembers = internalAction({
  args: { maxId: v.optional(v.number()) },
  handler: async () => {
    console.log("[parliamentScraper] DISABLED -- scraper creates duplicates");
    return { status: "disabled", totalSaved: 0 };
  },
});
