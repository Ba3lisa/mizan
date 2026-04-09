import {
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { v } from "convex/values";

// ─── MUTATIONS ───────────────────────────────────────────────────────────────

/** Internal: called from actions after an LLM response. */
export const logApiUsage = internalMutation({
  args: {
    provider: v.string(),
    model: v.string(),
    purpose: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    totalTokens: v.number(),
    costUsd: v.number(),
    durationMs: v.number(),
    success: v.boolean(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("apiUsageLog", args);
    return null;
  },
});

/** Public: for manual logging and testing. */
export const logApiUsagePublic = mutation({
  args: {
    provider: v.string(),
    model: v.string(),
    purpose: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    totalTokens: v.number(),
    costUsd: v.number(),
    durationMs: v.number(),
    success: v.boolean(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("apiUsageLog", args);
    return null;
  },
});

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function dayKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10); // "2026-04-06"
}

function monthKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 7); // "2026-04"
}

// ─── QUERIES ─────────────────────────────────────────────────────────────────

/** Group by calendar day for the last N days, summing tokens and cost. */
export const getDailyUsage = query({
  args: { days: v.number() },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.days * 24 * 60 * 60 * 1000;
    const rows = await ctx.db
      .query("apiUsageLog")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", cutoff))
      .order("asc")
      .take(1000);

    const byDay: Record<string, { inputTokens: number; outputTokens: number; totalTokens: number; costUsd: number; calls: number }> = {};
    for (const row of rows) {
      const key = dayKey(row.timestamp);
      if (!byDay[key]) {
        byDay[key] = { inputTokens: 0, outputTokens: 0, totalTokens: 0, costUsd: 0, calls: 0 };
      }
      byDay[key].inputTokens += row.inputTokens;
      byDay[key].outputTokens += row.outputTokens;
      byDay[key].totalTokens += row.totalTokens;
      byDay[key].costUsd += row.costUsd;
      byDay[key].calls += 1;
    }

    return Object.entries(byDay).map(([date, stats]) => ({
      date,
      inputTokens: stats.inputTokens,
      outputTokens: stats.outputTokens,
      totalTokens: stats.totalTokens,
      costUsd: stats.costUsd,
      callCount: stats.calls,
    }));
  },
});

/** Group by calendar month for the last N months, summing tokens and cost. */
export const getMonthlyUsage = query({
  args: { months: v.number() },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.months * 30 * 24 * 60 * 60 * 1000;
    const rows = await ctx.db
      .query("apiUsageLog")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", cutoff))
      .order("asc")
      .take(1000);

    const byMonth: Record<string, { inputTokens: number; outputTokens: number; totalTokens: number; costUsd: number; calls: number }> = {};
    for (const row of rows) {
      const key = monthKey(row.timestamp);
      if (!byMonth[key]) {
        byMonth[key] = { inputTokens: 0, outputTokens: 0, totalTokens: 0, costUsd: 0, calls: 0 };
      }
      byMonth[key].inputTokens += row.inputTokens;
      byMonth[key].outputTokens += row.outputTokens;
      byMonth[key].totalTokens += row.totalTokens;
      byMonth[key].costUsd += row.costUsd;
      byMonth[key].calls += 1;
    }

    return Object.entries(byMonth).map(([month, stats]) => ({ month, ...stats }));
  },
});

