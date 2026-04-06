import { internalMutation } from "./_generated/server";

/**
 * Clears all parliament member records and their associated MP/senator officials.
 * Preserves officials with other roles (president, ministers, governors).
 * Also clears committee memberships.
 * Run this before re-seeding parliament data to avoid duplicates.
 */
export const clearParliamentData = internalMutation({
  args: {},
  handler: async (ctx) => {
    let deleted = 0;

    // Delete all committee memberships
    const memberships = await ctx.db.query("committeeMemberships").collect();
    for (const m of memberships) {
      await ctx.db.delete(m._id);
      deleted++;
    }

    // Delete all parliament members
    const members = await ctx.db.query("parliamentMembers").collect();
    const memberOfficialIds = new Set(members.map((m) => m.officialId));
    for (const m of members) {
      await ctx.db.delete(m._id);
      deleted++;
    }

    // Delete officials that are MPs or senators (but not ministers/governors/president)
    const officials = await ctx.db.query("officials").collect();
    for (const o of officials) {
      if (
        (o.role === "mp" || o.role === "senator") &&
        memberOfficialIds.has(o._id)
      ) {
        await ctx.db.delete(o._id);
        deleted++;
      }
    }

    // Delete parties (will be re-created by the composition upsert)
    const parties = await ctx.db.query("parties").collect();
    for (const p of parties) {
      await ctx.db.delete(p._id);
      deleted++;
    }

    return { deleted };
  },
});
