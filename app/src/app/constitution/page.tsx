"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import Fuse from "fuse.js";
import { Search, X, ChevronRight, ChevronDown } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useLanguage } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConstitutionArticle {
  id: string;
  number: number;
  partId: string;
  chapterId?: string;
  textAr: string;
  textEn: string;
  summaryAr: string;
  summaryEn: string;
  amended: boolean;
  originalTextAr?: string;
  originalTextEn?: string;
  crossRefs: number[];
}

interface ConstitutionPart {
  id: string;
  numberAr: string;
  numberEn: string;
  titleAr: string;
  titleEn: string;
  color: string;
}

// Part colors assigned by index since Convex schema doesn't store color
const PART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
] as const;

const ARABIC_ORDINALS = [
  "الباب الأول",
  "الباب الثاني",
  "الباب الثالث",
  "الباب الرابع",
  "الباب الخامس",
  "الباب السادس",
  "الباب السابع",
  "الباب الثامن",
  "الباب التاسع",
  "الباب العاشر",
] as const;

// ─── Article Row ──────────────────────────────────────────────────────────────

function ArticleRow({
  article,
  partColor,
  searchQuery,
}: {
  article: ConstitutionArticle;
  partColor: string;
  searchQuery: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const { lang, t } = useLanguage();
  const isAr = lang === "ar";

  const text = isAr ? article.textAr : article.textEn;
  const summary = isAr ? article.summaryAr : article.summaryEn;

  const highlightText = (str: string, query: string) => {
    if (!query) return str;
    const idx = str.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return str;
    return (
      <>
        {str.slice(0, idx)}
        <mark className="bg-yellow-200/60 dark:bg-yellow-700/40 text-inherit rounded-sm px-0.5">
          {str.slice(idx, idx + query.length)}
        </mark>
        {str.slice(idx + query.length)}
      </>
    );
  };

  return (
    <div className="border-b border-border last:border-0">
      <button
        className="w-full text-start py-4 flex items-start gap-4 hover:bg-muted/30 transition-colors rounded-lg px-2"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Article number */}
        <span
          className="font-mono text-xl font-bold flex-shrink-0 w-10 text-end leading-none mt-0.5"
          style={{ color: partColor }}
        >
          {article.number}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {article.amended && (
              <Badge variant="outline" className="text-xs px-1.5 py-0 border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/30">
                {t.amended}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {highlightText(summary, searchQuery)}
          </p>
        </div>

        <span className="text-muted-foreground flex-shrink-0 mt-0.5">
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </span>
      </button>

      {expanded && (
        <div className="px-2 pb-5">
          <div className="ms-14 flex flex-col gap-4">
            {/* Full text */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {t.fullText}
              </p>
              <p className="text-sm leading-relaxed text-foreground">
                {highlightText(text, searchQuery)}
              </p>
            </div>

            {/* Amendment diff */}
            {article.amended && article.originalTextAr && (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-amber-600 hover:text-amber-700 px-0 h-auto text-xs font-medium"
                  onClick={() => setShowDiff((v) => !v)}
                >
                  {showDiff ? "−" : "+"} {t.compareAmendment}
                </Button>
                {showDiff && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div className="p-4 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40">
                      <p className="text-xs font-semibold mb-2 text-red-600 dark:text-red-400">
                        {t.before} (2014)
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {isAr ? article.originalTextAr : article.originalTextEn}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
                      <p className="text-xs font-semibold mb-2 text-emerald-600 dark:text-emerald-400">
                        {t.after} (2019)
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Link to full article page */}
            <Link
              href={`/constitution/article/${article.number}`}
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              {isAr ? `عرض المادة ${article.number} كاملة ←` : `View Article ${article.number} →`}
            </Link>

            {/* Cross-references */}
            {article.crossRefs.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">{t.crossRefs}:</span>
                {article.crossRefs.map((ref) => (
                  <Badge
                    key={ref}
                    variant="outline"
                    className="text-xs px-1.5 py-0"
                    style={{ color: partColor, borderColor: partColor + "55" }}
                  >
                    {t.articleNumber} {ref}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConstitutionPage() {
  const { t, lang, dir } = useLanguage();
  const isAr = lang === "ar";
  // selectedPart stores a Convex-derived part ID (p1..p6) for article filtering
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAmendedOnly, setShowAmendedOnly] = useState(false);

  // Live Convex data
  const liveParts = useQuery(api.constitution.listParts);
  const liveAmendedArticles = useQuery(api.constitution.listAmendedArticles);
  const liveArticles = useQuery(api.constitution.listAllArticles);

  const isLoading = liveParts === undefined || liveAmendedArticles === undefined || liveArticles === undefined;

  // Build a partId lookup: Convex part _id → stable UI id by index
  const partIdMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (liveParts && liveParts.length > 0) {
      liveParts.forEach((p, idx) => {
        map[p._id] = `p${idx + 1}`;
      });
    }
    return map;
  }, [liveParts]);

  // Adapt Convex parts to UI shape — empty array when no data
  const parts: ConstitutionPart[] = useMemo(() => {
    if (!liveParts || liveParts.length === 0) return [];
    return liveParts.map((p, idx) => ({
      id: `p${idx + 1}`,
      numberAr: ARABIC_ORDINALS[idx] ?? `الباب ${idx + 1}`,
      numberEn: `Part ${p.partNumber}`,
      titleAr: p.titleAr,
      titleEn: p.titleEn,
      color: PART_COLORS[idx % PART_COLORS.length],
    }));
  }, [liveParts]);

  // Adapt Convex articles to UI shape — empty array when no data
  const allArticles: ConstitutionArticle[] = useMemo(() => {
    if (!liveArticles || liveArticles.length === 0) return [];
    return liveArticles
      .map((a) => ({
        id: a._id,
        number: a.articleNumber,
        partId: partIdMap[a.partId] ?? a.partId,
        textAr: a.textAr,
        textEn: a.textEn,
        summaryAr: a.summaryAr ?? "",
        summaryEn: a.summaryEn ?? "",
        amended: a.wasAmended2019,
        originalTextAr: a.originalTextAr,
        originalTextEn: a.originalTextEn,
        crossRefs: [],
      }))
      .sort((a, b) => a.number - b.number);
  }, [liveArticles, partIdMap]);

  const amendedCount = liveAmendedArticles?.length ?? allArticles.filter((a) => a.amended).length;

  const fuse = useMemo(
    () =>
      new Fuse(allArticles, {
        keys: ["textAr", "textEn", "summaryAr", "summaryEn"],
        threshold: 0.35,
        includeScore: true,
      }),
    [allArticles]
  );

  const filteredArticles = useMemo(() => {
    let result = allArticles;
    if (searchQuery) {
      result = fuse.search(searchQuery).map((r) => r.item);
    }
    if (selectedPart) {
      result = result.filter((a) => a.partId === selectedPart);
    }
    if (showAmendedOnly) {
      result = result.filter((a) => a.amended);
    }
    return result;
  }, [searchQuery, selectedPart, showAmendedOnly, fuse, allArticles]);

  const partById = useMemo(
    () => Object.fromEntries(parts.map((p) => [p.id, p])),
    [parts]
  );

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page flex flex-col gap-8">

        {/* Page header */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {isAr ? "2014 · تعديلات 2019" : "2014 · Amended 2019"}
          </p>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t.constitutionTitle}</h1>
          <p className="text-muted-foreground">{t.constitutionDesc}</p>
        </div>

        {/* Quick stats — borderless */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{isAr ? "إجمالي المواد" : "Total Articles"}</p>
            <p className="font-mono text-3xl font-bold tabular-nums">247</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">{isAr ? "معدّلة 2019" : "Amended 2019"}</p>
            <p className="font-mono text-3xl font-bold tabular-nums">{amendedCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">{isAr ? "الأبواب" : "Parts"}</p>
            <p className="font-mono text-3xl font-bold tabular-nums">6</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">{isAr ? "صدر" : "Enacted"}</p>
            <p className="font-mono text-3xl font-bold tabular-nums">2014</p>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="flex gap-8 items-start">

          {/* Sidebar TOC — desktop only */}
          <aside className="hidden md:block flex-shrink-0 w-52 sticky top-[calc(3.5rem+1.5rem)]">
            <ScrollArea className="h-[calc(100vh-12rem)]">
              <div className="flex flex-col gap-0.5 pe-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  {t.tableOfContents}
                </p>
                <Skeleton name="constitution-toc" loading={isLoading}>
                <>
                <button
                  onClick={() => setSelectedPart(null)}
                  className={cn(
                    "text-start px-3 py-2 rounded text-sm transition-colors w-full",
                    !selectedPart
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  {isAr ? "جميع الأبواب" : "All Parts"}
                </button>
                {parts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPart(p.id === selectedPart ? null : p.id)}
                    className={cn(
                      "text-start px-3 py-2 rounded text-xs transition-colors flex items-center gap-2 w-full leading-snug",
                      selectedPart === p.id
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5" style={{ background: p.color }} />
                    {isAr ? p.titleAr : p.titleEn}
                  </button>
                ))}
                </>
                </Skeleton>
              </div>
            </ScrollArea>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">

            {/* Search + filter row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.articleSearch}
                  className="ps-9 pe-8 text-sm"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchQuery("")}
                    className="absolute end-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  >
                    <X size={14} />
                  </Button>
                )}
              </div>

              <Button
                variant={showAmendedOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowAmendedOnly((v) => !v)}
                className="text-sm whitespace-nowrap"
              >
                {t.amended}
              </Button>
            </div>

            {/* Mobile part pills */}
            <div className="flex gap-2 flex-wrap md:hidden">
              <Skeleton name="constitution-part-pills" loading={isLoading}>
              <>
              <Badge
                variant={!selectedPart ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedPart(null)}
              >
                {isAr ? "الكل" : "All"}
              </Badge>
              {parts.map((p) => (
                <Badge
                  key={p.id}
                  variant="outline"
                  className="cursor-pointer"
                  style={
                    selectedPart === p.id
                      ? { background: p.color, color: "#fff", borderColor: p.color }
                      : { borderColor: p.color, color: p.color }
                  }
                  onClick={() => setSelectedPart(p.id === selectedPart ? null : p.id)}
                >
                  {isAr ? p.numberAr.replace("الباب ", "") : p.numberEn}
                </Badge>
              ))}
              </>
              </Skeleton>
            </div>

            {/* Result count */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {isAr
                  ? `عرض ${filteredArticles.length} مادة من ${allArticles.length}`
                  : `Showing ${filteredArticles.length} of ${allArticles.length} articles`}
              </p>
              <a
                href="https://presidency.eg"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                presidency.eg
              </a>
            </div>

            {/* Article list */}
            <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
              {filteredArticles.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  {t.noResults}
                </div>
              ) : (
                filteredArticles.map((article) => {
                  const partColor = partById[article.partId]?.color ?? "var(--chart-1)";
                  return (
                    <ArticleRow
                      key={article.id}
                      article={article}
                      partColor={partColor}
                      searchQuery={searchQuery}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
