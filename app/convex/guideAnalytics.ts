import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

export const logUsage = internalMutation({
  args: {
    userId: v.string(),
    threadId: v.string(),
    model: v.string(),
    provider: v.string(),
    promptTokens: v.number(),
    completionTokens: v.number(),
    totalTokens: v.number(),
    costUsd: v.number(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("chatUsage", args);
  },
});

/** Thread-level usage summary for analytics dashboard */
export const getThreadStats = query({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    const rows = await ctx.db
      .query("chatUsage")
      .withIndex("by_threadId", (q) => q.eq("threadId", threadId))
      .take(1000);

    return {
      messageCount: rows.length,
      totalTokens: rows.reduce((s, r) => s + r.totalTokens, 0),
      totalCostUsd: rows.reduce((s, r) => s + r.costUsd, 0),
    };
  },
});