/** Breakdown by provider for the last N days. */
export const getUsageByProvider = query({
  args: { days: v.number() },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.days * 24 * 60 * 60 * 1000;
    const rows = await ctx.db
      .query("apiUsageLog")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", cutoff))
      .order("asc")
      .take(1000);

    const byProvider: Record<string, { inputTokens: number; outputTokens: number; totalTokens: number; costUsd: number; calls: number }> = {};
    for (const row of rows) {
      if (!byProvider[row.provider]) {
        byProvider[row.provider] = { inputTokens: 0, outputTokens: 0, totalTokens: 0, costUsd: 0, calls: 0 };
      }
      byProvider[row.provider].inputTokens += row.inputTokens;
      byProvider[row.provider].outputTokens += row.outputTokens;
      byProvider[row.provider].totalTokens += row.totalTokens;
      byProvider[row.provider].costUsd += row.costUsd;
      byProvider[row.provider].calls += 1;
    }

    return Object.entries(byProvider).map(([provider, stats]) => ({
      provider,
      inputTokens: stats.inputTokens,
      outputTokens: stats.outputTokens,
      totalTokens: stats.totalTokens,
      costUsd: stats.costUsd,
      callCount: stats.calls,
    }));
  },
});

/** Breakdown by purpose for the last N days. */
export const getUsageByPurpose = query({
  args: { days: v.number() },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.days * 24 * 60 * 60 * 1000;
    const rows = await ctx.db
      .query("apiUsageLog")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", cutoff))
      .order("asc")
      .take(1000);

    const byPurpose: Record<string, { inputTokens: number; outputTokens: number; totalTokens: number; costUsd: number; calls: number }> = {};
    for (const row of rows) {
      if (!byPurpose[row.purpose]) {
        byPurpose[row.purpose] = { inputTokens: 0, outputTokens: 0, totalTokens: 0, costUsd: 0, calls: 0 };
      }
      byPurpose[row.purpose].inputTokens += row.inputTokens;
      byPurpose[row.purpose].outputTokens += row.outputTokens;
      byPurpose[row.purpose].totalTokens += row.totalTokens;
      byPurpose[row.purpose].costUsd += row.costUsd;
      byPurpose[row.purpose].calls += 1;
    }

    return Object.entries(byPurpose).map(([purpose, stats]) => ({ purpose, ...stats }));
  },
});

/** Total API cost incurred this calendar month. */
export const getCurrentMonthCost = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const currentMonth = monthKey(now);
    // Start of current calendar month in ms
    const monthStart = new Date(currentMonth + "-01T00:00:00.000Z").getTime();
    const rows = await ctx.db
      .query("apiUsageLog")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", monthStart))
      .order("asc")
      .take(1000);

    let totalCostUsd = 0;
    let totalTokens = 0;
    let calls = 0;
    for (const row of rows) {
      totalCostUsd += row.costUsd;
      totalTokens += row.totalTokens;
      calls += 1;
    }

    return { month: currentMonth, totalCostUsd, totalTokens, calls };
  },
});

/**
 * Reads the latest fundingSummary balance + this month's API cost + fixed
 * infrastructure costs ($38/mo) to estimate months of runway remaining.
 */
export const getRunwaySummary = query({
  args: {},
  handler: async (ctx) => {
    // Latest funding balance
    const latestSummary = await ctx.db
      .query("fundingSummary")
      .withIndex("by_month")
      .order("desc")
      .take(1);
    const balanceUsd = latestSummary[0]?.balanceUsd ?? 0;

    // This month's real API cost from usage log
    const now = Date.now();
    const currentMonth = monthKey(now);
    const monthStart = new Date(currentMonth + "-01T00:00:00.000Z").getTime();
    const rows = await ctx.db
      .query("apiUsageLog")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", monthStart))
      .order("asc")
      .take(1000);

    let apiCostThisMonthUsd = 0;
    for (const row of rows) {
      apiCostThisMonthUsd += row.costUsd;
    }

    const FIXED_COST_USD = 22; // Convex $10 + DigitalOcean $12 per month
    const totalMonthlyBurnUsd = FIXED_COST_USD + apiCostThisMonthUsd;
    const monthsRemaining =
      totalMonthlyBurnUsd > 0 ? balanceUsd / totalMonthlyBurnUsd : null;

    return {
      balanceUsd,
      apiCostThisMonthUsd,
      fixedCostUsd: FIXED_COST_USD,
      totalMonthlyBurnUsd,
      monthsRemaining,
      currentMonth,
    };
  },
});
