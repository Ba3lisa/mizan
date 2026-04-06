import { query } from "./_generated/server";
import { v } from "convex/values";

const categoryValidator = v.union(
  v.literal("government"),
  v.literal("parliament"),
  v.literal("constitution"),
  v.literal("budget"),
  v.literal("debt"),
  v.literal("elections")
);

/**
 * Returns the last N data refresh logs joined with their change details.
 * Shows exactly what the AI agent did in each run.
 */
export const getRecentActivity = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const refreshLogs = await ctx.db
      .query("dataRefreshLog")
      .order("desc")
      .take(limit);

    const result = await Promise.all(
      refreshLogs.map(async (log) => {
        const changes = await ctx.db
          .query("dataChangeLog")
          .withIndex("by_refreshLogId", (q) => q.eq("refreshLogId", log._id))
          .order("asc")
          .take(50);

        return {
          ...log,
          changes,
        };
      })
    );

    return result;
  },
});

/**
 * Returns refresh activity grouped by day for a timeline view.
 * Days parameter controls how many days back to look (default: 30).
 * Uses index-based ordering and a bounded take to avoid in-memory filtering.
 */
export const getRefreshTimeline = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 30;
    // Bound days to a reasonable maximum to limit I/O
    const boundedDays = Math.min(days, 90);
    // Cap the number of logs we read: 4 runs/day × 8 categories × boundedDays + buffer
    const maxLogs = Math.min(boundedDays * 40, 500);

    // Read only recent logs by using desc order and take — this avoids scanning
    // old records. The table grows by ~30 rows per pipeline run so 500 covers ~17 runs.
    const logs = await ctx.db
      .query("dataRefreshLog")
      .order("desc")
      .take(maxLogs);

    const since = Date.now() - boundedDays * 24 * 60 * 60 * 1000;
    // Only keep logs within the requested window. Since we ordered desc and the
    // table is append-only, we stop as soon as we pass the boundary.
    const recentLogs: typeof logs = [];
    for (const log of logs) {
      if (log.startedAt < since) break;
      recentLogs.push(log);
    }

    // Group by ISO date string (YYYY-MM-DD)
    const byDay: Record<
      string,
      {
        date: string;
        totalRuns: number;
        successRuns: number;
        failedRuns: number;
        categories: string[];
      }
    > = {};

    for (const log of recentLogs) {
      const date = new Date(log.startedAt).toISOString().slice(0, 10);
      if (!byDay[date]) {
        byDay[date] = {
          date,
          totalRuns: 0,
          successRuns: 0,
          failedRuns: 0,
          categories: [],
        };
      }
      const day = byDay[date];
      day.totalRuns++;
      if (log.status === "success") day.successRuns++;
      if (log.status === "failed") day.failedRuns++;
      if (!day.categories.includes(log.category)) {
        day.categories.push(log.category);
      }
    }

    return Object.values(byDay).sort((a, b) => b.date.localeCompare(a.date));
  },
});

/**
 * Returns health summary for each data category:
 * last refresh time, status, records count, and source URL.
 *
 * Uses bounded .take() instead of .collect() to limit I/O. The counts are
 * indicative (capped at the take limit) but sufficient for health display.
 * Tables in this project are all well under 10,000 rows.
 */
export const getCategoryHealth = query({
  args: {},
  handler: async (ctx) => {
    // Count actual records in each table using bounded reads.
    // These tables are small (< 1000 rows each) so take(2000) safely captures all.
    const [
      officials,
      ministries,
      governorates,
      parliamentMembers,
      parties,
      constitutionArticles,
      fiscalYears,
      budgetItems,
      debtRecords,
      elections,
    ] = await Promise.all([
      ctx.db.query("officials").take(2000),
      ctx.db.query("ministries").take(200),
      ctx.db.query("governorates").take(200),
      ctx.db.query("parliamentMembers").take(2000),
      ctx.db.query("parties").take(200),
      ctx.db.query("constitutionArticles").take(300),
      ctx.db.query("fiscalYears").take(100),
      ctx.db.query("budgetItems").take(2000),
      ctx.db.query("debtRecords").take(500),
      ctx.db.query("elections").take(100),
    ]);

    const tableCounts: Record<string, number> = {
      government: officials.length + ministries.length + governorates.length,
      parliament: parliamentMembers.length + parties.length,
      constitution: constitutionArticles.length,
      budget: fiscalYears.length + budgetItems.length,
      debt: debtRecords.length,
      elections: elections.length,
    };

    // Categories that have pipeline refresh logs
    const pipelineCategories = [
      "government",
      "parliament",
      "constitution",
      "budget",
      "debt",
    ] as const;

    const pipelineResults = await Promise.all(
      pipelineCategories.map(async (category) => {
        const lastSuccessful = await ctx.db
          .query("dataRefreshLog")
          .withIndex("by_category_and_status_and_startedAt", (q) =>
            q.eq("category", category).eq("status", "success")
          )
          .order("desc")
          .first();

        const lastAttempt = await ctx.db
          .query("dataRefreshLog")
          .withIndex("by_category_and_startedAt", (q) =>
            q.eq("category", category)
          )
          .order("desc")
          .first();

        return {
          category,
          lastRefreshTime: lastSuccessful
            ? (lastSuccessful.completedAt ?? lastSuccessful.startedAt)
            : null,
          lastAttemptTime: lastAttempt ? lastAttempt.startedAt : null,
          lastStatus: lastAttempt ? lastAttempt.status : null,
          recordCount: tableCounts[category] ?? 0,
          recordsUpdated: lastSuccessful?.recordsUpdated ?? null,
          sourceUrl: lastSuccessful?.sourceUrl ?? null,
        };
      })
    );

    // Elections is static data — no pipeline refresh, just return record count
    const electionsResult = {
      category: "elections" as const,
      lastRefreshTime: null,
      lastAttemptTime: null,
      lastStatus: elections.length > 0 ? "success" : null,
      recordCount: tableCounts.elections ?? 0,
      recordsUpdated: null,
      sourceUrl: null,
    };

    return [...pipelineResults, electionsResult];
  },
});

/**
 * Returns detailed change log entries for a specific data category.
 * Ordered by most recent first.
 */
export const getChangeHistory = query({
  args: {
    category: categoryValidator,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    return await ctx.db
      .query("dataChangeLog")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .order("desc")
      .take(limit);
  },
});
