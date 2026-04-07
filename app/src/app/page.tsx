"use client";

import { Fragment } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Building2, BookOpen, BarChart3, TrendingDown, Landmark,
  ExternalLink, Clock, Scale, ChevronLeft, ChevronRight,
  LineChart, Heart, MapPin, Calculator, Bot, BookMarked,
} from "lucide-react";
import { useLanguage, useCurrency } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AiPipelineStatus } from "@/components/ai-pipeline-status";
import { SanadBadge } from "@/components/sanad-badge";

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

const featureGroups = [
  {
    labelAr: "الحكومة",
    labelEn: "Government",
    cards: [
      { icon: Building2, href: "/government", ar: "الحكومة", en: "Government", descAr: "الرئيس · الوزراء · البرلمان · المحافظات", descEn: "President · Ministers · Parliament · Governorates" },
    ],
  },
  {
    labelAr: "البيانات",
    labelEn: "Data",
    cards: [
      { icon: LineChart, href: "/economy", ar: "الاقتصاد", en: "Economy", descAr: "مؤشرات اقتصادية · التضخم · الاحتياطي", descEn: "GDP · Inflation · Reserves · Exchange Rate" },
      { icon: BarChart3, href: "/budget", ar: "الموازنة", en: "Budget", descAr: "الإيرادات · المصروفات · العجز", descEn: "Revenue · Expenditure · Deficit" },
      { icon: TrendingDown, href: "/debt", ar: "الدين العام", en: "Debt", descAr: "١٥٥ مليار$ ديون خارجية", descEn: "$155B External Debt" },
      { icon: Landmark, href: "/elections", ar: "الانتخابات", en: "Elections", descAr: "نتائج الانتخابات الرئاسية والبرلمانية", descEn: "Presidential & parliamentary election results" },
    ],
  },
  {
    labelAr: "الأدوات",
    labelEn: "Tools",
    cards: [
      { icon: Calculator, href: "/budget/your-share", ar: "حاسبة الضريبة", en: "Tax Calculator", descAr: "أين تذهب ضرائبك؟ — حاسبة تفاعلية", descEn: "Where do your taxes go? — Interactive calculator" },
      { icon: MapPin, href: "/governorate", ar: "محافظتك", en: "Your Governorate", descAr: "بيانات محافظتك · المحافظ · النواب", descEn: "Governor · MPs · Local stats" },
    ],
  },
  {
    labelAr: "حول الموقع والشفافية",
    labelEn: "About & Transparency",
    cards: [
      { icon: BookOpen, href: "/constitution", ar: "الدستور", en: "Constitution", descAr: "٢٤٧ مادة · تعديلات ٢٠١٩", descEn: "247 Articles · 2019 Amendments" },
      { icon: Bot, href: "/transparency", ar: "الشفافية", en: "Transparency", descAr: "سجل تحديث البيانات · تقارير الذكاء الاصطناعي", descEn: "AI audit log · Data refresh reports" },
      { icon: BookMarked, href: "/methodology", ar: "المنهجية", en: "Methodology", descAr: "كيف نجمع البيانات · مصادر رسمية", descEn: "How we gather data · Official sources" },
    ],
  },
  {
    labelAr: "الدعم",
    labelEn: "Support",
    cards: [
      { icon: Heart, href: "/funding", ar: "التمويل", en: "Funding", descAr: "التمويل الشفاف · أين تذهب التبرعات", descEn: "Transparent funding · Where donations go" },
    ],
  },
];

// Stats are now fetched live via getHomeStats query — see below in HomePage component

const sources = [
  { ar: "مجلس النواب — قائمة الأعضاء", en: "Parliament — Members List", url: "https://www.parliament.gov.eg/en/MPs", domain: "parliament.gov.eg/en/MPs" },
  { ar: "الأهرام أونلاين — التشكيل الوزاري", en: "Ahram Online — Cabinet Lineup", url: "https://english.ahram.org.eg/News/562168.aspx", domain: "ahram.org.eg" },
  { ar: "وزارة المالية — البيانات المالية", en: "MOF — Financial Statements", url: "https://www.mof.gov.eg/en/posts/statementsAndReports/5", domain: "mof.gov.eg/reports" },
  { ar: "البنك المركزي — النشرة الإحصائية", en: "CBE — Statistical Bulletin", url: "https://www.cbe.org.eg/en/economic-research/statistics", domain: "cbe.org.eg/statistics" },
  { ar: "البنك الدولي — بيانات مصر", en: "World Bank — Egypt Data", url: "https://data.worldbank.org/country/egypt-arab-rep", domain: "worldbank.org/egypt" },
  { ar: "صندوق النقد الدولي — تقارير مصر", en: "IMF — Egypt Reports", url: "https://www.imf.org/en/Countries/EGY", domain: "imf.org/EGY" },
];

