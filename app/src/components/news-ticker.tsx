"use client";

import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useLanguage } from "@/components/providers";
import { Newspaper, ExternalLink } from "lucide-react";

const STALE_MS = 15 * 60 * 1000; // 15 minutes

function relativeTime(epochMs: number, isAr: boolean): string {
  const diff = Date.now() - epochMs;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return isAr ? "الآن" : "now";
  if (mins < 60) return isAr ? `${mins} د` : `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return isAr ? `${hrs} س` : `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return isAr ? `${days} ي` : `${days}d`;
}

export function NewsTicker() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  // Prefer headlines matching the current language, but show all if not enough
  const preferred = useQuery(api.news.getLatest, {
    limit: 20,
    language: isAr ? "Arabic" : "English",
  });
  const fallback = useQuery(api.news.getLatest, { limit: 20 });
  const data = (preferred?.headlines?.length ?? 0) >= 3 ? preferred : fallback;
  const writeHeadlines = useMutation(api.news.writeHeadlines);
  const hasTriggeredRef = useRef(false);

  // If cache is stale, fetch from /api/news (Next.js proxy → GDELT) and write to Convex
  useEffect(() => {
    if (!data || hasTriggeredRef.current) return;
    if (data.lastFetchedAt === 0 || Date.now() - data.lastFetchedAt > STALE_MS) {
      hasTriggeredRef.current = true;
      fetch("/api/news")
        .then((res) => res.json())
        .then((json: { articles?: Array<{ title: string; url: string; sourceDomain: string; language: string; publishedAt: number; imageUrl?: string }> }) => {
          if (json.articles?.length) {
            writeHeadlines({ items: json.articles }).catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, [data, writeHeadlines]);

  const headlines = data?.headlines ?? [];

  return (
    <div className="relative group/ticker h-full">
      {/* Hover glow — matches DailyPoll pattern */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 rounded-2xl blur-sm opacity-0 group-hover/ticker:opacity-100 transition-opacity duration-500" />

      <div className="relative border border-border/60 rounded-2xl bg-card/80 backdrop-blur-sm overflow-hidden h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-primary/10 via-transparent to-primary/5 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Newspaper size={14} className="text-primary" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            </div>
            <span className="text-xs font-bold text-primary tracking-wide uppercase">
              {isAr ? "أخبار مصر" : "Egyptian News"}
            </span>
          </div>
          {headlines.length > 0 && (
            <span className="text-[0.6rem] text-muted-foreground/50 font-mono">
              {headlines.length} {isAr ? "خبر" : "stories"}
            </span>
          )}
        </div>

        {/* Ticker body */}
        {data === undefined ? (
          <TickerSkeleton />
        ) : headlines.length === 0 ? (
          <div className="flex items-center justify-center flex-1 min-h-[200px] text-xs text-muted-foreground/40">
            {isAr ? "جارٍ تحميل الأخبار..." : "Loading news..."}
          </div>
        ) : (
          <TickerScroll headlines={headlines} isAr={isAr} />
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-1.5 border-t border-border/30 bg-muted/5">
          <span className="text-[0.5rem] text-muted-foreground/30 font-mono uppercase tracking-wider">
            via GDELT
          </span>
          {data?.lastFetchedAt ? (
            <span className="text-[0.5rem] text-muted-foreground/30 font-mono">
              {relativeTime(data.lastFetchedAt, isAr)}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ─── Scrolling ticker track ─── */

interface Headline {
  _id: string;
  title: string;
  url: string;
  sourceDomain: string;
  language: string;
  publishedAt: number;
}

function TickerScroll({ headlines, isAr }: { headlines: Headline[]; isAr: boolean }) {
  // Duration scales with headline count — ~3s per headline
  const duration = Math.max(20, headlines.length * 3);

  return (
    <div className="ticker-wrap relative flex-1 min-h-[200px] overflow-hidden">
      {/* Top gradient fade */}
      <div className="absolute top-0 left-0 right-0 h-8 z-10 pointer-events-none bg-gradient-to-b from-card/95 to-transparent" />

      {/* Scrolling track — duplicated for seamless loop */}
      <div
        className="ticker-track flex flex-col"
        style={{
          animation: `ticker-scroll ${duration}s linear infinite`,
          willChange: "transform",
        }}
      >
        {/* First pass */}
        {headlines.map((h) => (
          <HeadlineCard key={h._id} headline={h} isAr={isAr} />
        ))}
        {/* Duplicate for seamless loop */}
        {headlines.map((h) => (
          <HeadlineCard key={`dup-${h._id}`} headline={h} isAr={isAr} />
        ))}
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-8 z-10 pointer-events-none bg-gradient-to-t from-card/95 to-transparent" />
    </div>
  );
}

/* ─── Individual headline card ─── */

function HeadlineCard({ headline, isAr }: { headline: Headline; isAr: boolean }) {
  return (
    <a
      href={headline.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block px-4 py-2.5 border-b border-border/15 hover:bg-primary/5 transition-colors no-underline group/card"
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-[0.55rem] font-mono text-primary/50 uppercase tracking-wide truncate max-w-[120px]">
          {headline.sourceDomain}
        </span>
        <span className="text-[0.5rem] text-muted-foreground/25">·</span>
        <span className="text-[0.5rem] text-muted-foreground/35 font-mono shrink-0">
          {relativeTime(headline.publishedAt, isAr)}
        </span>
        <ExternalLink
          size={8}
          className="ml-auto shrink-0 text-muted-foreground/20 group-hover/card:text-primary/50 transition-colors"
        />
      </div>
      <p className="text-[0.7rem] leading-snug text-foreground/80 line-clamp-2 group-hover/card:text-foreground transition-colors">
        {headline.title}
      </p>
    </a>
  );
}

/* ─── Loading skeleton ─── */

function TickerSkeleton() {
  return (
    <div className="h-[300px] px-4 py-3 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-1.5 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-16 bg-muted/30 rounded" />
            <div className="h-2 w-8 bg-muted/20 rounded" />
          </div>
          <div className="h-3 w-full bg-muted/20 rounded" />
          <div className="h-3 w-3/4 bg-muted/15 rounded" />
        </div>
      ))}
    </div>
  );
}
