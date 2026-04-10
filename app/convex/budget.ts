import { query } from "./_generated/server";
import { v } from "convex/values";


const categoryValidator = v.union(
  v.literal("revenue"),
  v.literal("expenditure")
);

export const listFiscalYears = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db
      .query("fiscalYears")
      .withIndex("by_year")
      .order("asc")
      .collect();

    // Deduplicate by normalized year ("2024/2025" and "2024-2025" are the same).
    // Keep the record with more budget data (higher revenue + expenditure totals).
    const byNormalized = new Map<string, (typeof all)[number]>();
    for (const fy of all) {
      const key = fy.year.replace("/", "-");
      const prev = byNormalized.get(key);
      if (!prev || (fy.totalRevenue ?? 0) + (fy.totalExpenditure ?? 0) > (prev.totalRevenue ?? 0) + (prev.totalExpenditure ?? 0)) {
        byNormalized.set(key, fy);
      }
    }
    return Array.from(byNormalized.values());
  },
});

export const getFiscalYear = query({
  args: { fiscalYearId: v.id("fiscalYears") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.fiscalYearId);
  },
});

export const getBudgetBreakdown = query({
  args: {
    fiscalYearId: v.id("fiscalYears"),
    category: categoryValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("budgetItems")
      .withIndex("by_fiscalYearId_and_category", (q) =>
        q
          .eq("fiscalYearId", args.fiscalYearId)
          .eq("category", args.category)
      )
      .collect();
  },
});

export const getBudgetItemChildren = query({
  args: { parentItemId: v.id("budgetItems") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("budgetItems")
      .withIndex("by_parentItemId", (q) =>
        q.eq("parentItemId", args.parentItemId)
      )
      .collect();
  },
});

export const compareBudgetYears = query({
  args: { yearIds: v.array(v.id("fiscalYears")) },
  handler: async (ctx, args) => {
    return await Promise.all(
      args.yearIds.map(async (yearId) => {
        const fiscalYear = await ctx.db.get(yearId);
        const revenueItems = await ctx.db
          .query("budgetItems")
          .withIndex("by_fiscalYearId_and_category", (q) =>
            q.eq("fiscalYearId", yearId).eq("category", "revenue")
          )
          .collect();
        const expenditureItems = await ctx.db
          .query("budgetItems")
          .withIndex("by_fiscalYearId_and_category", (q) =>
            q.eq("fiscalYearId", yearId).eq("category", "expenditure")
          )
          .collect();

        return {
          fiscalYear,
          revenue: revenueItems,
          expenditure: expenditureItems,
        };
      })
    );
  },
});

export const getBudgetSankeyData = query({
  args: { fiscalYearId: v.id("fiscalYears") },
  handler: async (ctx, args) => {
    const fiscalYear = await ctx.db.get(args.fiscalYearId);

    const revenueItems = await ctx.db
      .query("budgetItems")
      .withIndex("by_fiscalYearId_and_category", (q) =>
        q.eq("fiscalYearId", args.fiscalYearId).eq("category", "revenue")
      )
      .collect();

    const expenditureItems = await ctx.db
      .query("budgetItems")
      .withIndex("by_fiscalYearId_and_category", (q) =>
        q.eq("fiscalYearId", args.fiscalYearId).eq("category", "expenditure")
      )
      .collect();

    // Build Sankey nodes and links
    // Nodes: each revenue source, a central "Budget" node, each expenditure sector
    const nodes: Array<{ id: string; nameEn: string; nameAr: string; type: string }> = [];
    const links: Array<{ source: string; target: string; value: number }> = [];

    const budgetNodeId = "budget_total";
    nodes.push({ id: budgetNodeId, nameEn: "Total Budget", nameAr: "الميزانية الكلية", type: "total" });

    for (const item of revenueItems) {
      const nodeId = `rev_${item._id}`;
      nodes.push({
        id: nodeId,
        nameEn: item.sectorEn,
        nameAr: item.sectorAr,
        type: "revenue",
      });
      links.push({ source: nodeId, target: budgetNodeId, value: item.amount });
    }

    for (const item of expenditureItems) {
      const nodeId = `exp_${item._id}`;
      nodes.push({
        id: nodeId,
        nameEn: item.sectorEn,
        nameAr: item.sectorAr,
        type: "expenditure",
      });
      links.push({ source: budgetNodeId, target: nodeId, value: item.amount });
    }

    return { fiscalYear, nodes, links };
  },
});

/**
 * Get tax brackets for a specific year.
 * Used by /budget/your-share to calculate personal tax burden.
 */
export const getTaxBrackets = query({
  args: { year: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const year = args.year ?? "2024";
    return await ctx.db
      .query("taxBrackets")
      .withIndex("by_year_and_sortOrder", (q) => q.eq("year", year))
      .collect();
  },
});

/**
 * Get expenditure breakdown as percentages for the latest fiscal year.
 * Used by /budget/your-share to show where tax money goes.
 */
export const getExpenditureBreakdown = query({
  args: {},
  handler: async (ctx) => {
    // Get the latest fiscal year
    const fiscalYears = await ctx.db
      .query("fiscalYears")
      .withIndex("by_year")
      .order("desc")
      .take(1);

    if (fiscalYears.length === 0) return { fiscalYear: null, items: [] };

    const fy = fiscalYears[0];
    const items = await ctx.db
      .query("budgetItems")
      .withIndex("by_fiscalYearId_and_category", (q) =>
        q.eq("fiscalYearId", fy._id).eq("category", "expenditure")
      )
      .collect();

    // Only top-level items (no parent)
    const topLevel = items.filter((i) => !i.parentItemId);

    return {
      fiscalYear: fy,
      items: topLevel.map((i) => ({
        sectorAr: i.sectorAr,
        sectorEn: i.sectorEn,
        amount: i.amount,
        percentageOfTotal: i.percentageOfTotal ?? 0,
      })),
    };
  },
});
