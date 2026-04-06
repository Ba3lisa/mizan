import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Regional debt-to-GDP comparison is stored in the dataSources table
// or we can use a dedicated approach. For now, use an internalMutation
// that the pipeline can call, and a public query for the UI.

// We'll store regional comparison data in a lightweight format
// using the existing dataLineage table pattern (table + field + value)

/**
 * Get regional debt-to-GDP comparison data.
 * Returns hardcoded fallbacks merged with any pipeline-updated values.
 */
export const getRegionalDebtComparison = query({
  args: {},
  handler: async (ctx) => {
    // Check if we have pipeline-updated regional data
    const lineage = await ctx.db
      .query("dataLineage")
      .withIndex("by_tableName", (q) => q.eq("tableName", "regionalComparison"))
      .collect();

    const liveData: Record<string, number> = {};
    for (const entry of lineage) {
      if (entry.fieldName && entry.value) {
        liveData[entry.fieldName] = parseFloat(entry.value);
      }
    }

    // Also get Egypt's live debt-to-GDP from debtRecords
    const debtRecords = await ctx.db
      .query("debtRecords")
      .withIndex("by_date")
      .order("desc")
      .take(10);
    const egyptRatio = debtRecords.find((r) => r.debtToGdpRatio != null && r.debtToGdpRatio > 0)?.debtToGdpRatio;

    return {
      Egypt: egyptRatio ?? liveData["Egypt"] ?? 89.5,
      Turkey: liveData["Turkey"] ?? 31.8,
      "Saudi Arabia": liveData["Saudi Arabia"] ?? 27.7,
      Morocco: liveData["Morocco"] ?? 62.4,
      Nigeria: liveData["Nigeria"] ?? 37.5,
      Tunisia: liveData["Tunisia"] ?? 88.6,
    };
  },
});

/**
 * Update regional comparison data from World Bank API.
 * Called by the pipeline after debt refresh.
 */
export const updateRegionalComparison = internalMutation({
  args: {
    data: v.array(v.object({
      country: v.string(),
      debtToGDP: v.number(),
    })),
    sourceUrl: v.string(),
  },
  handler: async (ctx, args) => {
    for (const entry of args.data) {
      // Upsert into dataLineage for persistence
      const existing = await ctx.db
        .query("dataLineage")
        .withIndex("by_tableName_and_fieldName", (q) =>
          q.eq("tableName", "regionalComparison").eq("fieldName", entry.country)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          value: String(entry.debtToGDP),
          lastUpdated: Date.now(),
          sourceUrl: args.sourceUrl,
          accessDate: new Date().toISOString().slice(0, 10),
        });
      } else {
        await ctx.db.insert("dataLineage", {
          tableName: "regionalComparison",
          fieldName: entry.country,
          value: String(entry.debtToGDP),
          sourceType: "direct" as const,
          sourceUrl: args.sourceUrl,
          sourceNameEn: "World Bank",
          accessDate: new Date().toISOString().slice(0, 10),
          confidence: "high" as const,
          aiVerified: false,
          lastUpdated: Date.now(),
        });
      }
    }
    return args.data.length;
  },
});
