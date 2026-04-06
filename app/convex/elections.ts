import { query } from "./_generated/server";
import { v } from "convex/values";


export const listElections = query({
  args: {
    type: v.optional(
      v.union(
        v.literal("presidential"),
        v.literal("parliamentary_house"),
        v.literal("parliamentary_senate"),
        v.literal("referendum")
      )
    ),
  },
  handler: async (ctx, args) => {
    if (args.type !== undefined) {
      return await ctx.db
        .query("elections")
        .withIndex("by_type", (q) => q.eq("type", args.type!))
        .order("desc")
        .take(50);
    }
    return await ctx.db.query("elections").order("desc").take(50);
  },
});

export const getElection = query({
  args: {
    electionId: v.id("elections"),
  },
  handler: async (ctx, args) => {
    const election = await ctx.db.get(args.electionId);
    if (!election) {
      return null;
    }
    const results = await ctx.db
      .query("electionResults")
      .withIndex("by_electionId", (q) => q.eq("electionId", args.electionId))
      .collect();

    const resultsWithParty = await Promise.all(
      results.map(async (r) => {
        const party = r.partyId ? await ctx.db.get(r.partyId) : null;
        return { ...r, party };
      })
    );

    return { ...election, results: resultsWithParty };
  },
});

export const getElectionMap = query({
  args: {
    electionId: v.id("elections"),
  },
  handler: async (ctx, args) => {
    const election = await ctx.db.get(args.electionId);
    if (!election) {
      return null;
    }
    const governorateData = await ctx.db
      .query("governorateElectionData")
      .withIndex("by_electionId", (q) => q.eq("electionId", args.electionId))
      .collect();

    const enriched = await Promise.all(
      governorateData.map(async (gd) => {
        const governorate = await ctx.db.get(gd.governorateId);
        return { ...gd, governorate };
      })
    );

    return { election, governorateResults: enriched };
  },
});

export const listPresidentialElections = query({
  args: {},
  handler: async (ctx) => {
    const elections = await ctx.db
      .query("elections")
      .withIndex("by_type", (q) => q.eq("type", "presidential"))
      .order("desc")
      .take(20);

    return await Promise.all(
      elections.map(async (election) => {
        const results = await ctx.db
          .query("electionResults")
          .withIndex("by_electionId", (q) => q.eq("electionId", election._id))
          .collect();
        return { ...election, results };
      })
    );
  },
});

export const getGovernorateElectionHistory = query({
  args: {
    governorateId: v.id("governorates"),
  },
  handler: async (ctx, args) => {
    const governorate = await ctx.db.get(args.governorateId);
    if (!governorate) {
      return null;
    }
    const electionData = await ctx.db
      .query("governorateElectionData")
      .withIndex("by_governorateId", (q) =>
        q.eq("governorateId", args.governorateId)
      )
      .collect();

    const enriched = await Promise.all(
      electionData.map(async (gd) => {
        const election = await ctx.db.get(gd.electionId);
        return { ...gd, election };
      })
    );

    return { governorate, electionHistory: enriched };
  },
});
