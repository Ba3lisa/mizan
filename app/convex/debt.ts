import { query } from "./_generated/server";
import { v } from "convex/values";


export const listDebtRecords = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("debtRecords")
      .withIndex("by_date")
      .order("asc")
      .collect();
  },
});

export const getDebtRecord = query({
  args: { debtRecordId: v.id("debtRecords") },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.debtRecordId);
    if (!record) return null;

    const creditors = await ctx.db
      .query("debtByCreditor")
      .withIndex("by_debtRecordId", (q) =>
        q.eq("debtRecordId", args.debtRecordId)
      )
      .collect();

    return { ...record, creditors };
  },
});

export const getDebtTimeline = query({
  args: {},
  handler: async (ctx) => {
    const records = await ctx.db
      .query("debtRecords")
      .withIndex("by_date")
      .order("asc")
      .collect();

    return records.map((record) => ({
      date: record.date,
      totalExternalDebt: record.totalExternalDebt,
      totalDomesticDebt: record.totalDomesticDebt,
      debtToGdpRatio: record.debtToGdpRatio,
      foreignReserves: record.foreignReserves,
    }));
  },
});

export const getLatestDebtRecord = query({
  args: {},
  handler: async (ctx) => {
    // Get the latest record by date
    const latestRecord = await ctx.db
      .query("debtRecords")
      .withIndex("by_date")
      .order("desc")
      .first();

    if (!latestRecord) return null;

    // Try to find creditors for the latest record
    let creditors = await ctx.db
      .query("debtByCreditor")
      .withIndex("by_debtRecordId", (q) =>
        q.eq("debtRecordId", latestRecord._id)
      )
      .collect();

    // If latest record has no creditors, find the most recent record that does
    if (creditors.length === 0) {
      const allRecords = await ctx.db
        .query("debtRecords")
        .withIndex("by_date")
        .order("desc")
        .take(10);

      for (const record of allRecords) {
        const c = await ctx.db
          .query("debtByCreditor")
          .withIndex("by_debtRecordId", (q) =>
            q.eq("debtRecordId", record._id)
          )
          .collect();
        if (c.length > 0) {
          creditors = c;
          break;
        }
      }
    }

    return { ...latestRecord, creditors };
  },
});

export const getDebtByCreditorType = query({
  args: { debtRecordId: v.id("debtRecords") },
  handler: async (ctx, args) => {
    const creditors = await ctx.db
      .query("debtByCreditor")
      .withIndex("by_debtRecordId", (q) =>
        q.eq("debtRecordId", args.debtRecordId)
      )
      .collect();

    // Group by creditor type
    const grouped: Record<string, { creditors: typeof creditors; totalAmount: number }> = {};

    for (const creditor of creditors) {
      if (!grouped[creditor.creditorType]) {
        grouped[creditor.creditorType] = { creditors: [], totalAmount: 0 };
      }
      grouped[creditor.creditorType].creditors.push(creditor);
      grouped[creditor.creditorType].totalAmount += creditor.amount;
    }

    return grouped;
  },
});
