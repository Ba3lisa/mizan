import { internalMutation } from "./_generated/server";

const TAX_SOURCE_URL = "https://taxsummaries.pwc.com/egypt/individual/taxes-on-personal-income";
const LAW_REFERENCE = "Income Tax Law No. 91/2005, amended by Law No. 7/2024";

/**
 * Ensures current tax bracket data exists. Idempotent -- skips if already populated.
 * Called as part of the reference data pipeline.
 */
export const ensureTaxBrackets = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("taxBrackets")
      .withIndex("by_year", (q) => q.eq("year", "2024"))
      .collect();

    if (existing.length > 0) return 0;

    // Egyptian income tax brackets per Law 7/2024
    // Note: 20,000 EGP annual personal exemption applies before these brackets
    const brackets = [
      { fromAmount: 0, toAmount: 40000, rate: 0, sortOrder: 1 },
      { fromAmount: 40001, toAmount: 55000, rate: 0.10, sortOrder: 2 },
      { fromAmount: 55001, toAmount: 70000, rate: 0.15, sortOrder: 3 },
      { fromAmount: 70001, toAmount: 200000, rate: 0.20, sortOrder: 4 },
      { fromAmount: 200001, toAmount: 400000, rate: 0.225, sortOrder: 5 },
      { fromAmount: 400001, toAmount: 1200000, rate: 0.25, sortOrder: 6 },
      { fromAmount: 1200001, rate: 0.275, sortOrder: 7 },
    ];

    for (const bracket of brackets) {
      await ctx.db.insert("taxBrackets", {
        year: "2024",
        fromAmount: bracket.fromAmount,
        toAmount: bracket.toAmount,
        rate: bracket.rate,
        personalExemption: 20000,
        lawReference: LAW_REFERENCE,
        sourceUrl: TAX_SOURCE_URL,
        sortOrder: bracket.sortOrder,
        sanadLevel: 1,
      });
    }

    return brackets.length;
  },
});
