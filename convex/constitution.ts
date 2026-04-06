import { query } from "./_generated/server";
import { v } from "convex/values";

export const getDataSourceInfo = query({
  args: {},
  handler: async (_ctx) => {
    return {
      sources: [
        {
          nameEn: "State Information Service",
          nameAr: "الهيئة العامة للاستعلامات",
          url: "https://www.sis.gov.eg/section/10/7527?lang=en",
        },
      ],
    };
  },
});

export const listParts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("constitutionParts")
      .withIndex("by_sortOrder")
      .order("asc")
      .collect();
  },
});

export const getPartWithArticles = query({
  args: { partId: v.id("constitutionParts") },
  handler: async (ctx, args) => {
    const part = await ctx.db.get(args.partId);
    if (!part) return null;

    const articles = await ctx.db
      .query("constitutionArticles")
      .withIndex("by_partId", (q) => q.eq("partId", args.partId))
      .order("asc")
      .collect();

    return { ...part, articles };
  },
});

export const getArticle = query({
  args: { articleNumber: v.number() },
  handler: async (ctx, args) => {
    const article = await ctx.db
      .query("constitutionArticles")
      .withIndex("by_articleNumber", (q) =>
        q.eq("articleNumber", args.articleNumber)
      )
      .unique();

    if (!article) return null;

    const crossRefsFrom = await ctx.db
      .query("articleCrossReferences")
      .withIndex("by_fromArticleId", (q) =>
        q.eq("fromArticleId", article._id)
      )
      .collect();

    const crossRefsTo = await ctx.db
      .query("articleCrossReferences")
      .withIndex("by_toArticleId", (q) => q.eq("toArticleId", article._id))
      .collect();

    const referencedArticles = await Promise.all(
      crossRefsFrom.map(async (ref) => {
        const toArticle = await ctx.db.get(ref.toArticleId);
        return { ...ref, toArticle };
      })
    );

    const referencedByArticles = await Promise.all(
      crossRefsTo.map(async (ref) => {
        const fromArticle = await ctx.db.get(ref.fromArticleId);
        return { ...ref, fromArticle };
      })
    );

    return { ...article, referencedArticles, referencedByArticles };
  },
});

export const searchArticles = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("constitutionArticles")
      .withSearchIndex("search_articles", (q) =>
        q.search("textEn", args.searchTerm)
      )
      .take(20);
  },
});

export const listAllArticles = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("constitutionArticles")
      .collect();
  },
});

export const listAmendedArticles = query({
  args: {},
  handler: async (ctx) => {
    // Use search index filtered by wasAmended2019 — but since we need a regular
    // index approach, we collect all and note: in practice a dedicated index
    // would be added, but the schema uses searchIndex filterFields for this.
    // We collect all articles and filter in memory since there is no standalone
    // index on wasAmended2019 alone.
    const allArticles = await ctx.db.query("constitutionArticles").collect();
    return allArticles.filter((a) => a.wasAmended2019);
  },
});

export const getArticleCrossReferences = query({
  args: { articleId: v.id("constitutionArticles") },
  handler: async (ctx, args) => {
    const fromRefs = await ctx.db
      .query("articleCrossReferences")
      .withIndex("by_fromArticleId", (q) =>
        q.eq("fromArticleId", args.articleId)
      )
      .collect();

    const toRefs = await ctx.db
      .query("articleCrossReferences")
      .withIndex("by_toArticleId", (q) => q.eq("toArticleId", args.articleId))
      .collect();

    const fromRefsWithArticles = await Promise.all(
      fromRefs.map(async (ref) => {
        const toArticle = await ctx.db.get(ref.toArticleId);
        return { ...ref, toArticle };
      })
    );

    const toRefsWithArticles = await Promise.all(
      toRefs.map(async (ref) => {
        const fromArticle = await ctx.db.get(ref.fromArticleId);
        return { ...ref, fromArticle };
      })
    );

    return { fromRefs: fromRefsWithArticles, toRefs: toRefsWithArticles };
  },
});

export const getConstitutionNetworkData = query({
  args: {},
  handler: async (ctx) => {
    const articles = await ctx.db.query("constitutionArticles").collect();
    const crossRefs = await ctx.db
      .query("articleCrossReferences")
      .collect();

    const nodes = articles.map((article) => ({
      id: article._id,
      articleNumber: article.articleNumber,
      titleEn: `Article ${article.articleNumber}`,
      summaryEn: article.summaryEn,
      wasAmended2019: article.wasAmended2019,
      partId: article.partId,
    }));

    const edges = crossRefs.map((ref) => ({
      id: ref._id,
      source: ref.fromArticleId,
      target: ref.toArticleId,
      relationshipType: ref.relationshipType,
      noteEn: ref.noteEn,
    }));

    return { nodes, edges };
  },
});
