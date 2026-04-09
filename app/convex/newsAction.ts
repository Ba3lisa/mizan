"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";

const STALE_MS = 15 * 60 * 1000; // 15 minutes

/** Fetch Egyptian news via the Next.js API proxy if cache is stale. */
export const refreshIfStale = action({
  args: {},
  handler: async (ctx): Promise<{ refreshed: boolean; reason?: string; fetched?: number; inserted?: number }> => {
    // Check freshness
    const latest = await ctx.runQuery(internal.news.getLatestFetchedAt, {});
    if (latest > 0 && Date.now() - latest < STALE_MS) {
      return { refreshed: false, reason: "cache_fresh" };
    }

    // Fetch via the Next.js API route (runs on DigitalOcean, different IP from Convex)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mizanmasr.com";
    try {
      const res = await fetch(`${siteUrl}/api/news`, {
        signal: AbortSignal.timeout(20000),
      });

      if (!res.ok) {
        console.warn(`[news] API proxy returned ${res.status}`);
        return { refreshed: false, reason: `proxy_${res.status}` };
      }

      const data = await res.json() as {
        articles?: Array<{
          title: string;
          url: string;
          sourceDomain: string;
          language: string;
          publishedAt: number;
          imageUrl?: string;
        }>;
      };

      const articles = data.articles ?? [];
      if (articles.length === 0) {
        return { refreshed: false, reason: "no_results" };
      }

      const inserted: number = await ctx.runMutation(internal.news.upsertHeadlines, {
        items: articles,
      }) as number;

      // Cleanup old headlines
      await ctx.runMutation(internal.news.cleanupOld, {});

      // Register GDELT as a data source
      try {
        await ctx.runMutation(internal.sources.upsertSourceInternal, {
          nameEn: "GDELT — Global News Database",
          nameAr: "GDELT — قاعدة بيانات الأخبار العالمية",
          url: "https://api.gdeltproject.org",
          category: "general",
          type: "other",
        });
      } catch {
        // Non-critical
      }

      return { refreshed: true, fetched: articles.length, inserted };
    } catch (err) {
      console.warn(`[news] Proxy fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      return { refreshed: false, reason: "fetch_failed" };
    }
  },
});
