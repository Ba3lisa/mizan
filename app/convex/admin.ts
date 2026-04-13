import { mutation, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";

const officialRoleValidator = v.union(
  v.literal("president"),
  v.literal("prime_minister"),
  v.literal("minister"),
  v.literal("deputy_minister"),
  v.literal("governor"),
  v.literal("mp"),
  v.literal("senator"),
  v.literal("speaker"),
  v.literal("other")
);

function roundBudgetPct(value: number): number {
  return Math.round(value * 10) / 10;
}

async function reconcileFiscalYearBudgetState(
  ctx: MutationCtx,
  fiscalYearId: Id<"fiscalYears">
) {
  const fiscalYear = await ctx.db.get(fiscalYearId);
  if (!fiscalYear) return;

  const items = await ctx.db
    .query("budgetItems")
    .withIndex("by_fiscalYearId_and_category", (q) => q.eq("fiscalYearId", fiscalYearId))
    .collect();

  if (items.length === 0) return;

  const topLevel = items.filter((item) => !item.parentItemId);
  const totalRevenue = topLevel
    .filter((item) => item.category === "revenue")
    .reduce((sum, item) => sum + item.amount, 0);
  const totalExpenditure = topLevel
    .filter((item) => item.category === "expenditure")
    .reduce((sum, item) => sum + item.amount, 0);
  const deficit = totalRevenue - totalExpenditure;
  const gdp = fiscalYear.gdp ?? 0;

  const fiscalPatch: Partial<typeof fiscalYear> = {};
  if (fiscalYear.totalRevenue !== totalRevenue) fiscalPatch.totalRevenue = totalRevenue;
  if (fiscalYear.totalExpenditure !== totalExpenditure) fiscalPatch.totalExpenditure = totalExpenditure;
  if (fiscalYear.deficit !== deficit) fiscalPatch.deficit = deficit;
  if (Object.keys(fiscalPatch).length > 0) {
    await ctx.db.patch(fiscalYearId, fiscalPatch);
  }

  for (const item of items) {
    const categoryTotal = item.category === "revenue" ? totalRevenue : totalExpenditure;
    const nextPctOfTotal = categoryTotal > 0
      ? roundBudgetPct((item.amount / categoryTotal) * 100)
      : undefined;
    const nextPctOfGdp = gdp > 0
      ? roundBudgetPct((item.amount / gdp) * 100)
      : undefined;

    const patch: Partial<typeof item> = {};
    if (item.percentageOfTotal !== nextPctOfTotal) patch.percentageOfTotal = nextPctOfTotal;
    if (item.percentageOfGdp !== nextPctOfGdp) patch.percentageOfGdp = nextPctOfGdp;

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(item._id, patch);
    }
  }
}

export const upsertOfficial = mutation({
  args: {
    officialId: v.optional(v.id("officials")),
    nameAr: v.string(),
    nameEn: v.string(),
    titleAr: v.string(),
    titleEn: v.string(),
    role: officialRoleValidator,
    photoUrl: v.optional(v.string()),
    appointmentDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    isCurrent: v.boolean(),
    bioAr: v.optional(v.string()),
    bioEn: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    sanadLevel: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { officialId, ...fields } = args;
    const withSanad = { ...fields, sanadLevel: fields.sanadLevel ?? 4 };
    if (officialId) {
      await ctx.db.patch(officialId, withSanad);
      return officialId;
    }
    return await ctx.db.insert("officials", withSanad);
  },
});

export const upsertMinistry = mutation({
  args: {
    ministryId: v.optional(v.id("ministries")),
    nameAr: v.string(),
    nameEn: v.string(),
    mandateAr: v.optional(v.string()),
    mandateEn: v.optional(v.string()),
    currentMinisterId: v.optional(v.id("officials")),
    parentMinistryId: v.optional(v.id("ministries")),
    websiteUrl: v.optional(v.string()),
    employeeCount: v.optional(v.number()),
    establishedYear: v.optional(v.number()),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const { ministryId, ...fields } = args;
    if (ministryId) {
      await ctx.db.patch(ministryId, fields);
      return ministryId;
    }
    return await ctx.db.insert("ministries", fields);
  },
});

export const upsertGovernorate = mutation({
  args: {
    governorateId: v.optional(v.id("governorates")),
    nameAr: v.string(),
    nameEn: v.string(),
    capitalAr: v.string(),
    capitalEn: v.string(),
    currentGovernorId: v.optional(v.id("officials")),
    population: v.optional(v.number()),
    area: v.optional(v.number()),
    isCity: v.boolean(),
    geoJsonId: v.optional(v.string()),
    regionAr: v.optional(v.string()),
    regionEn: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { governorateId, ...fields } = args;
    if (governorateId) {
      await ctx.db.patch(governorateId, fields);
      return governorateId;
    }
    return await ctx.db.insert("governorates", fields);
  },
});

export const addParliamentMember = mutation({
  args: {
    officialId: v.id("officials"),
    chamber: v.union(v.literal("house"), v.literal("senate")),
    partyId: v.optional(v.id("parties")),
    governorateId: v.optional(v.id("governorates")),
    electionMethod: v.union(
      v.literal("constituency"),
      v.literal("party_list"),
      v.literal("presidential_appointment")
    ),
    constituency: v.optional(v.string()),
    termStart: v.string(),
    termEnd: v.optional(v.string()),
    isCurrent: v.boolean(),
    seatNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("parliamentMembers", args);
  },
});

export const addConstitutionArticle = mutation({
  args: {
    articleNumber: v.number(),
    partId: v.id("constitutionParts"),
    textAr: v.string(),
    textEn: v.string(),
    summaryAr: v.optional(v.string()),
    summaryEn: v.optional(v.string()),
    wasAmended2019: v.boolean(),
    originalTextAr: v.optional(v.string()),
    originalTextEn: v.optional(v.string()),
    keywords: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("constitutionArticles", args);
  },
});

export const addBudgetItem = mutation({
  args: {
    fiscalYearId: v.id("fiscalYears"),
    category: v.union(v.literal("revenue"), v.literal("expenditure")),
    sectorAr: v.string(),
    sectorEn: v.string(),
    parentItemId: v.optional(v.id("budgetItems")),
    amount: v.number(),
    percentageOfTotal: v.optional(v.number()),
    percentageOfGdp: v.optional(v.number()),
    sourceUrl: v.optional(v.string()),
    sanadLevel: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const budgetItemId = await ctx.db.insert("budgetItems", { ...args, sanadLevel: args.sanadLevel ?? 1 });
    await reconcileFiscalYearBudgetState(ctx, args.fiscalYearId);
    return budgetItemId;
  },
});

export const addDebtRecord = mutation({
  args: {
    date: v.string(),
    totalExternalDebt: v.optional(v.number()),
    totalDomesticDebt: v.optional(v.number()),
    debtToGdpRatio: v.optional(v.number()),
    foreignReserves: v.optional(v.number()),
    sourceUrl: v.optional(v.string()),
    sanadLevel: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("debtRecords", { ...args, sanadLevel: args.sanadLevel ?? 2 });
  },
});
