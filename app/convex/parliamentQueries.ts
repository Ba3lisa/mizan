import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getMemberCount = internalQuery({
  args: {},
  handler: async (ctx) => {
    const members = await ctx.db.query("parliamentMembers").collect();
    return members.length;
  },
});

/**
 * Upserts parliament party composition.
 * For each party: creates/updates the party record, then ensures
 * the correct number of member placeholders exist for the hemicycle visualization.
 */
export const upsertParliamentComposition = internalMutation({
  args: {
    parties: v.array(
      v.object({
        nameEn: v.string(),
        nameAr: v.string(),
        seats: v.number(),
        color: v.string(),
        chamber: v.union(v.literal("house"), v.literal("senate")),
      })
    ),
    sourceUrl: v.string(),
  },
  handler: async (ctx, args) => {
    let totalUpdated = 0;

    for (const partyData of args.parties) {
      // Find or create the party
      const allParties = await ctx.db.query("parties").collect();
      let party = allParties.find(
        (p) => p.nameEn.toLowerCase() === partyData.nameEn.toLowerCase()
      );

      if (!party) {
        // Create new party
        const partyId = await ctx.db.insert("parties", {
          nameEn: partyData.nameEn,
          nameAr: partyData.nameAr,
          color: partyData.color,
        });
        party = (await ctx.db.get(partyId)) ?? undefined;
        totalUpdated++;
      } else {
        // Update color if different
        if (party.color !== partyData.color) {
          await ctx.db.patch(party._id, { color: partyData.color });
        }
      }

      if (!party) continue;

      // Count existing members for this party in this chamber
      const existingMembers = await ctx.db
        .query("parliamentMembers")
        .withIndex("by_chamber_and_isCurrent", (q) =>
          q.eq("chamber", partyData.chamber).eq("isCurrent", true)
        )
        .collect();

      const partyMembers = partyData.nameEn === "Independents"
        ? existingMembers.filter((m) => !m.partyId)
        : existingMembers.filter((m) => m.partyId === party!._id);

      const needed = partyData.seats - partyMembers.length;

      if (needed > 0) {
        // Create placeholder member records for the hemicycle
        for (let i = 0; i < needed; i++) {
          // Create an official record for each member
          const officialId = await ctx.db.insert("officials", {
            nameEn: partyData.nameEn === "Independents"
              ? `Independent Member ${partyMembers.length + i + 1}`
              : `${partyData.nameEn} Member ${partyMembers.length + i + 1}`,
            nameAr: partyData.nameEn === "Independents"
              ? `عضو مستقل ${partyMembers.length + i + 1}`
              : `عضو ${partyData.nameAr} ${partyMembers.length + i + 1}`,
            titleEn: `Member of Parliament (${partyData.chamber === "house" ? "House" : "Senate"})`,
            titleAr: `عضو ${partyData.chamber === "house" ? "مجلس النواب" : "مجلس الشيوخ"}`,
            role: partyData.chamber === "house" ? "mp" as const : "senator" as const,
            isCurrent: true,
            sourceUrl: args.sourceUrl,
          });

          await ctx.db.insert("parliamentMembers", {
            officialId,
            chamber: partyData.chamber,
            partyId: partyData.nameEn === "Independents" ? undefined : party._id,
            electionMethod: "party_list" as const,
            termStart: "2025-12-01",
            isCurrent: true,
            seatNumber: partyMembers.length + i + 1,
          });
          totalUpdated++;
        }
      } else if (needed < 0) {
        // Remove excess members (party lost seats)
        const excess = partyMembers.slice(partyData.seats);
        for (const member of excess) {
          await ctx.db.patch(member._id, { isCurrent: false });
          totalUpdated++;
        }
      }
    }

    return totalUpdated;
  },
});
