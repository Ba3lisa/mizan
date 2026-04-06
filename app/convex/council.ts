import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ─── SOURCE CLASSIFICATION ──────────────────────────────────────────────────

const categoryValidator = v.union(
  v.literal("government"),
  v.literal("parliament"),
  v.literal("constitution"),
  v.literal("budget"),
  v.literal("debt"),
  v.literal("elections")
);

const sourceTypeValidator = v.union(
  v.literal("gov_eg"),
  v.literal("international_org"),
  v.literal("media"),
  v.literal("other")
);

// ─── INTERNAL MUTATIONS ─────────────────────────────────────────────────────

export const createCouncilSession = internalMutation({
  args: {
    triggerType: v.union(
      v.literal("github_issue"),
      v.literal("data_refresh"),
      v.literal("manual")
    ),
    triggerRef: v.string(),
    category: categoryValidator,
    tableName: v.string(),
    fieldName: v.optional(v.string()),
    proposedValue: v.optional(v.string()),
    currentValue: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    sourceType: sourceTypeValidator,
  },
  handler: async (ctx, args) => {
    const sessionId = await ctx.db.insert("councilSessions", {
      ...args,
      status: "pending" as const,
      createdAt: Date.now(),
    });
    return sessionId;
  },
});

export const submitVote = internalMutation({
  args: {
    sessionId: v.id("councilSessions"),
    model: v.string(),
    provider: v.string(),
    vote: v.union(
      v.literal("approve"),
      v.literal("reject"),
      v.literal("abstain")
    ),
    confidence: v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    reasoning: v.string(),
    sourceVerified: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Cap reasoning to 500 chars to save storage
    const reasoning = args.reasoning.slice(0, 500);
    await ctx.db.insert("councilVotes", {
      sessionId: args.sessionId,
      model: args.model,
      provider: args.provider,
      vote: args.vote,
      confidence: args.confidence,
      reasoning,
      sourceVerified: args.sourceVerified,
      votedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Tallies votes and resolves a council session.
 *
 * Decision matrix:
 * | Source Type       | All Approve              | Any Reject    | Mixed         |
 * |-------------------|--------------------------|---------------|---------------|
 * | gov_eg            | Auto-approve, high conf  | Human review  | Human review  |
 * | international_org | Auto-approve, medium conf| Human review  | Human review  |
 * | media             | Approve as "estimated"   | Reject        | Human review  |
 * | other             | Human review always      | Reject        | Reject        |
 */
export const resolveSession = internalMutation({
  args: { sessionId: v.id("councilSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.status !== "pending") return null;

    const votes = await ctx.db
      .query("councilVotes")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    if (votes.length === 0) {
      await ctx.db.patch(args.sessionId, {
        status: "needs_human_review" as const,
        resolvedAt: Date.now(),
        resolvedBy: "council",
      });
      return null;
    }

    const approveCount = votes.filter((v) => v.vote === "approve").length;
    const rejectCount = votes.filter((v) => v.vote === "reject").length;
    const allApprove = approveCount === votes.length;
    const anyReject = rejectCount > 0;

    type SessionStatus = "approved" | "rejected" | "needs_human_review";
    type Confidence = "high" | "medium" | "low";

    let status: SessionStatus;
    let finalConfidence: Confidence;

    switch (session.sourceType) {
      case "gov_eg":
        if (allApprove) {
          status = "approved";
          finalConfidence = "high";
        } else {
          status = "needs_human_review";
          finalConfidence = "medium";
        }
        break;

      case "international_org":
        if (allApprove) {
          status = "approved";
          finalConfidence = "medium";
        } else {
          status = "needs_human_review";
          finalConfidence = "medium";
        }
        break;

      case "media":
        if (allApprove) {
          status = "approved";
          finalConfidence = "low"; // marked as "estimated"
        } else if (anyReject) {
          status = "rejected";
          finalConfidence = "low";
        } else {
          status = "needs_human_review";
          finalConfidence = "low";
        }
        break;

      case "other":
      default:
        if (anyReject) {
          status = "rejected";
          finalConfidence = "low";
        } else {
          // Even if all approve, "other" sources always need human review
          status = "needs_human_review";
          finalConfidence = "low";
        }
        break;
    }

    await ctx.db.patch(args.sessionId, {
      status,
      finalConfidence,
      resolvedAt: Date.now(),
      resolvedBy: "council",
    });

    return { status, finalConfidence };
  },
});

// ─── PUBLIC QUERIES (for transparency page) ─────────────────────────────────

export const getRecentSessions = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const sessions = await ctx.db
      .query("councilSessions")
      .withIndex("by_createdAt")
      .order("desc")
      .take(limit);

    // Attach vote counts
    const result = [];
    for (const session of sessions) {
      const votes = await ctx.db
        .query("councilVotes")
        .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
        .collect();

      result.push({
        ...session,
        voteCount: votes.length,
        approveCount: votes.filter((v) => v.vote === "approve").length,
        rejectCount: votes.filter((v) => v.vote === "reject").length,
        abstainCount: votes.filter((v) => v.vote === "abstain").length,
      });
    }
    return result;
  },
});

export const getSessionDetails = query({
  args: { sessionId: v.id("councilSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    const votes = await ctx.db
      .query("councilVotes")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    return { ...session, votes };
  },
});
