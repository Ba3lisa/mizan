import { query } from "./_generated/server";
import { v } from "convex/values";

// List all officials for generateStaticParams
export const listOfficialSlugs = query({
  args: {},
  handler: async (ctx) => {
    const officials = await ctx.db
      .query("officials")
      .withIndex("by_isCurrent", (q) => q.eq("isCurrent", true))
      .take(200);
    return officials.map((o) => ({
      slug: o.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      id: o._id,
      nameEn: o.nameEn,
      nameAr: o.nameAr,
      titleEn: o.titleEn,
      titleAr: o.titleAr,
      role: o.role,
      sourceUrl: o.sourceUrl,
    }));
  },
});

// Get a single official by slug (for the entity page)
export const getOfficialBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    // Since we don't have a slug index, fetch all current and match
    const officials = await ctx.db
      .query("officials")
      .withIndex("by_isCurrent", (q) => q.eq("isCurrent", true))
      .take(200);
    const slug = args.slug.toLowerCase();
    return officials.find((o) =>
      o.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") === slug
    ) ?? null;
  },
});

// List all constitution article numbers
export const listArticleNumbers = query({
  args: {},
  handler: async (ctx) => {
    const articles = await ctx.db
      .query("constitutionArticles")
      .take(300);
    return articles.map((a) => ({
      number: a.articleNumber,
      id: a._id,
      textEn: a.textEn.slice(0, 200),
      textAr: a.textAr.slice(0, 200),
      summaryEn: a.summaryEn ?? "",
      summaryAr: a.summaryAr ?? "",
      wasAmended2019: a.wasAmended2019,
    }));
  },
});

// Get a single constitution article by number
export const getArticleByNumber = query({
  args: { number: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("constitutionArticles")
      .withIndex("by_articleNumber", (q) => q.eq("articleNumber", args.number))
      .unique();
  },
});

// List all governorate slugs
export const listGovernorateSlugs = query({
  args: {},
  handler: async (ctx) => {
    const govs = await ctx.db.query("governorates").take(50);
    return govs.map((g) => ({
      slug: g.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      id: g._id,
      nameEn: g.nameEn,
      nameAr: g.nameAr,
      capitalEn: g.capitalEn,
      capitalAr: g.capitalAr,
      population: g.population,
    }));
  },
});

// Get a single governorate by slug
export const getGovernorateBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const govs = await ctx.db.query("governorates").take(50);
    const slug = args.slug.toLowerCase();
    return govs.find((g) =>
      g.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") === slug
    ) ?? null;
  },
});
