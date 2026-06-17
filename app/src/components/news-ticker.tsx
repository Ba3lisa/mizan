"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Newspaper, X } from "lucide-react";
import { useLanguage } from "@/components/providers";
import { cn } from "@/lib/utils";

type Headline = {
  title: string;
  url: string;
  sourceDomain: string;
  language: string;
  publishedAt: number;
};

const COPY = {
  en: {
    channel: "News channel",
    stories: "stories",
    loading: "Loading headlines",
    empty: "No news available",
    preview: "Preview",
    open: "Open",
    close: "Close preview",
    frameNote: "Some publishers block embedded previews. Open the article if the preview stays blank.",
  },
  ar: {
    channel: "قناة الأخبار",
    stories: "خبر",
    loading: "تحميل الأخبار",
    empty: "لا توجد أخبار حالياً",
    preview: "معاينة",
    open: "فتح",
    close: "إغلاق المعاينة",
    frameNote: "بعض المواقع تمنع المعاينة المضمنة. افتح المقال إذا بقيت المعاينة فارغة.",
  },
} as const;

function relativeTime(epochMs: number, lang: "ar" | "en"): string {
  const diff = Math.max(0, Date.now() - epochMs);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return lang === "ar" ? "الآن" : "now";
  if (mins < 60) return lang === "ar" ? `منذ ${mins}د` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return lang === "ar" ? `منذ ${hrs}س` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return lang === "ar" ? `منذ ${days}ي` : `${days}d ago`;
}

function headlineLanguageScore(headline: Headline, lang: "ar" | "en"): number {
  if (lang === "ar") return headline.language === "Arabic" ? 0 : 1;
  return headline.language === "English" ? 0 : 1;
}

export function NewsTicker() {
  const { lang, t } = useLanguage();
  const copy = COPY[lang];
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Headline | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    fetch("/api/news")
      .then((res) => res.json())
      .then((data: { articles?: Headline[] }) => {
        setHeadlines(data.articles ?? []);
      })
      .catch(() => setHeadlines([]))
      .finally(() => setLoading(false));
  }, []);

  const visibleHeadlines = useMemo(() => (
    [...headlines]
      .sort((a, b) => {
        const langDelta = headlineLanguageScore(a, lang) - headlineLanguageScore(b, lang);
        return langDelta !== 0 ? langDelta : b.publishedAt - a.publishedAt;
      })
      .slice(0, 18)
  ), [headlines, lang]);

  if (!loading && visibleHeadlines.length === 0) {
    return (
      <section className="rounded-[8px] border border-border/70 bg-card/75 px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Newspaper size={14} className="text-primary" />
          <span>{t.newsTicker_noNews ?? copy.empty}</span>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[8px] border border-border/70 bg-card/75">
      <div className="flex items-center gap-3 border-b border-border/60 px-3 py-2">
        <div className="inline-flex items-center gap-2 text-primary">
          <Newspaper size={14} />
          <span className="workbench-label">{t.newsTicker_title ?? copy.channel}</span>
        </div>
        <div className="h-px min-w-6 flex-1 bg-border/60" />
        <span className="font-mono text-[0.65rem] text-muted-foreground">
          {loading ? copy.loading : `${visibleHeadlines.length} ${t.newsTicker_stories ?? copy.stories}`}
        </span>
      </div>

      <div className="overflow-x-auto px-3 py-2">
        <div className="flex min-w-max gap-2">
          {loading
            ? Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-24 w-80 shrink-0 animate-pulse rounded-[7px] border border-border/50 bg-background/70" />
              ))
            : visibleHeadlines.map((headline) => (
                <article
                  key={`${headline.url}-${headline.publishedAt}`}
                  className={cn(
                    "group/news relative h-24 w-80 shrink-0 overflow-hidden rounded-[7px] border border-border/60 bg-background/70 p-2.5 text-start transition-colors",
                    "hover:border-primary/60 hover:bg-primary/10 focus-within:border-primary/60 focus-within:bg-primary/10",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setPreview(headline)}
                    className="text-start outline-none"
                  >
                    <span className="flex items-center gap-1.5 pe-28 text-[0.62rem] text-muted-foreground">
                      <span className="max-w-28 truncate font-mono uppercase text-primary/70">{headline.sourceDomain}</span>
                      <span>·</span>
                      <span className="font-mono">{relativeTime(headline.publishedAt, lang)}</span>
                    </span>
                    <span className="mt-1.5 block max-w-[18rem] overflow-hidden text-xs font-semibold leading-5 text-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                      {headline.title}
                    </span>
                  </button>

                  <div className="absolute end-2 top-2 flex items-center gap-1.5 rounded-[6px] bg-background/95 opacity-100 shadow-sm transition-opacity sm:opacity-0 sm:group-hover/news:opacity-100 sm:group-focus-within/news:opacity-100">
                    <button
                      type="button"
                      onClick={() => setPreview(headline)}
                      className="rounded-[6px] border border-border/70 bg-card px-2 py-1 text-[0.65rem] font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      {copy.preview}
                    </button>
                    <a
                      href={headline.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-[6px] border border-border/70 bg-card px-2 py-1 text-[0.65rem] font-semibold text-muted-foreground no-underline transition-colors hover:border-primary hover:text-primary"
                    >
                      {copy.open}
                      <ExternalLink size={11} />
                    </a>
                  </div>
                </article>
              ))}
        </div>
      </div>

      {preview && (
        <div className="border-t border-border/60 p-3 animate-fade-up">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="workbench-label text-primary">{preview.sourceDomain}</p>
              <h2 className="mt-1 max-w-4xl text-sm font-bold leading-6 text-foreground">{preview.title}</h2>
              <p className="mt-1 text-[0.68rem] text-muted-foreground">{copy.frameNote}</p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={preview.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-[6px] border border-primary/60 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary no-underline transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                {copy.open}
                <ExternalLink size={12} />
              </a>
              <button
                type="button"
                onClick={() => setPreview(null)}
                aria-label={copy.close}
                className="inline-flex size-8 items-center justify-center rounded-[6px] border border-border/70 bg-background text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <iframe
            key={preview.url}
            src={preview.url}
            title={preview.title}
            className="mt-3 h-[420px] w-full rounded-[7px] border border-border/60 bg-background"
            sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox"
          />
        </div>
      )}
    </section>
  );
}
