import { query, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get investment opportunities within a capital range, with optional filters.
 * Used by the Capital Matcher tab in مشروعك.
 */
export const getByCapitalRange = query({
  args: {
    maxCost: v.number(),
    minCost: v.optional(v.number()),
    sector: v.optional(v.string()),
    governorate: v.optional(v.string()),
    type: v.optional(v.string()),
    source: v.optional(v.union(v.literal("ida"), v.literal("gafi"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    let results = await ctx.db
      .query("investmentOpportunities")
      .collect();

    // Filter by cost range — include opportunities within budget OR without cost data
    results = results.filter((r) => {
      if (r.costEgp === undefined) return true; // Show "contact for pricing" opportunities
      if (r.costEgp > args.maxCost) return false;
      if (args.minCost !== undefined && r.costEgp < args.minCost) return false;
      return true;
    });

    // Apply optional filters
    if (args.sector) {
      results = results.filter((r) => r.sector === args.sector);
    }
    if (args.governorate) {
      results = results.filter((r) => r.governorate === args.governorate);
    }
    if (args.type) {
      results = results.filter((r) => r.type === args.type);
    }
    if (args.source) {
      results = results.filter((r) => r.source === args.source);
    }

    // Sort: priced opportunities first (descending), then unpriced
    results.sort((a, b) => {
      if (a.costEgp !== undefined && b.costEgp !== undefined) return b.costEgp - a.costEgp;
      if (a.costEgp !== undefined) return -1;
      if (b.costEgp !== undefined) return 1;
      return 0;
    });

    return results.slice(0, limit);
  },
});

/**
 * Browse all investment opportunities with optional filters.
 * Used by the Project Explorer tab.
 */
export const getByFilters = query({
  args: {
    sector: v.optional(v.string()),
    governorate: v.optional(v.string()),
    type: v.optional(v.string()),
    source: v.optional(v.union(v.literal("ida"), v.literal("gafi"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    // Use the most selective index available
    let q;
    if (args.sector) {
      q = ctx.db
        .query("investmentOpportunities")
        .withIndex("by_sector", (idx) => idx.eq("sector", args.sector!));
    } else if (args.governorate) {
      q = ctx.db
        .query("investmentOpportunities")
        .withIndex("by_governorate", (idx) => idx.eq("governorate", args.governorate!));
    } else if (args.type) {
      // Cast needed: args.type is string but index expects the union literal
      const typeVal = args.type as "industrial_unit" | "land_plot" | "major_opportunity" | "free_zone" | "investment_zone" | "sme_program";
      q = ctx.db
        .query("investmentOpportunities")
        .withIndex("by_type", (idx) => idx.eq("type", typeVal));
    } else if (args.source) {
      q = ctx.db
        .query("investmentOpportunities")
        .withIndex("by_source", (idx) => idx.eq("source", args.source!));
    } else {
      q = ctx.db.query("investmentOpportunities");
    }

    let results = await q.collect();

    // Post-filter remaining criteria
    if (args.sector && args.governorate) {
      results = results.filter((r) => r.governorate === args.governorate);
    }
    if (args.sector && args.type) {
      results = results.filter((r) => r.type === args.type);
    }
    if (args.sector && args.source) {
      results = results.filter((r) => r.source === args.source);
    }
    if (args.governorate && args.type && !args.sector) {
      results = results.filter((r) => r.type === args.type);
    }
    if (args.governorate && args.source && !args.sector) {
      results = results.filter((r) => r.source === args.source);
    }
    if (args.type && args.source && !args.sector && !args.governorate) {
      results = results.filter((r) => r.source === args.source);
    }

    return results.slice(0, limit);
  },
});

/**
 * Full-text search across investment opportunities.
 */
export const searchOpportunities = query({
  args: {
    searchQuery: v.string(),
    sector: v.optional(v.string()),
    governorate: v.optional(v.string()),
    type: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 25;
    const q = ctx.db
      .query("investmentOpportunities")
      .withSearchIndex("search_opportunities", (s) => {
        let search = s.search("nameEn", args.searchQuery);
        if (args.sector) search = search.eq("sector", args.sector);
        if (args.governorate) search = search.eq("governorate", args.governorate);
        if (args.type) search = search.eq("type", args.type as "industrial_unit" | "land_plot" | "major_opportunity" | "free_zone" | "investment_zone" | "sme_program");
        return search;
      });

    return await q.take(limit);
  },
});

/**
 * Get a single opportunity with its detail breakdown.
 */
export const getProjectDetail = query({
  args: { opportunityId: v.id("investmentOpportunities") },
  handler: async (ctx, args) => {
    const opportunity = await ctx.db.get(args.opportunityId);
    if (!opportunity) return null;

    const detail = await ctx.db
      .query("investmentProjectDetails")
      .withIndex("by_opportunityId", (q) =>
        q.eq("opportunityId", args.opportunityId)
      )
      .unique();

    return { ...opportunity, detail };
  },
});

/**
 * Summary statistics for the مشروعك page header.
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("investmentOpportunities").collect();

    const byType: Record<string, number> = {};
    const bySector: Record<string, number> = {};
    const byGovernorate: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    let minCost = Infinity;
    let maxCost = 0;
    const sectors: string[] = [];
    const governorates: string[] = [];

    for (const opp of all) {
      byType[opp.type] = (byType[opp.type] ?? 0) + 1;
      bySector[opp.sector] = (bySector[opp.sector] ?? 0) + 1;
      bySource[opp.source] = (bySource[opp.source] ?? 0) + 1;

      if (opp.governorate) {
        byGovernorate[opp.governorate] = (byGovernorate[opp.governorate] ?? 0) + 1;
        if (!governorates.includes(opp.governorate)) {
          governorates.push(opp.governorate);
        }
      }

      if (!sectors.includes(opp.sector)) {
        sectors.push(opp.sector);
      }

      if (opp.costEgp !== undefined) {
        if (opp.costEgp < minCost) minCost = opp.costEgp;
        if (opp.costEgp > maxCost) maxCost = opp.costEgp;
      }
    }

    return {
      total: all.length,
      byType,
      bySector,
      byGovernorate,
      bySource,
      sectors: sectors.sort(),
      governorates: governorates.sort(),
      costRange: {
        min: minCost === Infinity ? 0 : minCost,
        max: maxCost,
      },
    };
  },
});

/**
 * Internal query: get all opportunities without cost data.
 * Used by the pipeline cost estimation step.
 */
export const getAllUnpriced = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("investmentOpportunities").collect();
    return all.filter((o) => o.costEgp === undefined);
  },
});

/**
 * Internal query: get all investment opportunities.
 * Used by the deep scrape pipeline.
 */
export const getAllOpportunities = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("investmentOpportunities").collect();
  },
});

/**
 * Internal query: get all opportunities that have no associated project detail record yet.
 * Used by deepScrapePass2 to find opportunities that still need enrichment.
 */
export const getOpportunitiesWithoutDetails = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("investmentOpportunities").collect();
    const results = [];
    for (const opp of all) {
      const detail = await ctx.db
        .query("investmentProjectDetails")
        .withIndex("by_opportunityId", (q) => q.eq("opportunityId", opp._id))
        .unique();
      if (!detail) results.push(opp);
    }
    return results;
  },
});