export default function HomePage() {
  const { lang, dir } = useLanguage();
  const { symbol, fromUSD, fromEGP, fmt: fmtNum } = useCurrency();
  const isAr = lang === "ar";
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;
  const homeStats = useQuery(api.government.getHomeStats);

  const liveStats = homeStats ? [
    { value: homeStats.parliamentarians.value, ar: "إجمالي أعضاء البرلمان", en: "Total Parliamentarians", source: homeStats.parliamentarians.source, url: homeStats.parliamentarians.sourceUrl, sanadLevel: homeStats.parliamentarians.sanadLevel },
    { value: homeStats.governorates.value, ar: "محافظة", en: "Governorates", source: homeStats.governorates.source, url: homeStats.governorates.sourceUrl, sanadLevel: homeStats.governorates.sanadLevel },
    { value: homeStats.constitutionArticles.value, ar: "مادة دستورية", en: "Constitutional Articles", source: homeStats.constitutionArticles.source, url: homeStats.constitutionArticles.sourceUrl, sanadLevel: homeStats.constitutionArticles.sanadLevel },
    ...(homeStats.externalDebt ? [{ value: homeStats.externalDebt.value, ar: "مليار ديون خارجية", en: "B External Debt", source: homeStats.externalDebt.source, url: homeStats.externalDebt.sourceUrl, currencyUnit: "usd" as const, sanadLevel: homeStats.externalDebt.sanadLevel }] : []),
    ...(homeStats.domesticDebt && homeStats.domesticDebt.value > 0 ? [{
      value: homeStats.domesticDebt.value,
      ar: "مليار ديون محلية",
      en: "B Domestic Debt",
      source: homeStats.domesticDebt.source,
      url: homeStats.domesticDebt.sourceUrl,
      currencyUnit: "egp" as const,
      sanadLevel: homeStats.domesticDebt.sanadLevel,
    }] : []),
  ] : null;

  return (
    <div className="page-content" dir={dir}>

      {/* ════════ HERO ════════ */}
      <section className="container-page">
        <div className="relative max-w-2xl mx-auto text-center py-12 md:py-20">
          {/* Subtle radial glow behind title */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
            <div className="w-96 h-96 rounded-full opacity-[0.07]"
              style={{ background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)" }} />
          </div>

          <div className="relative">
            <Scale size={28} className="text-primary mx-auto mb-6 opacity-80" strokeWidth={1.5} />
            <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-4" style={{ lineHeight: 0.95 }}>
              {isAr ? "ميزان" : "Mizan"}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mb-2">
              {isAr ? "مصر، بالأرقام." : "Egypt, visualized."}
            </p>
            <p className="text-sm text-muted-foreground/60 mx-auto mb-6 max-w-sm leading-relaxed">
              {isAr
                ? "بيانات موثّقة عن البرلمان والوزارات والدستور والميزانية والديون."
                : "Cited data on parliament, ministries, constitution, budget, and debt."}
            </p>
            <p className="text-xs text-muted-foreground/40 mx-auto mb-10 max-w-md leading-relaxed">
              {isAr
                ? "هذا الموقع يُدار بالكامل بواسطة الذكاء الاصطناعي — من جمع البيانات إلى التحقق والعرض. اعرف المزيد في صفحات الشفافية والمنهجية."
                : "This site is fully managed by AI — from data collection to verification and display. Learn more on the Transparency and Methodology pages."}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
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
      </section>

      {/* ════════ AI PIPELINE STATUS ════════ */}
      <AiPipelineStatus />

      {/* ════════ STATS (live from Convex) ════════ */}
      <section className="container-page">
        <div className="border border-border rounded-xl bg-card/50">
          <div className="grid grid-cols-2 md:grid-cols-4 [&>*:not(:first-child)]:border-s [&>*:not(:first-child)]:border-border">
            {liveStats ? liveStats.map((s) => (
              <Stat key={s.source} value={s.value}
                label={isAr ? s.ar : s.en} source={s.source} sourceUrl={s.url}
                currencyUnit={s.currencyUnit} sanadLevel={s.sanadLevel}
                symbol={symbol} fromUSD={fromUSD} fromEGP={fromEGP} fmtNum={fmtNum}
              />
            )) : (
              /* Skeleton while loading */
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

      {/* ════════ FEATURES ════════ */}
      <section className="container-page py-16 md:py-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {featureGroups.map((group, groupIdx) => {
            const cardOffset = featureGroups
              .slice(0, groupIdx)
              .reduce((acc, g) => acc + g.cards.length, 0);
            return (
              <Fragment key={groupIdx}>
                {/* Section header */}
                <div className="col-span-full mt-4 first:mt-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                    {isAr ? group.labelAr : group.labelEn}
                  </p>
                </div>
                {/* Cards */}
                {group.cards.map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <Link
                      key={f.href}
                      href={f.href}
                      className="no-underline group animate-fade-up"
                      style={{ animationDelay: `${(cardOffset + i) * 80}ms` }}
                    >
                      <Card className="h-full border-border/60 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:bg-card">
                        <CardContent className="p-6 flex flex-col h-full">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 transition-colors group-hover:bg-primary/20">
                            <Icon size={20} strokeWidth={1.5} />
                          </div>
                          <h3 className="text-base font-bold mb-1 group-hover:text-primary transition-colors">
                            {isAr ? f.ar : f.en}
                          </h3>
                          <p className="text-xs text-muted-foreground mb-4 flex-1">
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
              </Fragment>
            );
          })}
        </div>
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
              ? "كل البيانات تُجمع وتُحقق وتُحدث تلقائياً كل ٦ ساعات بواسطة وكلاء ذكاء اصطناعي. الكود نفسه يُكتب بواسطة الذكاء الاصطناعي ويُراجع آلياً."
              : "All data is collected, verified, and refreshed every 6 hours by AI agents. The code itself is written by AI and auto-reviewed."}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href="/transparency" className="no-underline group">
              <div className="border border-border rounded-lg p-4 hover:border-primary/40 transition-colors">
                <p className="text-sm font-semibold group-hover:text-primary transition-colors">
                  {isAr ? "الشفافية" : "Transparency"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isAr ? "سجل كامل لكل تحديث بيانات وقرارات الوكلاء" : "Full audit log of every data update and agent decision"}
                </p>
              </div>
            </Link>
            <Link href="/methodology" className="no-underline group">
              <div className="border border-border rounded-lg p-4 hover:border-primary/40 transition-colors">
                <p className="text-sm font-semibold group-hover:text-primary transition-colors">
                  {isAr ? "المنهجية" : "Methodology"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isAr ? "كيف نجمع البيانات ونتحقق منها من مصادر رسمية" : "How we collect and verify data from official sources"}
                </p>
              </div>
            </Link>
            <a href="https://github.com/Ba3lisa/mizan" target="_blank" rel="noopener noreferrer" className="no-underline group">
              <div className="border border-border rounded-lg p-4 hover:border-primary/40 transition-colors">
                <p className="text-sm font-semibold group-hover:text-primary transition-colors inline-flex items-center gap-1.5">
                  GitHub <ExternalLink size={12} />
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isAr ? "الكود مفتوح المصدر — ساهم أو راجع بنفسك" : "Open source — contribute or audit the code yourself"}
                </p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ════════ FOR AI AGENTS ════════ */}
      <section className="container-page py-10">
        <div className="flex items-center gap-2 mb-2">
          <Bot size={16} className="text-primary" />
          <h2 className="text-sm font-bold">
            {isAr ? "للذكاء الاصطناعي والوكلاء" : "For AI Agents & LLMs"}
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4 max-w-lg">
          {isAr
            ? "بيانات ميزان متاحة بتنسيق مُحسّن للذكاء الاصطناعي. يمكن لنماذج اللغة والوكلاء قراءة جميع البيانات مباشرةً."
            : "Mizan data is available in LLM-optimized formats. Language models and AI agents can read all data directly."}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a href="/llms.txt" className="no-underline group">
            <div className="border border-border rounded-lg p-4 hover:border-blue-500/40 transition-colors">
              <p className="text-sm font-semibold group-hover:text-blue-500 transition-colors inline-flex items-center gap-1.5 font-mono">
                /llms.txt <ExternalLink size={12} />
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isAr
                  ? "ملخص هيكلي لجميع البيانات والمصادر — مثالي لنافذة سياق الذكاء الاصطناعي"
                  : "Structured overview of all data and sources — ideal for LLM context windows"}
              </p>
            </div>
          </a>
          <a href="/llms-full.txt" className="no-underline group">
            <div className="border border-border rounded-lg p-4 hover:border-blue-500/40 transition-colors">
              <p className="text-sm font-semibold group-hover:text-blue-500 transition-colors inline-flex items-center gap-1.5 font-mono">
                /llms-full.txt <ExternalLink size={12} />
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isAr
                  ? "تصدير كامل لجميع البيانات بتنسيق Markdown — يُحدَّث كل ٦ ساعات"
                  : "Full data export in Markdown — refreshed every 6 hours with the pipeline"}
              </p>
            </div>
          </a>
        </div>
        <p className="text-[0.65rem] text-muted-foreground/50 mt-2">
          {isAr
            ? "يدعم أيضاً WebMCP — وكلاء Chrome AI يمكنها اكتشاف أدوات ميزان تلقائياً."
            : "Also supports WebMCP — Chrome AI agents can auto-discover Mizan tools via navigator.modelContext."}
        </p>
      </section>

      {/* ════════ SOURCES ════════ */}
      <section className="container-page pb-16">
        <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h2 className="text-sm font-bold mb-1">
              {isAr ? "مصادر البيانات" : "Data Sources"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isAr ? "جميع البيانات من منشورات رسمية موثقة." : "All data from official, verifiable publications."}
            </p>
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
