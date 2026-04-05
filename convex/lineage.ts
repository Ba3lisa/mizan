import { query } from "./_generated/server";
import { v } from "convex/values";

export const getLineageForTable = query({
  args: {
    tableName: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dataLineage")
      .withIndex("by_tableName", (q) => q.eq("tableName", args.tableName))
      .order("desc")
      .take(200);
  },
});

export const getLineageForRecord = query({
  args: {
    tableName: v.string(),
    recordId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dataLineage")
      .withIndex("by_tableName_and_recordId", (q) =>
        q.eq("tableName", args.tableName).eq("recordId", args.recordId)
      )
      .order("desc")
      .take(200);
  },
});

export const getRecentLineage = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    return await ctx.db
      .query("dataLineage")
      .withIndex("by_lastUpdated")
      .order("desc")
      .take(limit);
  },
});

export const listResearchReports = query({
  args: {
    category: v.optional(
      v.union(
        v.literal("government"),
        v.literal("parliament"),
        v.literal("constitution"),
        v.literal("budget"),
        v.literal("debt"),
        v.literal("elections"),
        v.literal("economy")
      )
    ),
  },
  handler: async (ctx, args) => {
    if (args.category !== undefined) {
      return await ctx.db
        .query("aiResearchReports")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .order("desc")
        .take(100);
    }
    return await ctx.db
      .query("aiResearchReports")
      .withIndex("by_generatedAt")
      .order("desc")
      .take(100);
  },
});

export const getResearchReport = query({
  args: {
    reportId: v.id("aiResearchReports"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.reportId);
  },
});
