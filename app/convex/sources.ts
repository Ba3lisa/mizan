import { query, mutation, internalMutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";

const categoryValidator = v.union(
  v.literal("government"),
  v.literal("parliament"),
  v.literal("constitution"),
  v.literal("budget"),
  v.literal("debt"),
  v.literal("elections"),
  v.literal("economy"),
  v.literal("general")
);

const typeValidator = v.union(
  v.literal("official_government"),
  v.literal("international_org"),
  v.literal("academic"),
  v.literal("media"),
  v.literal("other")
);

// Get all sources for a category
export const getByCategory = query({
  args: { category: categoryValidator },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dataSources")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();
  },
});

// Get all sources
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("dataSources").collect();
  },
});

type UpsertArgs = {
  nameEn: string;
  nameAr: string;
  url: string;
  category: "government" | "parliament" | "constitution" | "budget" | "debt" | "elections" | "economy" | "general";
  type: "official_government" | "international_org" | "academic" | "media" | "other";
  notes?: string;
};

// Shared upsert logic — find by URL index and patch or insert
async function performUpsert(ctx: MutationCtx, args: UpsertArgs) {
  const today = new Date().toISOString().split("T")[0];

  const existing = await ctx.db
    .query("dataSources")
    .withIndex("by_url", (q) => q.eq("url", args.url))
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, {
      nameEn: args.nameEn,
      nameAr: args.nameAr,
      category: args.category,
      type: args.type,
      notes: args.notes,
      lastAccessedDate: today,
    });
    return existing._id;
  }

  return await ctx.db.insert("dataSources", {
    nameEn: args.nameEn,
    nameAr: args.nameAr,
    url: args.url,
    category: args.category,
    type: args.type,
    notes: args.notes,
    lastAccessedDate: today,
  });
}

const upsertArgs = {
  nameEn: v.string(),
  nameAr: v.string(),
  url: v.string(),
  category: categoryValidator,
  type: typeValidator,
  notes: v.optional(v.string()),
};

// Public mutation — used for seeding and external tooling
export const upsertSource = mutation({
  args: upsertArgs,
  handler: async (ctx, args) => {
    return await performUpsert(ctx, args);
  },
});

// Internal mutation — used by the data agent after each successful refresh
export const upsertSourceInternal = internalMutation({
  args: upsertArgs,
  handler: async (ctx, args) => {
    return await performUpsert(ctx, args);
  },
});
