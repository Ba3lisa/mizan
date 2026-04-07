import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ─── PUBLIC QUERIES ──────────────────────────────────────────────────────────

export const getActivePoll = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    // Find the active poll that hasn't expired
    const poll = await ctx.db
      .query("polls")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .order("desc")
      .first();

    if (!poll) return null;

    // If expired, return it but mark as expired for the client
    return {
      _id: poll._id,
      questionAr: poll.questionAr,
      questionEn: poll.questionEn,
      options: poll.options,
      category: poll.category,
      contextAr: poll.contextAr,
      contextEn: poll.contextEn,
      totalVotes: poll.totalVotes,
      expiresAt: poll.expiresAt,
      createdAt: poll.createdAt,
      isExpired: now >= poll.expiresAt,
    };
  },
});

export const getRecentPolls = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("polls")
      .withIndex("by_createdAt")
      .order("desc")
      .take(5);
  },
});

export const checkIfVoted = query({
  args: {
    pollId: v.id("polls"),
    visitorHash: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pollVotes")
      .withIndex("by_pollId_and_visitorHash", (q) =>
        q.eq("pollId", args.pollId).eq("visitorHash", args.visitorHash)
      )
      .first();
    return existing ? { voted: true, optionIndex: existing.optionIndex } : { voted: false, optionIndex: null };
  },
});

// ─── PUBLIC MUTATIONS ────────────────────────────────────────────────────────

export const submitVote = mutation({
  args: {
    pollId: v.id("polls"),
    optionIndex: v.number(),
    visitorHash: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if already voted
    const existing = await ctx.db
      .query("pollVotes")
      .withIndex("by_pollId_and_visitorHash", (q) =>
        q.eq("pollId", args.pollId).eq("visitorHash", args.visitorHash)
      )
      .first();

    if (existing) {
      return { success: false, reason: "already_voted" };
    }

    // Get the poll
    const poll = await ctx.db.get(args.pollId);
    if (!poll) {
      return { success: false, reason: "poll_not_found" };
    }
    if (!poll.isActive || Date.now() >= poll.expiresAt) {
      return { success: false, reason: "poll_expired" };
    }
    if (args.optionIndex < 0 || args.optionIndex >= poll.options.length) {
      return { success: false, reason: "invalid_option" };
    }

    // Record the vote
    await ctx.db.insert("pollVotes", {
      pollId: args.pollId,
      optionIndex: args.optionIndex,
      visitorHash: args.visitorHash,
      votedAt: Date.now(),
    });

    // Update poll totals (increment option votes + total)
    const updatedOptions = poll.options.map((opt, i) =>
      i === args.optionIndex ? { ...opt, votes: opt.votes + 1 } : opt
    );
    await ctx.db.patch(args.pollId, {
      options: updatedOptions,
      totalVotes: poll.totalVotes + 1,
    });

    return { success: true, reason: null };
  },
});

// ─── INTERNAL MUTATIONS (used by poll agent) ─────────────────────────────────

export const createPoll = internalMutation({
  args: {
    questionAr: v.string(),
    questionEn: v.string(),
    options: v.array(v.object({
      labelAr: v.string(),
      labelEn: v.string(),
    })),
    category: v.union(
      v.literal("economy"),
      v.literal("budget"),
      v.literal("debt"),
      v.literal("parliament"),
      v.literal("government"),
      v.literal("constitution"),
      v.literal("general")
    ),
    contextAr: v.optional(v.string()),
    contextEn: v.optional(v.string()),
    dataNuggets: v.optional(v.array(v.object({
      labelAr: v.string(),
      labelEn: v.string(),
      value: v.string(),
      linkPath: v.optional(v.string()),
    }))),
  },
  handler: async (ctx, args) => {
    // Deactivate any currently active polls
    const activePolls = await ctx.db
      .query("polls")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    for (const poll of activePolls) {
      await ctx.db.patch(poll._id, { isActive: false });
    }

    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours from now

    // Create new poll with zero votes
    const pollId = await ctx.db.insert("polls", {
      questionAr: args.questionAr,
      questionEn: args.questionEn,
      options: args.options.map((opt) => ({
        labelAr: opt.labelAr,
        labelEn: opt.labelEn,
        votes: 0,
      })),
      category: args.category,
      contextAr: args.contextAr,
      contextEn: args.contextEn,
      dataNuggets: args.dataNuggets,
      totalVotes: 0,
      isActive: true,
      expiresAt,
      createdAt: now,
    });

    return pollId;
  },
});
