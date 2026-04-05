import { query } from "./_generated/server";
import { v } from "convex/values";

export const getDataSourceInfo = query({
  args: {},
  handler: async (_ctx) => {
    return {
      sources: [
        {
          nameEn: "Central Bank of Egypt",
          nameAr: "البنك المركزي المصري",
          url: "https://www.cbe.org.eg/en/economic-research/statistics",
        },
        {
          nameEn: "World Bank",
          nameAr: "البنك الدولي",
          url: "https://data.worldbank.org/indicator/DT.DOD.DECT.CD?locations=EG",
        },
        {
          nameEn: "IMF",
          nameAr: "صندوق النقد الدولي",
          url: "https://www.imf.org/en/Countries/EGY",
        },
      ],
    };
  },
});

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
    const record = await ctx.db
      .query("debtRecords")
      .withIndex("by_date")
      .order("desc")
      .first();

    if (!record) return null;

    const creditors = await ctx.db
      .query("debtByCreditor")
      .withIndex("by_debtRecordId", (q) =>
        q.eq("debtRecordId", record._id)
      )
      .collect();

    return { ...record, creditors };
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
