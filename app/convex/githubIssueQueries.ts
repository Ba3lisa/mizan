import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ─── QUERIES (used by GitHub agent for dedup and spam checks) ───────────────

export const getByIssueNumber = internalQuery({
  args: { issueNumber: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("githubIssueProcessing")
      .withIndex("by_issueNumber", (q) => q.eq("issueNumber", args.issueNumber))
      .collect();
  },
});

export const getByAuthor = internalQuery({
  args: { authorUsername: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("githubIssueProcessing")
      .withIndex("by_authorUsername", (q) =>
        q.eq("authorUsername", args.authorUsername)
      )
      .collect();
    // Only count non-terminal issues for spam check
    return all.filter(
      (i) => !["applied", "rejected", "spam"].includes(i.status)
    );
  },
});

// ─── MUTATIONS (used by GitHub agent to track issue lifecycle) ──────────────

export const recordIssue = internalMutation({
  args: {
    issueNumber: v.number(),
    issueType: v.union(
      v.literal("data"),
      v.literal("ui"),
      v.literal("unknown")
    ),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("council_review"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("applied"),
      v.literal("spam")
    ),
    authorUsername: v.string(),
    authorAccountAge: v.optional(v.number()),
    batchId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("githubIssueProcessing", {
      issueNumber: args.issueNumber,
      issueType: args.issueType,
      status: args.status,
      authorUsername: args.authorUsername,
      authorAccountAge: args.authorAccountAge,
      batchId: args.batchId,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const updateIssueStatus = internalMutation({
  args: {
    issueNumber: v.number(),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("council_review"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("applied"),
      v.literal("spam")
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("githubIssueProcessing")
      .withIndex("by_issueNumber", (q) => q.eq("issueNumber", args.issueNumber))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        processedAt: Date.now(),
      });
    }
    return null;
  },
});

export const updateIssueParsedData = internalMutation({
  args: {
    issueNumber: v.number(),
    parsedCategory: v.optional(v.string()),
    parsedDataPoint: v.optional(v.string()),
    parsedSourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("githubIssueProcessing")
      .withIndex("by_issueNumber", (q) => q.eq("issueNumber", args.issueNumber))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        parsedCategory: args.parsedCategory,
        parsedDataPoint: args.parsedDataPoint,
        parsedSourceUrl: args.parsedSourceUrl,
      });
    }
    return null;
  },
});

export const linkCouncilSession = internalMutation({
  args: {
    issueNumber: v.number(),
    councilSessionId: v.id("councilSessions"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("githubIssueProcessing")
      .withIndex("by_issueNumber", (q) => q.eq("issueNumber", args.issueNumber))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        councilSessionId: args.councilSessionId,
        status: "council_review" as const,
      });
    }
    return null;
  },
});
