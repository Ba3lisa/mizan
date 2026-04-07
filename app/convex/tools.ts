import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get latest values for all investment-relevant indicators.
 * Used by financial calculator tools on the frontend.
 */
export const getInvestmentDefaults = query({
  args: {},
  handler: async (ctx) => {
    const keys = [
      "egx30_annual_return",
      "egypt_real_estate_return",
      "cbe_cd_rate",
      "egypt_tbill_rate",
      "gold_price_egp",
      "sp500_annual_return",
      "msci_em_return",
      "egypt_mortgage_rate",
      "inflation",
      "exchange_rate",
    ];

    const result: Record<
      string,
      {
        value: number;
        unit: string;
        date: string;
        sanadLevel: number;
        sourceUrl?: string;
      }
    > = {};

    for (const key of keys) {
      const record = await ctx.db
        .query("economicIndicators")
        .withIndex("by_indicator_and_date", (q) => q.eq("indicator", key))
        .order("desc")
        .first();
      if (record) {
        result[key] = {
          value: record.value,
          unit: record.unit,
          date: record.date,
          sanadLevel: record.sanadLevel,
          sourceUrl: record.sourceUrl,
        };
      }
    }

    return result;
  },
});

/**
 * Get the full time series for a given asset-class indicator, oldest-first.
 * Suitable for rendering charts in financial tools.
 */
export const getAssetTimeline = query({
  args: { indicator: v.string() },
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
 * Get the latest mortgage rate record.
 */
export const getMortgageRate = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("economicIndicators")
      .withIndex("by_indicator_and_date", (q) =>
        q.eq("indicator", "egypt_mortgage_rate")
      )
      .order("desc")
      .first();
  },
});

/**
 * Internal mutation used to seed baseline investment indicator values.
 * Should only be called once during initial deployment or to refresh stale seeds.
 */
export const seedInvestmentIndicators = internalMutation({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().slice(0, 10);
    const year = today.slice(0, 4);

    const seeds: Array<{
      indicator: string;
      value: number;
      unit: string;
      sanadLevel: number;
      sourceUrl: string;
      sourceNameEn: string;
    }> = [
      {
        indicator: "egx30_annual_return",
        value: 18.5,
        unit: "%",
        sanadLevel: 1,
        sourceUrl: "https://www.egx.com.eg",
        sourceNameEn: "Egyptian Exchange (EGX)",
      },
      {
        indicator: "egypt_real_estate_return",
        value: 15.0,
        unit: "%",
        sanadLevel: 4,
        sourceUrl: "https://www.aqarmap.com.eg",
        sourceNameEn: "Aqarmap Egypt",
      },
      {
        indicator: "cbe_cd_rate",
        value: 19.0,
        unit: "%",
        sanadLevel: 1,
        sourceUrl: "https://www.cbe.org.eg",
        sourceNameEn: "Central Bank of Egypt",
      },
      {
        indicator: "egypt_tbill_rate",
        value: 22.5,
        unit: "%",
        sanadLevel: 1,
        sourceUrl: "https://www.cbe.org.eg",
        sourceNameEn: "Central Bank of Egypt",
      },
      {
        indicator: "gold_price_egp",
        value: 4850,
        unit: "EGP/g",
        sanadLevel: 2,
        sourceUrl: "https://api.stlouisfed.org",
        sourceNameEn: "FRED (St. Louis Fed)",
      },
      {
        indicator: "sp500_annual_return",
        value: 24.2,
        unit: "%",
        sanadLevel: 2,
        sourceUrl: "https://api.stlouisfed.org",
        sourceNameEn: "FRED (St. Louis Fed)",
      },
      {
        indicator: "msci_em_return",
        value: 7.5,
        unit: "%",
        sanadLevel: 2,
        sourceUrl: "https://www.alphavantage.co",
        sourceNameEn: "Alpha Vantage",
      },
      {
        indicator: "egypt_mortgage_rate",
        value: 20.0,
        unit: "%",
        sanadLevel: 1,
        sourceUrl: "https://www.nbe.com.eg",
        sourceNameEn: "National Bank of Egypt",
      },
    ];

    for (const seed of seeds) {
      // Only insert if no record exists for this indicator on today's date
      const existing = await ctx.db
        .query("economicIndicators")
        .withIndex("by_indicator_and_date", (q) =>
          q.eq("indicator", seed.indicator).eq("date", today)
        )
        .first();

      if (!existing) {
        await ctx.db.insert("economicIndicators", {
          indicator: seed.indicator,
          date: today,
          year,
          value: seed.value,
          unit: seed.unit,
          sanadLevel: seed.sanadLevel,
          sourceUrl: seed.sourceUrl,
          sourceNameEn: seed.sourceNameEn,
        });
      }
    }

    return { seeded: seeds.length, date: today };
  },
});
