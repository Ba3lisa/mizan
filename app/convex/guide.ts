/**
 * Guide chat — queries and mutations (default Convex runtime).
 * Actions are in guideActions.ts ("use node").
 */

import { saveMessage, listUIMessages, vStreamArgs } from "@convex-dev/agent";
import { components, internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

// ─── Send Message (mutation + scheduled action) ─────────────────────────────

export const sendMessage = mutation({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    lang: v.optional(v.string()),
    currentPage: v.optional(v.string()),
  },
  handler: async (ctx, { threadId, prompt, lang, currentPage }) => {
    const { messageId } = await saveMessage(ctx, components.agent, {
      threadId,
      prompt,
    });
    await ctx.scheduler.runAfter(0, internal.guideActions.generateResponse, {
      threadId,
      promptMessageId: messageId,
      lang: lang ?? "en",
      currentPage: currentPage ?? "/",
    });
    return messageId;
  },
});

// ─── List Messages (with pagination) ────────────────────────────────────────

export const listMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: v.optional(vStreamArgs),
  },
  handler: async (ctx, args) => {
    return await listUIMessages(ctx, components.agent, args);
  },
});

// ─── Cost Check ($20/month cap) ─────────────────────────────────────────────

export const checkMonthlyCost = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const rows = await ctx.db
      .query("chatUsage")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", monthStart))
      .take(10000);

    let totalCost = 0;
    for (const row of rows) totalCost += row.costUsd;

    return {
      totalCostUsd: totalCost,
      isOverBudget: totalCost >= 20,
      budgetUsd: 20,
    };
  },
});
