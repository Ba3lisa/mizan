"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  ExternalLink, Clock, Scale, ChevronLeft, ChevronRight,
  ArrowRight, ArrowLeft, Bot, TrendingDown, BarChart3,
} from "lucide-react";
import { DailyPoll } from "@/components/daily-poll";
import { useLanguage, useCurrency } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AiPipelineStatus } from "@/components/ai-pipeline-status";
import { SanadBadge } from "@/components/sanad-badge";

/* ─── Stat counter used in the metrics strip ─── */
function Stat({ value, label, source, sourceUrl, currencyUnit, sanadLevel, symbol, fromUSD, fromEGP, fmtNum }: {
  value: number; label: string; source: string; sourceUrl: string;
  currencyUnit?: "usd" | "egp"; sanadLevel?: number;
  symbol: string; fromUSD: (v: number) => number; fromEGP: (v: number) => number;
  fmtNum: (v: number, opts?: { decimals?: number }) => string;
}) {
  let display: string;
  if (currencyUnit === "usd") {
    display = `${symbol}${fmtNum(fromUSD(value), { decimals: 1 })}`;
  } else if (currencyUnit === "egp") {
    display = `${symbol}${fmtNum(fromEGP(value), { decimals: 1 })}`;
  } else {
    display = Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  }
  return (
    <div className="text-center py-5">
      <div className="font-mono text-3xl md:text-4xl font-bold tracking-tighter tabular-nums text-foreground inline-flex items-center gap-2 justify-center" style={{ direction: "ltr", unicodeBidi: "isolate" }}>
        {display}
        {sanadLevel && <SanadBadge sanadLevel={sanadLevel} sourceUrl={sourceUrl} />}
      </div>
      <p className="text-[0.65rem] text-muted-foreground mt-1.5 uppercase tracking-widest font-medium">{label}</p>
      <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
        className="text-[0.625rem] text-primary/60 hover:text-primary no-underline hover:underline inline-flex items-center gap-0.5 mt-1 transition-colors">
        <ExternalLink size={8} /> {source}
      </a>
    </div>
  );
}

/* ─── Feature card groups — derived from shared navigation config ─── */
import { NAV_GROUPS } from "@/lib/navigation";

const sources = [
  { ar: "مجلس النواب — قائمة الأعضاء", en: "Parliament — Members List", url: "https://www.parliament.gov.eg/en/MPs", domain: "parliament.gov.eg" },
  { ar: "وزارة المالية — البيانات المالية", en: "MOF — Financial Statements", url: "https://www.mof.gov.eg/en/posts/statementsAndReports/5", domain: "mof.gov.eg" },
  { ar: "البنك المركزي — النشرة الإحصائية", en: "CBE — Statistical Bulletin", url: "https://www.cbe.org.eg/en/economic-research/statistics", domain: "cbe.org.eg" },
  { ar: "البنك الدولي — بيانات مصر", en: "World Bank — Egypt Data", url: "https://data.worldbank.org/country/egypt-arab-rep", domain: "worldbank.org" },
  { ar: "صندوق النقد الدولي — تقارير مصر", en: "IMF — Egypt Reports", url: "https://www.imf.org/en/Countries/EGY", domain: "imf.org" },
];

