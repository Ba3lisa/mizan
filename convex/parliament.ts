import { query } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

export const getDataSourceInfo = query({
  args: {},
  handler: async (_ctx) => {
    return {
      sources: [
        {
          nameEn: "Egyptian Parliament",
          nameAr: "البرلمان المصري",
          url: "https://www.parliament.gov.eg/en/MPs",
        },
        {
          nameEn: "Egyptian Senate",
          nameAr: "مجلس الشيوخ المصري",
          url: "https://www.senategov.eg/en/Members",
        },
      ],
    };
  },
});

const chamberValidator = v.union(v.literal("house"), v.literal("senate"));

export const listMembers = query({
  args: {
    chamber: chamberValidator,
    isCurrent: v.boolean(),
  },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("parliamentMembers")
      .withIndex("by_chamber_and_isCurrent", (q) =>
        q.eq("chamber", args.chamber).eq("isCurrent", args.isCurrent)
      )
      .collect();

    return await Promise.all(
      members.map(async (member) => {
        const official = await ctx.db.get(member.officialId);
        let party: Doc<"parties"> | null = null;
        if (member.partyId) {
          party = await ctx.db.get(member.partyId);
        }
        let governorate: Doc<"governorates"> | null = null;
        if (member.governorateId) {
          governorate = await ctx.db.get(member.governorateId);
        }
        return { ...member, official, party, governorate };
      })
    );
  },
});

export const getMember = query({
  args: { memberId: v.id("parliamentMembers") },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) return null;

    const official = await ctx.db.get(member.officialId);
    let party: Doc<"parties"> | null = null;
    if (member.partyId) {
      party = await ctx.db.get(member.partyId);
    }
    let governorate: Doc<"governorates"> | null = null;
    if (member.governorateId) {
      governorate = await ctx.db.get(member.governorateId);
    }

    return { ...member, official, party, governorate };
  },
});

export const listParties = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("parties").collect();
  },
});

export const getPartyMembers = query({
  args: { partyId: v.id("parties") },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("parliamentMembers")
      .withIndex("by_partyId", (q) => q.eq("partyId", args.partyId))
      .collect();

    return await Promise.all(
      members.map(async (member) => {
        const official = await ctx.db.get(member.officialId);
        return { ...member, official };
      })
    );
  },
});

export const listCommittees = query({
  args: { chamber: chamberValidator },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("committees")
      .withIndex("by_chamber", (q) => q.eq("chamber", args.chamber))
      .collect();
  },
});

export const getCommitteeWithMembers = query({
  args: { committeeId: v.id("committees") },
  handler: async (ctx, args) => {
    const committee = await ctx.db.get(args.committeeId);
    if (!committee) return null;

    const memberships = await ctx.db
      .query("committeeMemberships")
      .withIndex("by_committeeId", (q) => q.eq("committeeId", args.committeeId))
      .collect();

    const membersWithDetails = await Promise.all(
      memberships.map(async (membership) => {
        const parliamentMember = await ctx.db.get(membership.memberId);
        let official: Doc<"officials"> | null = null;
        if (parliamentMember) {
          official = await ctx.db.get(parliamentMember.officialId);
        }
        return { ...membership, parliamentMember, official };
      })
    );

    let chairperson: Doc<"officials"> | null = null;
    if (committee.chairpersonId) {
      chairperson = await ctx.db.get(committee.chairpersonId);
    }

    return { ...committee, chairperson, members: membersWithDetails };
  },
});

export const getParliamentStats = query({
  args: { chamber: chamberValidator },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("parliamentMembers")
      .withIndex("by_chamber_and_isCurrent", (q) =>
        q.eq("chamber", args.chamber).eq("isCurrent", true)
      )
      .collect();

    const totalMembers = members.length;

    // Party breakdown
    const partyCountMap: Record<string, number> = {};
    const partyIds = new Set<Id<"parties">>();

    for (const member of members) {
      if (member.partyId) {
        partyIds.add(member.partyId);
        const key = member.partyId;
        partyCountMap[key] = (partyCountMap[key] ?? 0) + 1;
      }
    }

    const parties = await Promise.all(
      Array.from(partyIds).map(async (partyId) => {
        const party = await ctx.db.get(partyId);
        return {
          party,
          count: partyCountMap[partyId] ?? 0,
        };
      })
    );

    const independentCount = members.filter((m) => !m.partyId).length;

    const electionMethodBreakdown: Record<string, number> = {};
    for (const member of members) {
      electionMethodBreakdown[member.electionMethod] =
        (electionMethodBreakdown[member.electionMethod] ?? 0) + 1;
    }

    return {
      chamber: args.chamber,
      totalMembers,
      parties,
      independentCount,
      electionMethodBreakdown,
    };
  },
});

export const getMembersByGovernorate = query({
  args: { governorateId: v.id("governorates") },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("parliamentMembers")
      .withIndex("by_governorateId", (q) =>
        q.eq("governorateId", args.governorateId)
      )
      .collect();

    const currentMembers = members.filter((m) => m.isCurrent);

    return await Promise.all(
      currentMembers.map(async (member) => {
        const official = await ctx.db.get(member.officialId);
        let party: Doc<"parties"> | null = null;
        if (member.partyId) {
          party = await ctx.db.get(member.partyId);
        }
        return { ...member, official, party };
      })
    );
  },
});
