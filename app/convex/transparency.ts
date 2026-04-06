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
 */
export const getRefreshTimeline = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 30;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    const logs = await ctx.db
      .query("dataRefreshLog")
      .order("desc")
      .take(500);

    // Filter to the requested window without using .filter()
    // We take a bounded set and group client-side by day
    const recentLogs = logs.filter((log) => log.startedAt >= since);

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
 */
export const getCategoryHealth = query({
  args: {},
  handler: async (ctx) => {
    // Count actual records in each table (not just refresh log counts)
    const officials = await ctx.db.query("officials").collect();
    const ministries = await ctx.db.query("ministries").collect();
    const governorates = await ctx.db.query("governorates").collect();
    const parliamentMembers = await ctx.db.query("parliamentMembers").collect();
    const parties = await ctx.db.query("parties").collect();
    const constitutionArticles = await ctx.db.query("constitutionArticles").collect();
    const fiscalYears = await ctx.db.query("fiscalYears").collect();
    const budgetItems = await ctx.db.query("budgetItems").collect();
    const debtRecords = await ctx.db.query("debtRecords").collect();
    const elections = await ctx.db.query("elections").collect();

    const tableCounts: Record<string, number> = {
      government: officials.length + ministries.length + governorates.length,
      parliament: parliamentMembers.length + parties.length,
      constitution: constitutionArticles.length,
      budget: fiscalYears.length + budgetItems.length,
      debt: debtRecords.length,
      elections: elections.length,
    };

    const categories = [
      "government",
      "parliament",
      "constitution",
      "budget",
      "debt",
    ] as const;

    const result = await Promise.all(
      categories.map(async (category) => {
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

    return result;
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
