import { query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";


export const listMinistriesSorted = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("ministries")
      .withIndex("by_sortOrder")
      .order("asc")
      .collect();
  },
});

export const getMinistry = query({
  args: { ministryId: v.id("ministries") },
  handler: async (ctx, args) => {
    const ministry = await ctx.db.get(args.ministryId);
    if (!ministry) return null;

    let minister: Doc<"officials"> | null = null;
    if (ministry.currentMinisterId) {
      minister = await ctx.db.get(ministry.currentMinisterId);
    }

    return { ...ministry, minister };
  },
});

export const listGovernorates = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("governorates").collect();
  },
});

export const getGovernorate = query({
  args: { governorateId: v.id("governorates") },
  handler: async (ctx, args) => {
    const governorate = await ctx.db.get(args.governorateId);
    if (!governorate) return null;

    let governor: Doc<"officials"> | null = null;
    if (governorate.currentGovernorId) {
      governor = await ctx.db.get(governorate.currentGovernorId);
    }

    return { ...governorate, governor };
  },
});

export const listOfficialsByRole = query({
  args: {
    role: v.union(
      v.literal("president"),
      v.literal("prime_minister"),
      v.literal("minister"),
      v.literal("deputy_minister"),
      v.literal("governor"),
      v.literal("mp"),
      v.literal("senator"),
      v.literal("speaker"),
      v.literal("other")
    ),
    isCurrent: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("officials")
      .withIndex("by_role_and_isCurrent", (q) =>
        q.eq("role", args.role).eq("isCurrent", args.isCurrent)
      )
      .collect();
  },
});

export const getOfficial = query({
  args: { officialId: v.id("officials") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.officialId);
  },
});

export const getGovernmentHierarchy = query({
  args: {},
  handler: async (ctx) => {
    const president = await ctx.db
      .query("officials")
      .withIndex("by_role_and_isCurrent", (q) =>
        q.eq("role", "president").eq("isCurrent", true)
      )
      .first();

    const primeMinister = await ctx.db
      .query("officials")
      .withIndex("by_role_and_isCurrent", (q) =>
        q.eq("role", "prime_minister").eq("isCurrent", true)
      )
      .first();

    const ministers = await ctx.db
      .query("officials")
      .withIndex("by_role_and_isCurrent", (q) =>
        q.eq("role", "minister").eq("isCurrent", true)
      )
      .collect();

    const ministries = await ctx.db
      .query("ministries")
      .withIndex("by_sortOrder")
      .order("asc")
      .collect();

    // Join each ministry with its minister details
    const ministriesWithMinisters = await Promise.all(
      ministries.map(async (ministry) => {
        let minister: Doc<"officials"> | null = null;
        if (ministry.currentMinisterId) {
          minister = await ctx.db.get(ministry.currentMinisterId);
        }
        return { ...ministry, minister };
      })
    );

    return {
      president,
      primeMinister,
      ministers,
      ministries: ministriesWithMinisters,
    };
  },
});
