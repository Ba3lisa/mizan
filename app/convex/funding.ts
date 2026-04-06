import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ─── PUBLIC QUERIES ─────────────────────────────────────────────────────────

export const getFundingSummary = query({
  args: {},
  handler: async (ctx) => {
    const summaries = await ctx.db
      .query("fundingSummary")
      .withIndex("by_month")
      .order("desc")
      .take(12);
    return summaries;
  },
});

export const getRecentDonations = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const donations = await ctx.db
      .query("fundingDonations")
      .withIndex("by_createdAt")
      .order("desc")
      .take(limit);

    // Respect anonymity — strip donor info for anonymous donations
    return donations.map((d) => ({
      _id: d._id,
      _creationTime: d._creationTime,
      donorName: d.isAnonymous ? null : d.donorName,
      isAnonymous: d.isAnonymous,
      amountUsd: d.amountUsd,
      currency: d.currency,
      paymentProvider: d.paymentProvider,
      status: d.status,
      messageEn: d.isAnonymous ? null : d.messageEn,
      messageAr: d.isAnonymous ? null : d.messageAr,
      createdAt: d.createdAt,
    }));
  },
});

export const getAllocationBreakdown = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const allAllocations = await ctx.db
      .query("fundingAllocations")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();

    // Filter by date range if provided
    const filtered = allAllocations.filter((a) => {
      if (args.startDate && a.periodStart < args.startDate) return false;
      if (args.endDate && a.periodEnd > args.endDate) return false;
      return true;
    });

    // Group by category
    const breakdown: Record<
      string,
      { totalUsd: number; items: typeof filtered }
    > = {};
    for (const a of filtered) {
      if (!breakdown[a.category]) {
        breakdown[a.category] = { totalUsd: 0, items: [] };
      }
      breakdown[a.category].totalUsd += a.amountUsd;
      breakdown[a.category].items.push(a);
    }

    return breakdown;
  },
});

export const getFundingTimeline = query({
  args: { months: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.months ?? 12;
    const summaries = await ctx.db
      .query("fundingSummary")
      .withIndex("by_month")
      .order("desc")
      .take(limit);
    return summaries.reverse(); // chronological order for charts
  },
});

// ─── INTERNAL MUTATIONS ─────────────────────────────────────────────────────

export const recordDonation = internalMutation({
  args: {
    donorName: v.optional(v.string()),
    isAnonymous: v.boolean(),
    amount: v.number(),
    currency: v.string(),
    amountUsd: v.number(),
    paymentProvider: v.union(
      v.literal("github_sponsors"),
      v.literal("stripe"),
      v.literal("other")
    ),
    externalTransactionId: v.optional(v.string()),
    messageEn: v.optional(v.string()),
    messageAr: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("fundingDonations", {
      ...args,
      status: "confirmed" as const,
      confirmedAt: Date.now(),
      createdAt: Date.now(),
    });
    return null;
  },
});

export const recordAllocation = internalMutation({
  args: {
    categoryEn: v.string(),
    categoryAr: v.string(),
    category: v.union(
      v.literal("infrastructure"),
      v.literal("ai_api_costs"),
      v.literal("development"),
      v.literal("data_acquisition"),
      v.literal("other")
    ),
    amount: v.number(),
    currency: v.string(),
    amountUsd: v.number(),
    descriptionEn: v.string(),
    descriptionAr: v.string(),
    receiptUrl: v.optional(v.string()),
    vendor: v.optional(v.string()),
    isRecurring: v.boolean(),
    periodStart: v.string(),
    periodEnd: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("fundingAllocations", {
      ...args,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const updateMonthlySummary = internalMutation({
  args: { month: v.string() },
  handler: async (ctx, args) => {
    // Sum donations for the month
    const allDonations = await ctx.db
      .query("fundingDonations")
      .withIndex("by_status")
      .collect();
    const monthDonations = allDonations.filter(
      (d) =>
        d.status === "confirmed" &&
        new Date(d.createdAt).toISOString().slice(0, 7) === args.month
    );
    const totalDonationsUsd = monthDonations.reduce(
      (sum, d) => sum + d.amountUsd,
      0
    );

    // Sum allocations for the month
    const allAllocations = await ctx.db
      .query("fundingAllocations")
      .withIndex("by_createdAt")
      .collect();
    const monthAllocations = allAllocations.filter(
      (a) => a.periodStart.slice(0, 7) <= args.month && a.periodEnd.slice(0, 7) >= args.month
    );

    const byCat = (cat: string) =>
      monthAllocations
        .filter((a) => a.category === cat)
        .reduce((sum, a) => sum + a.amountUsd, 0);

    const infrastructureCostUsd = byCat("infrastructure");
    const aiApiCostUsd = byCat("ai_api_costs");
    const developmentCostUsd = byCat("development");
    const dataCostUsd = byCat("data_acquisition");
    const otherCostUsd = byCat("other");
    const totalAllocatedUsd =
      infrastructureCostUsd +
      aiApiCostUsd +
      developmentCostUsd +
      dataCostUsd +
      otherCostUsd;

    // Upsert the summary
    const existing = await ctx.db
      .query("fundingSummary")
      .withIndex("by_month", (q) => q.eq("month", args.month))
      .unique();

    const data = {
      month: args.month,
      totalDonationsUsd,
      totalAllocatedUsd,
      balanceUsd: totalDonationsUsd - totalAllocatedUsd,
      infrastructureCostUsd,
      aiApiCostUsd,
      developmentCostUsd,
      dataCostUsd,
      otherCostUsd,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("fundingSummary", data);
    }
    return null;
  },
});
