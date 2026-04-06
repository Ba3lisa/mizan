import { query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

/**
 * Get the latest N values for a given indicator, ordered newest-first.
 */
export const getIndicator = query({
  args: {
    indicator: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 1;
    return await ctx.db
      .query("economicIndicators")
      .withIndex("by_indicator_and_date", (q) =>
        q.eq("indicator", args.indicator)
      )
      .order("desc")
      .take(limit);
  },
});

/**
 * Get the most recent value for every known indicator.
 * Returns a map of indicator -> latest record.
 */
export const getAllLatest = query({
  args: {},
  handler: async (ctx) => {
    const knownIndicators = [
      "gdp_growth",
      "inflation",
      "unemployment",
      "exchange_rate",
      "reserves",
      "suez_revenue",
      "remittances",
      "fdi_inflows",
      "tourism_receipts",
      "current_account",
      "gdp_nominal",
      "gdp_per_capita",
      "population",
      "poverty_rate",
      "debt_service_exports",
      "egx30",
    ] as const;

    const result: Record<string, {
      indicator: string;
      date: string;
      year: string | undefined;
      value: number;
      unit: string;
      sourceUrl: string | undefined;
      sourceNameEn: string | undefined;
    } | null> = {};

    for (const indicator of knownIndicators) {
      const record = await ctx.db
        .query("economicIndicators")
        .withIndex("by_indicator_and_date", (q) => q.eq("indicator", indicator))
        .order("desc")
        .first();

      if (record) {
        result[indicator] = {
          indicator: record.indicator,
          date: record.date,
          year: record.year,
          value: record.value,
          unit: record.unit,
          sourceUrl: record.sourceUrl,
          sourceNameEn: record.sourceNameEn,
        };
      } else {
        result[indicator] = null;
      }
    }

    return result;
  },
});

/**
 * Get the full time series for a given indicator, ordered oldest-first.
 * Suitable for rendering charts.
 */
export const getIndicatorTimeline = query({
  args: {
    indicator: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("economicIndicators")
      .withIndex("by_indicator_and_date", (q) =>
        q.eq("indicator", args.indicator)
      )
      .order("asc")
      .collect();
  },
});

/**
 * Get the most recent AI-generated economic narrative for Egypt.
 * Returns the latest aiResearchReports document with category "economy".
 */
export const getLatestNarrative = query({
  args: {},
  handler: async (ctx): Promise<Doc<"aiResearchReports"> | null> => {
    return await ctx.db
      .query("aiResearchReports")
      .withIndex("by_category", (q) => q.eq("category", "economy"))
      .order("desc")
      .first();
  },
});
