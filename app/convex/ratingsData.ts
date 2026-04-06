import { internalMutation } from "./_generated/server";

const INITIAL_RATINGS = [
  {
    agency: "Fitch",
    rating: "B-",
    outlook: "Stable",
    effectiveDate: "2024-01-01",
    sourceUrl: "https://www.fitchratings.com/entity/egypt-80442220",
  },
  {
    agency: "Moody's",
    rating: "Caa1",
    outlook: "Positive",
    effectiveDate: "2024-01-01",
    sourceUrl:
      "https://www.moodys.com/credit-ratings/Egypt-Government-of-credit-rating-186500",
  },
  {
    agency: "S&P",
    rating: "B-",
    outlook: "Stable",
    effectiveDate: "2024-01-01",
    sourceUrl:
      "https://disclosure.spglobal.com/ratings/en/regulatory/search",
  },
] as const;

/**
 * Seeds sovereign credit ratings if the table is empty.
 * Idempotent -- skips if any ratings already exist.
 * Called as part of the reference data pipeline.
 */
export const ensureRatings = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("sovereignRatings").first();
    if (existing !== null) return 0;

    let inserted = 0;
    for (const r of INITIAL_RATINGS) {
      await ctx.db.insert("sovereignRatings", {
        agency: r.agency,
        rating: r.rating,
        outlook: r.outlook,
        effectiveDate: r.effectiveDate,
        sourceUrl: r.sourceUrl,
      });
      inserted++;
    }
    return inserted;
  },
});
