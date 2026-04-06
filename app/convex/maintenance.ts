import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Delete dataRefreshLog entries older than the cutoff that are not compacted summaries.
 * Called by the maintenance action in agents/maintenance.ts.
 */
export const deleteOldRefreshLogs = internalMutation({
  args: { cutoffTimestamp: v.number() },
  handler: async (ctx, args) => {
    const oldLogs = await ctx.db
      .query("dataRefreshLog")
      .withIndex("by_category_and_startedAt")
      .collect();

    let deleted = 0;
    for (const log of oldLogs) {
      // Keep compacted summaries, only delete detailed entries older than cutoff
      if (log.startedAt < args.cutoffTimestamp && !log.isCompacted) {
        await ctx.db.delete(log._id);
        deleted++;
      }
    }
    return deleted;
  },
});

/**
 * Delete githubIssueProcessing records in terminal states older than the cutoff.
 * The GitHub issue itself is the permanent record.
 */
export const deleteOldProcessedIssues = internalMutation({
  args: { cutoffTimestamp: v.number() },
  handler: async (ctx, args) => {
    const terminalStatuses = new Set([
      "applied",
      "rejected",
      "spam",
    ]);
    const allIssues = await ctx.db
      .query("githubIssueProcessing")
      .withIndex("by_status")
      .collect();

    let deleted = 0;
    for (const issue of allIssues) {
      if (
        terminalStatuses.has(issue.status) &&
        issue.createdAt < args.cutoffTimestamp
      ) {
        await ctx.db.delete(issue._id);
        deleted++;
      }
    }
    return deleted;
  },
});
