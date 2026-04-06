import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Returns all sovereign credit ratings, sorted by agency name ascending.
 */
export const listRatings = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("sovereignRatings")
      .withIndex("by_agency")
      .order("asc")
      .collect();
  },
});

/**
 * Upserts a sovereign credit rating by agency name.
 * Creates a new record if none exists; patches fields if the agency already has an entry.
 * Returns 1 if a write occurred, 0 if unchanged.
 */
export const upsertRating = internalMutation({
  args: {
    agency: v.string(),
    rating: v.string(),
    outlook: v.string(),
    effectiveDate: v.string(),
    previousRating: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("sovereignRatings")
      .withIndex("by_agency", (q) => q.eq("agency", args.agency))
      .unique();

    if (!existing) {
      await ctx.db.insert("sovereignRatings", {
        agency: args.agency,
        rating: args.rating,
        outlook: args.outlook,
        effectiveDate: args.effectiveDate,
        previousRating: args.previousRating,
        sourceUrl: args.sourceUrl,
      });
      return 1;
    }

    // Check if anything changed
    if (
      existing.rating === args.rating &&
      existing.outlook === args.outlook &&
      existing.effectiveDate === args.effectiveDate
    ) {
      return 0;
    }

    await ctx.db.patch(existing._id, {
      rating: args.rating,
      outlook: args.outlook,
      effectiveDate: args.effectiveDate,
      previousRating: args.previousRating ?? existing.previousRating,
      sourceUrl: args.sourceUrl ?? existing.sourceUrl,
    });
    return 1;
  },
});
