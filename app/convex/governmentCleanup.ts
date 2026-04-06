import { internalMutation } from "./_generated/server";

/**
 * Clears all government officials (president, PM, ministers) and ministries.
 * Preserves parliament members (MPs, senators).
 * Call before letting the pipeline repopulate from cabinet.gov.eg.
 */
export const clearGovernmentData = internalMutation({
  args: {},
  handler: async (ctx) => {
    let deleted = 0;

    // Delete ministries
    const ministries = await ctx.db.query("ministries").collect();
    for (const m of ministries) {
      await ctx.db.delete(m._id);
      deleted++;
    }

    // Delete government officials only (not MPs/senators)
    const officials = await ctx.db.query("officials").collect();
    for (const o of officials) {
      if (o.role === "president" || o.role === "prime_minister" || o.role === "minister" || o.role === "deputy_minister" || o.role === "governor") {
        await ctx.db.delete(o._id);
        deleted++;
      }
    }

    return { deleted };
  },
});
