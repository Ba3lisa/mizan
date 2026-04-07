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
      "gold_annual_return",
      "sp500_annual_return",
      "msci_em_return",
      "egypt_mortgage_rate",
      "inflation",
      "exchange_rate",
      // Bank CDs
      "banque_misr_cd_1yr",
      "banque_misr_cd_3yr",
      "nbe_cd_1yr",
      "nbe_cd_3yr",
      "cib_cd_1yr",
      "cib_cd_floating",
      // Government Savings Certificates
      "egypt_savings_cert_1yr",
      "egypt_savings_cert_3yr",
      "egypt_savings_cert_5yr",
      // Dividend / rental yield indicators
      "egx30_dividend_yield",
      "egypt_real_estate_rental_yield",
      "sp500_dividend_yield",
      "msci_em_dividend_yield",
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
      // Bank CDs
      {
        indicator: "banque_misr_cd_1yr",
        value: 16,
        unit: "percent",
        sanadLevel: 1,
        sourceUrl: "https://www.banquemisr.com",
        sourceNameEn: "Banque Misr",
      },
      {
        indicator: "banque_misr_cd_3yr",
        value: 16,
        unit: "percent",
        sanadLevel: 1,
        sourceUrl: "https://www.banquemisr.com",
        sourceNameEn: "Banque Misr",
      },
      {
        indicator: "nbe_cd_1yr",
        value: 16,
        unit: "percent",
        sanadLevel: 1,
        sourceUrl: "https://www.nbe.com.eg",
        sourceNameEn: "National Bank of Egypt",
      },
      {
        indicator: "nbe_cd_3yr",
        value: 16,
        unit: "percent",
        sanadLevel: 1,
        sourceUrl: "https://www.nbe.com.eg",
        sourceNameEn: "National Bank of Egypt",
      },
      {
        indicator: "cib_cd_1yr",
        value: 14,
        unit: "percent",
        sanadLevel: 1,
        sourceUrl: "https://www.cibeg.com",
        sourceNameEn: "Commercial International Bank (CIB)",
      },
      {
        indicator: "cib_cd_floating",
        value: 17,
        unit: "percent",
        sanadLevel: 1,
        sourceUrl: "https://www.cibeg.com",
        sourceNameEn: "Commercial International Bank (CIB)",
      },
      // Government Savings Certificates
      {
        indicator: "egypt_savings_cert_1yr",
        value: 16,
        unit: "percent",
        sanadLevel: 1,
        sourceUrl: "https://www.cbe.org.eg",
        sourceNameEn: "Central Bank of Egypt",
      },
      {
        indicator: "egypt_savings_cert_3yr",
        value: 16,
        unit: "percent",
        sanadLevel: 1,
        sourceUrl: "https://www.cbe.org.eg",
        sourceNameEn: "Central Bank of Egypt",
      },
      {
        indicator: "egypt_savings_cert_5yr",
        value: 14,
        unit: "percent",
        sanadLevel: 1,
        sourceUrl: "https://www.cbe.org.eg",
        sourceNameEn: "Central Bank of Egypt",
      },
      // Gold annual return
      {
        indicator: "gold_annual_return",
        value: 20,
        unit: "percent",
        sanadLevel: 2,
        sourceUrl: "https://api.stlouisfed.org",
        sourceNameEn: "FRED (St. Louis Fed)",
      },
      // Dividend / rental yield indicators
      {
        indicator: "egx30_dividend_yield",
        value: 2.5,
        unit: "percent",
        sanadLevel: 1,
        sourceUrl: "https://www.egx.com.eg",
        sourceNameEn: "Egyptian Exchange (EGX)",
      },
      {
        indicator: "egypt_real_estate_rental_yield",
        value: 4.0,
        unit: "percent",
        sanadLevel: 4,
        sourceUrl: "https://www.aqarmap.com.eg",
        sourceNameEn: "Aqarmap Egypt",
      },
      {
        indicator: "sp500_dividend_yield",
        value: 1.5,
        unit: "percent",
        sanadLevel: 2,
        sourceUrl: "https://api.stlouisfed.org",
        sourceNameEn: "FRED (St. Louis Fed)",
      },
      {
        indicator: "msci_em_dividend_yield",
        value: 2.5,
        unit: "percent",
        sanadLevel: 2,
        sourceUrl: "https://www.msci.com",
        sourceNameEn: "MSCI",
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

type IndicatorResult = {
  value: number;
  sanadLevel: number;
  sourceUrl: string;
  sourceNameEn: string;
};

/**
 * Fetch investment indicators grouped by asset class.
 * Useful for the investment simulator to hydrate defaults per category.
 */
export const getInvestmentIndicatorsByClass = query({
  args: {},
  handler: async (ctx) => {
    async function fetch(
      indicator: string
    ): Promise<IndicatorResult | null> {
      const record = await ctx.db
        .query("economicIndicators")
        .withIndex("by_indicator_and_date", (q) =>
          q.eq("indicator", indicator)
        )
        .order("desc")
        .first();
      if (!record) return null;
      return {
        value: record.value,
        sanadLevel: record.sanadLevel,
        sourceUrl: record.sourceUrl ?? "",
        sourceNameEn: record.sourceNameEn ?? "",
      };
    }

    const [
      egx30,
      banque_misr_cd_1yr,
      banque_misr_cd_3yr,
      nbe_cd_1yr,
      nbe_cd_3yr,
      cib_cd_1yr,
      cib_cd_floating,
      egypt_savings_cert_1yr,
      egypt_savings_cert_3yr,
      egypt_savings_cert_5yr,
      egypt_tbill_rate,
      egypt_real_estate_return,
      gold_annual_return,
      sp500_annual_return,
      msci_em_return,
      egx30_dividend_yield,
      egypt_real_estate_rental_yield,
      sp500_dividend_yield,
      msci_em_dividend_yield,
    ] = await Promise.all([
      fetch("egx30_annual_return"),
      fetch("banque_misr_cd_1yr"),
      fetch("banque_misr_cd_3yr"),
      fetch("nbe_cd_1yr"),
      fetch("nbe_cd_3yr"),
      fetch("cib_cd_1yr"),
      fetch("cib_cd_floating"),
      fetch("egypt_savings_cert_1yr"),
      fetch("egypt_savings_cert_3yr"),
      fetch("egypt_savings_cert_5yr"),
      fetch("egypt_tbill_rate"),
      fetch("egypt_real_estate_return"),
      fetch("gold_annual_return"),
      fetch("sp500_annual_return"),
      fetch("msci_em_return"),
      fetch("egx30_dividend_yield"),
      fetch("egypt_real_estate_rental_yield"),
      fetch("sp500_dividend_yield"),
      fetch("msci_em_dividend_yield"),
    ]);

    return {
      egyptianStocks: { egx30, egx30_dividend_yield },
      bankCDs: {
        banque_misr_cd_1yr,
        banque_misr_cd_3yr,
        nbe_cd_1yr,
        nbe_cd_3yr,
        cib_cd_1yr,
        cib_cd_floating,
      },
      govCerts: {
        egypt_savings_cert_1yr,
        egypt_savings_cert_3yr,
        egypt_savings_cert_5yr,
        egypt_tbill_rate,
      },
      realEstate: { egypt_real_estate_return, egypt_real_estate_rental_yield },
      gold: { gold_annual_return },
      international: {
        sp500_annual_return,
        msci_em_return,
        sp500_dividend_yield,
        msci_em_dividend_yield,
      },
    };
  },
});
