import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";


export const getMemberCount = internalQuery({
  args: {},
  handler: async (ctx) => {
    const members = await ctx.db.query("parliamentMembers").collect();
    return members.length;
  },
});

export const getPartyCount = internalQuery({
  args: {},
  handler: async (ctx) => {
    const parties = await ctx.db.query("parties").collect();
    return parties.length;
  },
});

export const getPlaceholderCount = internalQuery({
  args: {},
  handler: async (ctx) => {
    const officials = await ctx.db
      .query("officials")
      .withIndex("by_role_and_isCurrent", (q) =>
        q.eq("role", "mp").eq("isCurrent", true)
      )
      .collect();
    return officials.filter((o) => o.nameEn.includes("Member ")).length;
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

/**
 * Upsert a single parliament member from the parliament.gov.eg scraper.
 * Matches by Arabic name to avoid duplicates.
 */
export const upsertMember = internalMutation({
  args: {
    nameAr: v.string(),
    nameEn: v.string(),
    partyNameEn: v.string(),
    governorate: v.string(),
    constituency: v.string(),
    membershipType: v.union(
      v.literal("constituency"),
      v.literal("party_list"),
      v.literal("presidential_appointment")
    ),
    committee: v.string(),
    sourceUrl: v.string(),
    chamber: v.union(v.literal("house"), v.literal("senate")),
  },
  handler: async (ctx, args) => {
    // Find existing official by Arabic name
    const allOfficials = await ctx.db
      .query("officials")
      .withIndex("by_role_and_isCurrent", (q) =>
        q.eq("role", args.chamber === "house" ? "mp" : "senator").eq("isCurrent", true)
      )
      .collect();

    const existing = allOfficials.find(
      (o) => o.nameAr === args.nameAr || o.nameEn === args.nameEn
    );

    // Find party by name
    const allParties = await ctx.db.query("parties").collect();
    const party = allParties.find(
      (p) =>
        p.nameEn.toLowerCase().includes(args.partyNameEn.toLowerCase()) ||
        p.nameAr.includes(args.partyNameEn)
    );

    // Find governorate
    const allGovernorates = await ctx.db.query("governorates").collect();
    const gov = allGovernorates.find(
      (g) =>
        g.nameEn.toLowerCase().includes(args.governorate.toLowerCase()) ||
        g.nameAr.includes(args.governorate)
    );

    if (existing) {
      // Update official with real name if it was a placeholder
      if (existing.nameEn.includes("Member ")) {
        await ctx.db.patch(existing._id, {
          nameAr: args.nameAr,
          nameEn: args.nameEn,
          sourceUrl: args.sourceUrl,
        });
      }

      // Update the parliament member record
      const memberRecords = await ctx.db
        .query("parliamentMembers")
        .withIndex("by_chamber_and_isCurrent", (q) =>
          q.eq("chamber", args.chamber).eq("isCurrent", true)
        )
        .collect();
      const memberRecord = memberRecords.find(
        (m) => m.officialId === existing._id
      );
      if (memberRecord) {
        await ctx.db.patch(memberRecord._id, {
          partyId: party?._id,
          governorateId: gov?._id,
          constituency: args.constituency || undefined,
          electionMethod: args.membershipType,
        });
      }
      return;
    }

    // DO NOT create new records -- only update existing placeholders
    // This prevents the duplicate issue that corrupted data before
    return;
  },
});

/**
 * Updates an existing placeholder member with a real name from parliament.gov.eg.
 * Finds a placeholder official (name contains "Member ") for the matching party
 * and updates it in-place. Returns true if a placeholder was updated.
 * NEVER creates new records.
 */
export const updatePlaceholderWithRealName = internalMutation({
  args: {
    nameAr: v.string(),
    nameEn: v.string(),
    partyHint: v.string(),
    governorateHint: v.string(),
    sourceUrl: v.string(),
  },
  handler: async (ctx, args): Promise<boolean> => {
    // Check if this name already exists (avoid duplicates)
    const allOfficials = await ctx.db
      .query("officials")
      .withIndex("by_role_and_isCurrent", (q) =>
        q.eq("role", "mp").eq("isCurrent", true)
      )
      .collect();

    const alreadyExists = allOfficials.some(
      (o) => o.nameAr === args.nameAr || (args.nameEn && o.nameEn === args.nameEn)
    );
    if (alreadyExists) return false;

    // Find a placeholder official to update (one whose name contains "Member ")
    const placeholder = allOfficials.find(
      (o) => o.nameEn.includes("Member ") || o.nameAr.includes("عضو ")
    );
    if (!placeholder) return false;

    // Update the placeholder with the real name
    await ctx.db.patch(placeholder._id, {
      nameAr: args.nameAr,
      nameEn: args.nameEn || args.nameAr,
      sourceUrl: args.sourceUrl,
    });

    // Also update the parliament member's governorate if we can match it
    if (args.governorateHint) {
      const govs = await ctx.db.query("governorates").collect();
      const gov = govs.find(
        (g) =>
          g.nameEn.toLowerCase().includes(args.governorateHint.toLowerCase()) ||
          g.nameAr.includes(args.governorateHint)
      );
      if (gov) {
        const members = await ctx.db
          .query("parliamentMembers")
          .withIndex("by_chamber_and_isCurrent", (q) =>
            q.eq("chamber", "house").eq("isCurrent", true)
          )
          .collect();
        const member = members.find((m) => m.officialId === placeholder._id);
        if (member) {
          await ctx.db.patch(member._id, { governorateId: gov._id });
        }
      }
    }

    return true;
  },
});
