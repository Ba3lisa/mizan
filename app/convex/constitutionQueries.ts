import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ─── QUERIES ────────────────────────────────────────────────────────────────

export const getArticleCount = internalQuery({
  args: {},
  handler: async (ctx) => {
    const articles = await ctx.db.query("constitutionArticles").collect();
    return articles.length;
  },
});

// ─── MUTATIONS ──────────────────────────────────────────────────────────────

/**
 * Ensures the 6 constitution parts exist. Idempotent.
 */
export const ensureConstitutionParts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("constitutionParts")
      .withIndex("by_sortOrder")
      .collect();

    if (existing.length >= 6) return;

    const parts = [
      {
        partNumber: 1,
        titleAr: "الدولة",
        titleEn: "The State",
        sortOrder: 1,
      },
      {
        partNumber: 2,
        titleAr: "المقومات الأساسية للمجتمع",
        titleEn: "Basic Components of Society",
        sortOrder: 2,
      },
      {
        partNumber: 3,
        titleAr: "الحقوق والحريات والواجبات العامة",
        titleEn: "Public Rights, Freedoms and Duties",
        sortOrder: 3,
      },
      {
        partNumber: 4,
        titleAr: "سيادة القانون",
        titleEn: "Rule of Law",
        sortOrder: 4,
      },
      {
        partNumber: 5,
        titleAr: "نظام الحكم",
        titleEn: "System of Government",
        sortOrder: 5,
      },
      {
        partNumber: 6,
        titleAr: "أحكام عامة وانتقالية",
        titleEn: "General and Transitional Provisions",
        sortOrder: 6,
      },
    ];

    const existingNumbers = new Set(existing.map((p) => p.partNumber));

    for (const part of parts) {
      if (!existingNumbers.has(part.partNumber)) {
        await ctx.db.insert("constitutionParts", part);
      }
    }
  },
});

/**
 * Upserts constitution articles. If an article with the same number exists,
 * updates it (only if the new text is longer — prevents overwriting full text
 * with summaries). If not, inserts it.
 */
export const upsertArticles = internalMutation({
  args: {
    articles: v.array(
      v.object({
        articleNumber: v.number(),
        textEn: v.string(),
        textAr: v.string(),
        partNumber: v.number(),
        wasAmended2019: v.boolean(),
        keywords: v.array(v.string()),
      })
    ),
    sourceUrl: v.string(),
  },
  handler: async (ctx, args) => {
    // Fetch all constitution parts to map partNumber -> partId
    const parts = await ctx.db
      .query("constitutionParts")
      .withIndex("by_sortOrder")
      .collect();
    const partMap = new Map(parts.map((p) => [p.partNumber, p._id]));

    let inserted = 0;

    for (const article of args.articles) {
      const partId = partMap.get(article.partNumber);
      if (!partId) {
        console.warn(
          `[constitutionQueries] No part found for partNumber ${article.partNumber}`
        );
        continue;
      }

      const existing = await ctx.db
        .query("constitutionArticles")
        .withIndex("by_articleNumber", (q) =>
          q.eq("articleNumber", article.articleNumber)
        )
        .unique();

      if (existing) {
        // Only update if new text is longer (don't overwrite full text with summary)
        if (
          article.textEn.length > existing.textEn.length ||
          (article.textAr.length > 0 &&
            article.textAr.length > (existing.textAr?.length ?? 0))
        ) {
          const patch: Record<string, unknown> = {
            wasAmended2019: article.wasAmended2019,
            keywords: article.keywords,
          };
          if (article.textEn.length > existing.textEn.length) {
            patch.textEn = article.textEn;
          }
          if (
            article.textAr.length > 0 &&
            article.textAr.length > (existing.textAr?.length ?? 0)
          ) {
            patch.textAr = article.textAr;
          }
          await ctx.db.patch(existing._id, patch);
          inserted++;
        }
      } else {
        await ctx.db.insert("constitutionArticles", {
          articleNumber: article.articleNumber,
          partId,
          textEn: article.textEn,
          textAr: article.textAr || `المادة ${article.articleNumber}`,
          wasAmended2019: article.wasAmended2019,
          keywords: article.keywords,
        });
        inserted++;
      }
    }

    return inserted;
  },
});