export default function HomePage() {
  const { lang, dir } = useLanguage();
  const { symbol, fromUSD, fromEGP, fmt: fmtNum } = useCurrency();
  const router = useRouter();
  const isAr = lang === "ar";
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;
  const homeStats = useQuery(api.government.getHomeStats);

  /* Build live stat cards from query */
  const liveStats = homeStats ? [
    { value: homeStats.parliamentarians.value, ar: "عضو برلمان", en: "Parliamentarians", source: homeStats.parliamentarians.source, url: homeStats.parliamentarians.sourceUrl, sanadLevel: homeStats.parliamentarians.sanadLevel },
    { value: homeStats.ministries.value, ar: "وزارة", en: "Ministries", source: homeStats.ministries.source, url: homeStats.ministries.sourceUrl, sanadLevel: homeStats.ministries.sanadLevel },
    { value: homeStats.constitutionArticles.value, ar: "مادة دستورية", en: "Constitutional Articles", source: homeStats.constitutionArticles.source, url: homeStats.constitutionArticles.sourceUrl, sanadLevel: homeStats.constitutionArticles.sanadLevel },
    { value: homeStats.governorates.value, ar: "محافظة", en: "Governorates", source: homeStats.governorates.source, url: homeStats.governorates.sourceUrl, sanadLevel: homeStats.governorates.sanadLevel },
  ] : null;

  /* Total debt computation */
  const totalDebt = homeStats?.totalDebt;

  return (
    <div className="page-content" dir={dir}>

      {/* ════════ HERO + DAILY POLL ════════ */}
      <section className="container-page">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start py-12 md:py-20">
          {/* Hero content */}
          <div className="relative max-w-2xl mx-auto lg:mx-0 text-center lg:text-start">
            {/* Subtle radial glow behind title */}
            <div className="absolute inset-0 flex items-center justify-center lg:justify-start pointer-events-none" aria-hidden>
              <div className="w-96 h-96 rounded-full opacity-[0.07]"
                style={{ background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)" }} />
            </div>

            <div className="relative">
              <Scale size={28} className="text-primary mx-auto lg:mx-0 mb-6 opacity-80" strokeWidth={1.5} />
              <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-4" style={{ lineHeight: 0.95 }}>
                {isAr ? "ميزان" : "Mizan"}
              </h1>
              <p className="text-base md:text-lg text-muted-foreground mb-2">
                {isAr ? "مصر، بالأرقام." : "Egypt, visualized."}
              </p>
              <p className="text-sm text-muted-foreground/60 mx-auto lg:mx-0 mb-6 max-w-sm leading-relaxed">
                {isAr
                  ? "بيانات موثّقة عن البرلمان والوزارات والدستور والميزانية والديون."
                  : "Cited data on parliament, ministries, constitution, budget, and debt."}
              </p>
              <p className="text-xs text-muted-foreground/40 mx-auto lg:mx-0 mb-10 max-w-md leading-relaxed">
                {isAr
                  ? "هذا الموقع يُدار بالكامل بواسطة الذكاء الاصطناعي — من جمع البيانات إلى التحقق والعرض. اعرف المزيد في صفحات الشفافية والمنهجية."
                  : "This site is fully managed by AI — from data collection to verification and display. Learn more on the Transparency and Methodology pages."}
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                <Button asChild size="lg" className="gap-2 rounded-full px-7 font-bold">
                  <Link href="/government">
                    {isAr ? "استكشاف الحكومة" : "Explore Government"}
                    <Chevron size={16} />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full px-7">
                  <Link href="/constitution">{isAr ? "الدستور" : "Constitution"}</Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Daily Poll sidebar */}
          <div className="lg:sticky lg:top-24 w-full max-w-sm mx-auto lg:mx-0">
            <DailyPoll />
          </div>
        </div>
      </section>

      {/* ════════ AI PIPELINE STATUS ════════ */}
      <AiPipelineStatus />

      {/* ════════ GOVERNANCE METRICS STRIP ════════ */}
      <section className="container-page">
        <div className="border border-border rounded-xl bg-card/50">
          <div className="grid grid-cols-2 md:grid-cols-4 [&>*:not(:first-child)]:border-s [&>*:not(:first-child)]:border-border">
            {liveStats ? liveStats.map((s) => (
              <Stat key={s.source} value={s.value}
                label={isAr ? s.ar : s.en} source={s.source} sourceUrl={s.url}
                sanadLevel={s.sanadLevel}
                symbol={symbol} fromUSD={fromUSD} fromEGP={fromEGP} fmtNum={fmtNum}
              />
            )) : (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="text-center py-5">
                  <div className="h-10 w-20 mx-auto bg-muted/20 animate-pulse rounded mb-2" />
                  <div className="h-3 w-28 mx-auto bg-muted/10 animate-pulse rounded" />
                </div>
              ))
            )}
          </div>
        </div>
      </section>


      {/* ════════ TOTAL DEBT HIGHLIGHT ════════ */}
      {totalDebt && totalDebt.value > 0 && (
        <section className="container-page pt-6">
          {/* Use div+onClick instead of Link to avoid <a> nesting with SanadBadge */}
          <div
            onClick={() => router.push("/debt")}
            className="no-underline group block cursor-pointer"
          >
            <div className="border border-border rounded-xl bg-card/50 px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center flex-shrink-0">
                  <TrendingDown size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">
                    {isAr ? "إجمالي الدين العام" : "Total Public Debt"}
                  </p>
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="font-mono text-2xl md:text-3xl font-bold tracking-tighter tabular-nums text-foreground flex items-center gap-1.5" dir="ltr">
                      {symbol}{fmtNum(
                        fromUSD(homeStats.externalDebt?.value ?? 0) +
                        fromEGP(homeStats.domesticDebt?.value ?? 0),
                        { decimals: 1 }
                      )} {isAr ? "مليار" : "B"}
                    </span>
                    {totalDebt.debtToGdpRatio && (
                      <span className="text-sm text-muted-foreground font-mono">
                        {totalDebt.debtToGdpRatio.toFixed(1)}% {isAr ? "من الناتج المحلي" : "of GDP"}
                      </span>
                    )}
                    <SanadBadge sanadLevel={totalDebt.sanadLevel} sourceUrl={totalDebt.sourceUrl} />
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground/70">
                    {homeStats?.externalDebt && (
                      <span className="flex items-center gap-1.5">
                        <span>{isAr ? "خارجي:" : "External:"}</span>
                        <span dir="ltr" className="inline-block whitespace-nowrap">
                          {symbol}{fmtNum(fromUSD(homeStats.externalDebt.value), { decimals: 1 })} {isAr ? "مليار" : "B"}
                        </span>
                      </span>
                    )}
                    {homeStats?.domesticDebt && (
                      <span className="flex items-center gap-1.5">
                        <span>{isAr ? "داخلي:" : "Domestic:"}</span>
                        <span dir="ltr" className="inline-block whitespace-nowrap">
                          {symbol}{fmtNum(fromEGP(homeStats.domesticDebt.value), { decimals: 1 })} {isAr ? "مليار" : "B"}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <span className="text-sm font-semibold text-primary/70 group-hover:text-primary inline-flex items-center gap-1.5 transition-all flex-shrink-0">
                {isAr ? "تفاصيل الدين" : "Debt Details"} <Arrow size={14} />
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ════════ BUDGET SNAPSHOT ════════ */}
      {homeStats?.budget && (homeStats.budget.totalRevenue > 0 || homeStats.budget.totalExpenditure > 0) && (
        <section className="container-page pt-4">
          {/* Use div+onClick instead of Link to avoid potential <a> nesting issues */}
          <div
            onClick={() => router.push("/budget")}
            className="no-underline group block cursor-pointer"
          >
            <div className="border border-border rounded-xl bg-card/50 px-6 py-5 hover:border-primary/40 transition-colors">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <BarChart3 size={24} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">
                      {isAr ? `موازنة ${homeStats.budget.year}` : `${homeStats.budget.year} Budget`}
                    </p>
                    <div className="flex items-center gap-6 flex-wrap">
                      <div>
                        <span className="text-xs text-muted-foreground">{isAr ? "إيرادات" : "Revenue"}</span>
                        <p className="font-mono text-lg font-bold tabular-nums" style={{ direction: "ltr", unicodeBidi: "isolate" }}>
                          {symbol}{fmtNum(fromEGP(homeStats.budget.totalRevenue), { decimals: 0 })} {isAr ? "مليار" : "B"}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">{isAr ? "مصروفات" : "Expenditure"}</span>
                        <p className="font-mono text-lg font-bold tabular-nums" style={{ direction: "ltr", unicodeBidi: "isolate" }}>
                          {symbol}{fmtNum(fromEGP(homeStats.budget.totalExpenditure), { decimals: 0 })} {isAr ? "مليار" : "B"}
                        </p>
                      </div>
                      {homeStats.budget.deficit !== 0 && (
                        <div>
                          <span className="text-xs text-muted-foreground">{isAr ? "العجز" : "Deficit"}</span>
                          <p className="font-mono text-lg font-bold tabular-nums text-destructive" style={{ direction: "ltr", unicodeBidi: "isolate" }}>
                            {symbol}{fmtNum(fromEGP(Math.abs(homeStats.budget.deficit)), { decimals: 0 })} {isAr ? "مليار" : "B"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-sm font-semibold text-primary/70 group-hover:text-primary inline-flex items-center gap-1.5 transition-all flex-shrink-0">
                  {isAr ? "استكشف الموازنة" : "Explore Budget"} <Arrow size={14} />
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ════════ GROUPED FEATURES ════════ */}
      <section className="container-page py-16 md:py-24">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.en} className={gi > 0 ? "mt-10" : ""}>
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
              {isAr ? group.ar : group.en}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {group.items.map((f, i) => {
                const Icon = f.icon;
                return (
                  <Link key={f.href} href={f.href} className="no-underline group animate-fade-up" style={{ animationDelay: `${(gi * 4 + i) * 60}ms` }}>
                    <Card className="h-full border-border/60 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:bg-card">
                      <CardContent className="p-5 flex flex-col h-full">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 transition-colors group-hover:bg-primary/20">
                          <Icon size={20} strokeWidth={1.5} />
                        </div>
                        <h3 className="text-base font-bold mb-1 group-hover:text-primary transition-colors">
                          {isAr ? f.ar : f.en}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-3 flex-1">
                          {isAr ? f.descAr : f.descEn}
                        </p>
                        <span className="text-xs font-semibold text-primary/70 group-hover:text-primary inline-flex items-center gap-1 transition-all">
                          {isAr ? "استكشف" : "Explore"} <Chevron size={12} />
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

      </section>

      {/* ════════ AI-MANAGED ════════ */}
      <section className="border-y border-border bg-card/30">
        <div className="container-page py-12 md:py-16">
          <div className="flex items-center gap-2 mb-2">
            <Bot size={16} className="text-primary" />
            <h2 className="text-sm font-bold">
              {isAr ? "موقع يُدار بالذكاء الاصطناعي" : "AI-Managed Platform"}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mb-6 max-w-lg">
            {isAr
              ? "كل البيانات تُجمع وتُحقق وتُحدث تلقائياً كل ٦ ساعات بواسطة وكلاء ذكاء اصطناعي."
              : "All data is collected, verified, and refreshed every 6 hours by AI agents."}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href="/transparency" className="no-underline group">
              <div className="border border-border rounded-lg p-4 hover:border-primary/40 transition-colors">
                <p className="text-sm font-semibold group-hover:text-primary transition-colors">{isAr ? "الشفافية" : "Transparency"}</p>
                <p className="text-xs text-muted-foreground mt-1">{isAr ? "سجل كامل لكل تحديث بيانات" : "Full audit log of every data update"}</p>
              </div>
            </Link>
            <Link href="/methodology" className="no-underline group">
              <div className="border border-border rounded-lg p-4 hover:border-primary/40 transition-colors">
                <p className="text-sm font-semibold group-hover:text-primary transition-colors">{isAr ? "المنهجية" : "Methodology"}</p>
                <p className="text-xs text-muted-foreground mt-1">{isAr ? "كيف نجمع البيانات من مصادر رسمية" : "How we collect data from official sources"}</p>
              </div>
            </Link>
            <a href="https://github.com/Ba3lisa/mizan" target="_blank" rel="noopener noreferrer" className="no-underline group">
              <div className="border border-border rounded-lg p-4 hover:border-primary/40 transition-colors">
                <p className="text-sm font-semibold group-hover:text-primary transition-colors inline-flex items-center gap-1.5">GitHub <ExternalLink size={12} /></p>
                <p className="text-xs text-muted-foreground mt-1">{isAr ? "الكود مفتوح المصدر" : "Open source — audit the code"}</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ════════ FOR AI AGENTS ════════ */}
      <section className="container-page py-10">
        <div className="flex items-center gap-2 mb-2">
          <Bot size={16} className="text-primary" />
          <h2 className="text-sm font-bold">{isAr ? "للذكاء الاصطناعي والوكلاء" : "For AI Agents & LLMs"}</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4 max-w-lg">
          {isAr
            ? "بيانات ميزان متاحة بتنسيق مُحسّن للذكاء الاصطناعي."
            : "Mizan data is available in LLM-optimized formats."}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a href="/llms.txt" className="no-underline group">
            <div className="border border-border rounded-lg p-4 hover:border-blue-500/40 transition-colors">
              <p className="text-sm font-semibold group-hover:text-blue-500 transition-colors inline-flex items-center gap-1.5 font-mono">/llms.txt <ExternalLink size={12} /></p>
              <p className="text-xs text-muted-foreground mt-1">{isAr ? "ملخص هيكلي لجميع البيانات" : "Structured overview for LLM context windows"}</p>
            </div>
          </a>
          <a href="/llms-full.txt" className="no-underline group">
            <div className="border border-border rounded-lg p-4 hover:border-blue-500/40 transition-colors">
              <p className="text-sm font-semibold group-hover:text-blue-500 transition-colors inline-flex items-center gap-1.5 font-mono">/llms-full.txt <ExternalLink size={12} /></p>
              <p className="text-xs text-muted-foreground mt-1">{isAr ? "تصدير كامل بتنسيق Markdown" : "Full data export in Markdown"}</p>
            </div>
          </a>
        </div>
      </section>

      {/* ════════ SOURCES ════════ */}
      <section className="container-page pb-16">
        <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h2 className="text-sm font-bold mb-1">{isAr ? "مصادر البيانات" : "Data Sources"}</h2>
            <p className="text-xs text-muted-foreground">{isAr ? "جميع البيانات من منشورات رسمية موثقة." : "All data from official, verifiable publications."}</p>
          </div>
          <span className="last-updated"><span className="pulse-dot" /> {isAr ? "أبريل ٢٠٢٦" : "Apr 2026"}</span>
        </div>
        <Card className="overflow-hidden border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-0 divide-y divide-border">
            {sources.map((s) => (
              <div key={s.domain} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                <span className="text-sm">{isAr ? s.ar : s.en}</span>
                <a href={s.url} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-primary no-underline hover:underline inline-flex items-center gap-1.5 flex-shrink-0">
                  {s.domain} <ExternalLink size={12} />
                </a>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="flex items-center justify-between mt-3 flex-wrap gap-3">
          <p className="text-xs text-muted-foreground/60 inline-flex items-center gap-1.5">
            <Clock size={11} /> {isAr ? "تحديث تلقائي كل ٦ ساعات" : "Auto-refreshed every 6 hours"}
          </p>
          <Link href="/methodology" className="text-xs text-primary no-underline hover:underline inline-flex items-center gap-1 font-medium">
            {isAr ? "تعرف على منهجيتنا ←" : "Learn more about our methodology →"}
          </Link>
        </div>
      </section>
    </div>
  );
}
