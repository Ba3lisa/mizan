import { query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

// Today's date in ISO format (YYYY-MM-DD) used to detect forecast vs historical
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

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
      // IMF DataMapper indicators (include forecasts through 2030)
      "imf_gdp_growth_forecast",
      "imf_inflation_forecast",
      "imf_current_account_forecast",
      "imf_gov_debt_gdp",
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
 * For each known indicator, get ALL records for the latest date (multi-source).
 * Returns a map of indicator -> { best: record with lowest sanadLevel, alternatives: remaining records }.
 */
export const getAllLatestMultiSource = query({
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
      "imf_gdp_growth_forecast",
      "imf_inflation_forecast",
      "imf_current_account_forecast",
      "imf_gov_debt_gdp",
    ] as const;

    type IndicatorRecord = Doc<"economicIndicators">;

    const result: Record<string, {
      best: IndicatorRecord | null;
      alternatives: IndicatorRecord[];
    }> = {};

    for (const indicator of knownIndicators) {
      // Find the latest date for this indicator
      const latest = await ctx.db
        .query("economicIndicators")
        .withIndex("by_indicator_and_date", (q) => q.eq("indicator", indicator))
        .order("desc")
        .first();

      if (!latest) {
        result[indicator] = { best: null, alternatives: [] };
        continue;
      }

      // Collect all records for that latest date
      const allForLatestDate = await ctx.db
        .query("economicIndicators")
        .withIndex("by_indicator_and_date", (q) =>
          q.eq("indicator", indicator).eq("date", latest.date)
        )
        .collect();

      // Sort by sanadLevel ascending (lower = more authoritative); undefined sanadLevel treated as 99
      const sorted = allForLatestDate.slice().sort((a, b) => {
        const aLevel = a.sanadLevel ?? 99;
        const bLevel = b.sanadLevel ?? 99;
        return aLevel - bLevel;
      });

      const [best, ...alternatives] = sorted;
      result[indicator] = { best: best ?? null, alternatives };
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

/**
 * Returns all economic indicator records whose date is strictly after today.
 * These are forecast data points (e.g. IMF WEO projections through 2030).
 * Ordered by indicator name then date ascending.
 */
export const getForecasts = query({
  args: {},
  handler: async (ctx) => {
    const today = todayIso();

    // IMF forecast indicators
    const forecastIndicators = [
      "imf_gdp_growth_forecast",
      "imf_inflation_forecast",
      "imf_current_account_forecast",
      "imf_gov_debt_gdp",
    ] as const;

    const results: Array<{
      indicator: string;
      date: string;
      year: string | undefined;
      value: number;
      unit: string;
      sourceUrl: string | undefined;
      sourceNameEn: string | undefined;
    }> = [];

    for (const indicator of forecastIndicators) {
      const records = await ctx.db
        .query("economicIndicators")
        .withIndex("by_indicator_and_date", (q) =>
          q.eq("indicator", indicator).gt("date", today)
        )
        .order("asc")
        .collect();

      for (const r of records) {
        results.push({
          indicator: r.indicator,
          date: r.date,
          year: r.year,
          value: r.value,
          unit: r.unit,
          sourceUrl: r.sourceUrl,
          sourceNameEn: r.sourceNameEn,
        });
      }
    }

    return results;
  },
});
