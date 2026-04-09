import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── QUERIES ────────────────────────────────────────────────────────────────

/** Get latest cached headlines + freshness timestamp. Optionally filter by language. */
export const getLatest = query({
  args: {
    limit: v.optional(v.number()),
    language: v.optional(v.string()), // "English", "Arabic", etc.
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    // Fetch more than needed so we can filter by language and still have enough
    const all = await ctx.db
      .query("newsHeadlines")
      .withIndex("by_publishedAt")
      .order("desc")
      .take(limit * 3);

    const headlines = args.language
      ? all.filter((h) => h.language === args.language).slice(0, limit)
      : all.slice(0, limit);

    const lastFetchedAt = all.length > 0
      ? Math.max(...all.map((h) => h.fetchedAt))
      : 0;

    return { headlines, lastFetchedAt };
  },
});

// ─── MUTATIONS ──────────────────────────────────────────────────────────────

/** Batch upsert headlines — skip duplicates by URL. */
export const upsertHeadlines = internalMutation({
  args: {
    items: v.array(
      v.object({
        title: v.string(),
        url: v.string(),
        sourceDomain: v.string(),
        language: v.string(),
        publishedAt: v.number(),
        imageUrl: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let inserted = 0;

    for (const item of args.items) {
      const existing = await ctx.db
        .query("newsHeadlines")
        .withIndex("by_url", (q) => q.eq("url", item.url))
        .unique();

      if (!existing) {
        await ctx.db.insert("newsHeadlines", { ...item, fetchedAt: now });
        inserted++;
      }
    }

    return inserted;
  },
});

/** Public: write headlines from client-side /api/news fetch. Rate-limited by staleness check on client. */
export const writeHeadlines = mutation({
  args: {
    items: v.array(
      v.object({
        title: v.string(),
        url: v.string(),
        sourceDomain: v.string(),
        language: v.string(),
        publishedAt: v.number(),
        imageUrl: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let inserted = 0;
    // Limit to 40 items per call to prevent abuse
    const items = args.items.slice(0, 40);
    for (const item of items) {
      const existing = await ctx.db
        .query("newsHeadlines")
        .withIndex("by_url", (q) => q.eq("url", item.url))
        .unique();
      if (!existing) {
        await ctx.db.insert("newsHeadlines", { ...item, fetchedAt: now });
        inserted++;
      }
    }
    return inserted;
  },
});

/** Delete headlines older than 7 days. */
export const cleanupOld = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - MAX_AGE_MS;
    const old = await ctx.db
      .query("newsHeadlines")
      .withIndex("by_publishedAt")
      .filter((q) => q.lt(q.field("publishedAt"), cutoff))
      .collect();

    for (const doc of old) {
      await ctx.db.delete(doc._id);
    }
    return old.length;
  },
});

// ─── INTERNAL QUERY ─────────────────────────────────────────────────────────

/** Internal: get the most recent fetchedAt timestamp. */
export const getLatestFetchedAt = internalQuery({
  args: {},
  handler: async (ctx) => {
    const latest = await ctx.db
      .query("newsHeadlines")
      .withIndex("by_publishedAt")
      .order("desc")
      .take(1);
    return latest.length > 0 ? latest[0].fetchedAt : 0;
  },
});

/** Dev-only: purge all headlines to force a fresh fetch. */
export const purgeAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("newsHeadlines").collect();
    for (const doc of all) await ctx.db.delete(doc._id);
    return all.length;
  },
});
