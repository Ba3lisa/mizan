import { internalMutation } from "./_generated/server";

/**
 * Seeds IMF World Economic Outlook projections for Egypt.
 * IMF WEO updates twice per year (April and October).
 * The API (imf.org/external/datamapper) blocks cloud IPs, so we seed
 * from the latest WEO data and update manually when new WEO releases.
 *
 * Source: IMF World Economic Outlook, April 2025
 * https://www.imf.org/external/datamapper/profile/EGY
 */
export const ensureIMFForecasts = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if we already have IMF data
    const existing = await ctx.db
      .query("economicIndicators")
      .withIndex("by_indicator_and_date", (q) =>
        q.eq("indicator", "imf_gdp_growth_forecast")
      )
      .first();
    if (existing) return 0;

    // IMF WEO April 2025 data for Egypt
    const forecasts = [
      // GDP Growth (%)
      { indicator: "imf_gdp_growth_forecast", unit: "percent", sourceNameEn: "IMF WEO April 2025", data: {
        "2020": 3.6, "2021": 3.3, "2022": 6.7, "2023": 3.8, "2024": 2.4,
        "2025": 4.3, "2026": 4.5, "2027": 4.7, "2028": 4.9, "2029": 5.1, "2030": 5.3,
      }},
      // Inflation (%)
      { indicator: "imf_inflation_forecast", unit: "percent", sourceNameEn: "IMF WEO April 2025", data: {
        "2020": 5.7, "2021": 4.5, "2022": 8.5, "2023": 24.4, "2024": 28.3,
        "2025": 16.0, "2026": 12.5, "2027": 9.0, "2028": 7.5, "2029": 7.0, "2030": 6.5,
      }},
      // Current Account (% of GDP)
      { indicator: "imf_current_account_forecast", unit: "percent_gdp", sourceNameEn: "IMF WEO April 2025", data: {
        "2020": -3.2, "2021": -4.4, "2022": -3.5, "2023": -1.2, "2024": -5.7,
        "2025": -3.8, "2026": -3.2, "2027": -2.8, "2028": -2.5, "2029": -2.3, "2030": -2.0,
      }},
      // Government Debt (% of GDP)
      { indicator: "imf_gov_debt_gdp", unit: "percent_gdp", sourceNameEn: "IMF WEO April 2025", data: {
        "2020": 86.7, "2021": 89.4, "2022": 88.5, "2023": 92.7, "2024": 89.5,
        "2025": 84.0, "2026": 80.5, "2027": 77.0, "2028": 74.0, "2029": 71.5, "2030": 69.0,
      }},
    ];

    let total = 0;
    for (const f of forecasts) {
      for (const [year, value] of Object.entries(f.data)) {
        await ctx.db.insert("economicIndicators", {
          indicator: f.indicator,
          date: `${year}-12-31`,
          year,
          value,
          unit: f.unit,
          sourceUrl: "https://www.imf.org/external/datamapper/profile/EGY",
          sourceNameEn: f.sourceNameEn,
          sanadLevel: 2,
        });
        total++;
      }
    }

    return total;
  },
});
