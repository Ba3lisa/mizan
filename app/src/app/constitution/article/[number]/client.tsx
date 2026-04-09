"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useLanguage } from "@/components/providers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataSourceFooter } from "@/components/data-source";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ChevronRight, ArrowLeft, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

function ArticleNav({
  current: current,
  isAr,
}: {
  current: number;
  isAr: boolean;
}) {
  const hasPrev = current > 1;
  const hasNext = current < 247;

  return (
    <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
      {hasPrev ? (
        <Link
          href={`/constitution/article/${current - 1}`}
          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
        >
          <ArrowLeft size={14} />
          {isAr ? `المادة ${current - 1}` : `Article ${current - 1}`}
        </Link>
      ) : (
        <span />
      )}
      {hasNext && (
        <Link
          href={`/constitution/article/${current + 1}`}
          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
        >
          {isAr ? `المادة ${current + 1}` : `Article ${current + 1}`}
          <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}

export default function ArticlePageClient({ number }: { number: string }) {
  const { lang, dir } = useLanguage();
  const isAr = lang === "ar";
  const [showOriginal, setShowOriginal] = useState(false);

  const n = parseInt(number, 10);
  const isValidNumber = !isNaN(n) && n >= 1 && n <= 247;

  const article = useQuery(
    api.seo.getArticleByNumber,
    isValidNumber ? { number: n } : "skip"
  );
  const isLoading = article === undefined && isValidNumber;
  const notFound = !isLoading && (article === null || !isValidNumber);

  const articleText = article ? (isAr ? article.textAr : article.textEn) : "";
  const summaryText = article
    ? isAr
      ? article.summaryAr ?? ""
      : article.summaryEn ?? ""
    : "";

  if (notFound) {
    return (
      <div className="page-content" dir={dir}>
        <div className="container-page text-center py-20">
          <p className="text-muted-foreground text-sm">
            {isAr ? "المادة غير موجودة" : "Article not found"}
          </p>
          <Link
            href="/constitution"
            className="text-primary hover:underline text-sm mt-4 inline-block"
          >
            {isAr ? "← العودة للدستور" : "← Back to Constitution"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page max-w-3xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-8">
          <Link href="/" className="hover:text-foreground">
            {isAr ? "الرئيسية" : "Home"}
          </Link>
          <ChevronRight size={10} />
          <Link href="/constitution" className="hover:text-foreground">
            {isAr ? "الدستور" : "Constitution"}
          </Link>
          <ChevronRight size={10} />
          <span className="text-foreground">
            {isAr ? `المادة ${n}` : `Article ${n}`}
          </span>
        </nav>

        <Skeleton name="article-content" loading={isLoading}>
          {/* Direct-answer paragraph for GEO */}
          {summaryText && (
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              {isAr
                ? `المادة ${n} من الدستور المصري: ${summaryText}`
                : `Article ${n} of the Egyptian Constitution: ${summaryText}`}
            </p>
          )}

          {/* Article header */}
          <div className="flex items-start gap-4 mb-6">
            <span className="font-mono text-5xl font-black text-primary tabular-nums leading-none flex-shrink-0">
              {n}
            </span>
            <div className="pt-2">
              <h1 className="text-xl font-bold mb-2">
                {isAr ? `المادة ${n}` : `Article ${n}`}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {isAr ? "دستور 2014" : "Constitution 2014"}
                </Badge>
                {article?.wasAmended2019 && (
                  <Badge
                    variant="outline"
                    className="text-xs border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/30"
                  >
                    {isAr ? "معدّلة 2019" : "Amended 2019"}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Article text */}
          <Card className="border-border/60 mb-6">
            <CardContent className="p-6">
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
                {articleText}
              </p>
            </CardContent>
          </Card>

          {/* Amendment comparison */}
          {article?.wasAmended2019 &&
            (article.originalTextAr ?? article.originalTextEn) && (
              <div className="mb-6">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-amber-600 hover:text-amber-700 px-0 h-auto text-sm font-medium mb-3"
                  onClick={() => setShowOriginal((v) => !v)}
                >
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${showOriginal ? "rotate-180" : ""}`}
                  />
                  {isAr ? "مقارنة نص ما قبل 2019" : "Compare pre-2019 text"}
                </Button>

                {showOriginal && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40">
                      <p className="text-xs font-semibold mb-2 text-red-600 dark:text-red-400">
                        {isAr ? "قبل التعديل (2014)" : "Before (2014)"}
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                        {isAr
                          ? article.originalTextAr
                          : article.originalTextEn}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
                      <p className="text-xs font-semibold mb-2 text-emerald-600 dark:text-emerald-400">
                        {isAr ? "بعد التعديل (2019)" : "After (2019)"}
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                        {articleText}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

          {/* Bilingual toggle note */}
          <Card className="border-border/40 bg-muted/30 mb-8">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">
                {isAr ? "النص الآخر" : "Other language"}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {isAr ? article?.textEn : article?.textAr}
              </p>
            </CardContent>
          </Card>

          {/* Back link */}
          <Link
            href="/constitution"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft size={14} />
            {isAr ? "عرض كل المواد" : "View all articles"}
          </Link>

          {isValidNumber && <ArticleNav current={n} isAr={isAr} />}
        </Skeleton>

        <DataSourceFooter category="constitution" />
      </div>
    </div>
  );
}
