import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Returns per-table record counts for all tracked data categories.
 *
 * This is the single canonical count query. It replaces both
 * `getCategoryHealth` table scans and the `getDataOverview` subscription
 * on the transparency page, halving the number of tables read per visitor.
 *
 * Counts are bounded by take() limits — these are set well above current
 * data volumes so they reflect true counts in practice. When a table grows
 * beyond its limit the count will read as the limit value (indicative, not exact).
 * For an exact count at scale, migrate to the @convex-dev/aggregate component.
 *
 * Tables and their expected row counts (as of 2026):
 *   officials          ~200     → take(2000)
 *   ministries         ~34      → take(200)
 *   governorates       ~27      → take(50)
 *   parliamentMembers  ~868     → take(2000)
 *   parties            ~30      → take(200)
 *   constitutionArticles 247    → take(300)
 *   fiscalYears        ~10      → take(100)
 *   budgetItems        ~500     → take(2000)
 *   debtRecords        ~50      → take(500)
 *   elections          ~10      → take(100)
 *   dataRefreshLog     ~1000+   → take(5000)
 *   dataChangeLog      ~10000+  → take(10000)
 */
export const getTableCounts = query({
  args: {},
  handler: async (ctx) => {
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
      dataRefreshLog,
      dataChangeLog,
    ] = await Promise.all([
      ctx.db.query("officials").take(2000),
      ctx.db.query("ministries").take(200),
      ctx.db.query("governorates").take(50),
      ctx.db.query("parliamentMembers").take(2000),
      ctx.db.query("parties").take(200),
      ctx.db.query("constitutionArticles").take(300),
      ctx.db.query("fiscalYears").take(100),
      ctx.db.query("budgetItems").take(2000),
      ctx.db.query("debtRecords").take(500),
      ctx.db.query("elections").take(100),
      ctx.db.query("dataRefreshLog").take(5000),
      ctx.db.query("dataChangeLog").take(10000),
    ]);

    return {
      officials: officials.length,
      ministries: ministries.length,
      governorates: governorates.length,
      parliamentMembers: parliamentMembers.length,
      parties: parties.length,
      constitutionArticles: constitutionArticles.length,
      fiscalYears: fiscalYears.length,
      budgetItems: budgetItems.length,
      debtRecords: debtRecords.length,
      elections: elections.length,
      dataRefreshLog: dataRefreshLog.length,
      dataChangeLog: dataChangeLog.length,
    };
  },
});

/**
 * Returns per-category aggregate counts only (no table-level breakdown).
 * Lighter version for health cards that only need category totals.
 */
export const getCategoryCounts = query({
  args: {},
  handler: async (ctx) => {
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
      ctx.db.query("governorates").take(50),
      ctx.db.query("parliamentMembers").take(2000),
      ctx.db.query("parties").take(200),
      ctx.db.query("constitutionArticles").take(300),
      ctx.db.query("fiscalYears").take(100),
      ctx.db.query("budgetItems").take(2000),
      ctx.db.query("debtRecords").take(500),
      ctx.db.query("elections").take(100),
    ]);

    return {
      government: officials.length + ministries.length + governorates.length,
      parliament: parliamentMembers.length + parties.length,
      constitution: constitutionArticles.length,
      budget: fiscalYears.length + budgetItems.length,
      debt: debtRecords.length,
      elections: elections.length,
    };
  },
});

/**
 * Returns a lightweight count for a single table by name.
 * Useful for one-off spot-checks without triggering all-table subscriptions.
 */
export const getSingleTableCount = query({
  args: {
    table: v.union(
      v.literal("officials"),
      v.literal("ministries"),
      v.literal("governorates"),
      v.literal("parliamentMembers"),
      v.literal("parties"),
      v.literal("constitutionArticles"),
      v.literal("fiscalYears"),
      v.literal("budgetItems"),
      v.literal("debtRecords"),
      v.literal("elections"),
      v.literal("dataRefreshLog"),
      v.literal("dataChangeLog")
    ),
  },
  handler: async (ctx, args) => {
    const LIMITS: Record<string, number> = {
      officials: 2000,
      ministries: 200,
      governorates: 50,
      parliamentMembers: 2000,
      parties: 200,
      constitutionArticles: 300,
      fiscalYears: 100,
      budgetItems: 2000,
      debtRecords: 500,
      elections: 100,
      dataRefreshLog: 5000,
      dataChangeLog: 10000,
    };
    const limit = LIMITS[args.table] ?? 1000;
    const rows = await ctx.db.query(args.table as "officials").take(limit);
    return rows.length;
  },
});
