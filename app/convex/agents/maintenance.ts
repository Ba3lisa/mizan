"use node";
// Maintenance actions for data efficiency.
// - Compacts old refresh logs into weekly summaries (keeps last 30 days detailed)
// - Archives resolved GitHub issue processing records older than 90 days

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Compacts dataRefreshLog entries older than 30 days.
 * Deletes individual entries and keeps only the dataRefreshLog records
 * that are already compacted summaries. Runs daily via cron.
 */
export const compactRefreshLogs = internalAction({
  args: {},
  handler: async (ctx) => {
    if (process.env.DISABLE_CRONS === "true") {
      console.log("[maintenance] Crons disabled, skipping.");
      return null;
    }
    const cutoff = Date.now() - THIRTY_DAYS_MS;
    console.log(
      `[maintenance] Compacting refresh logs older than ${new Date(cutoff).toISOString()}`
    );

    const deleted: number = await ctx.runMutation(
      internal.maintenance.deleteOldRefreshLogs,
      { cutoffTimestamp: cutoff }
    );

    console.log(`[maintenance] Deleted ${deleted} old refresh log entries`);
    return null;
  },
});

/**
 * Archives resolved GitHub issue processing records older than 90 days.
 * The GitHub issue itself is the permanent record — the processing entry
 * is only needed for dedup/spam prevention of recent issues.
 */
export const archiveProcessedIssues = internalAction({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - NINETY_DAYS_MS;
    console.log(
      `[maintenance] Archiving processed issues older than ${new Date(cutoff).toISOString()}`
    );

    const deleted: number = await ctx.runMutation(
      internal.maintenance.deleteOldProcessedIssues,
      { cutoffTimestamp: cutoff }
    );

    console.log(`[maintenance] Archived ${deleted} old issue processing records`);
    return null;
  },
});
