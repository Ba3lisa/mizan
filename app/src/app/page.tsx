"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  ExternalLink, Scale, ChevronLeft, ChevronRight,
  ArrowRight, ArrowLeft, Bot, TrendingDown, BarChart3,
  Building2, Users, BookOpen, MapPin, LineChart, Calculator,
  Landmark, TrendingUp, Heart, BookMarked, Home,
} from "lucide-react";
import { DailyPoll } from "@/components/daily-poll";
import { useLanguage, useCurrency } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { AiPipelineStatus } from "@/components/ai-pipeline-status";
import { SanadBadge } from "@/components/sanad-badge";
import { NumberTicker } from "@/components/number-ticker";
import { EgyptMapSVG } from "@/components/egypt-map-svg";

/* ─── Animated stat for the hero metrics strip ─── */
function HeroStat({ value, label, sanadLevel, sourceUrl }: {
  value: number; label: string; sanadLevel?: number; sourceUrl?: string;
}) {
  return (
    <div className="text-center py-5 group">
      <div className="font-mono text-3xl md:text-4xl font-bold tracking-tighter tabular-nums text-foreground inline-flex items-center gap-2 justify-center" style={{ direction: "ltr", unicodeBidi: "isolate" }}>
        <NumberTicker value={value} delay={0.2} />
        {sanadLevel && sourceUrl && <SanadBadge sanadLevel={sanadLevel} sourceUrl={sourceUrl} />}
      </div>
      <p className="text-[0.65rem] text-muted-foreground mt-1.5 uppercase tracking-widest font-medium">{label}</p>
    </div>
  );
}

/* ─── Gradient section divider ─── */
function SectionDivider() {
  return <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent my-2" />;
}

/* ─── Bento card wrapper with hover effects ─── */
function BentoCard({ href, className, children, onClick }: {
  href?: string; className?: string; children: React.ReactNode; onClick?: () => void;
}) {
  const inner = (
    <div className={`
      relative overflow-hidden rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm
      transition-all duration-300 hover:border-primary/40 hover:bg-card
      hover:shadow-[0_0_30px_-5px_rgba(201,168,76,0.12)]
      hover:-translate-y-0.5 group h-full
      ${className ?? ""}
    `}>
      {children}
    </div>
  );

  if (href) {
    return <Link href={href} className="no-underline block h-full">{inner}</Link>;
  }
  if (onClick) {
    return <div onClick={onClick} className="cursor-pointer h-full">{inner}</div>;
  }
  return inner;
}


export default function HomePage() {
  const { lang, dir } = useLanguage();
  const { symbol, fromUSD, fromEGP, fmt: fmtNum } = useCurrency();
  const router = useRouter();
  const isAr = lang === "ar";
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;
  const homeStats = useQuery(api.government.getHomeStats);
  const governorates = useQuery(api.government.listGovernorates);

  const totalDebt = homeStats?.totalDebt;

  // Build map data from governorate populations
  const mapData = useMemo(() => {
    if (!governorates) return { data: [], max: 1 };
    const data = governorates
      .filter((g) => g.population)
      .map((g) => ({ id: g.geoJsonId, value: g.population! }));
    const max = Math.max(...data.map((d) => d.value), 1);
    return { data, max };
  }, [governorates]);

  return (
    <div className="page-content" dir={dir}>

      {/* ════════════════════════════════════════════════════
          HERO — Animated data hero with breathing gradient
         ════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Dot grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            backgroundImage: "radial-gradient(circle, var(--primary) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            opacity: 0.03,
          }}
        />

        {/* Breathing gradient glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
          <div className="w-[600px] h-[600px] rounded-full animate-hero-breathe"
            style={{ background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)" }}
          />
        </div>

        <div className="container-page relative">
          <div className="flex flex-col items-center text-center py-16 md:py-24">
            <Scale size={28} className="text-primary mb-6 opacity-80" strokeWidth={1.5} />
            <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-3" style={{ lineHeight: 0.95 }}>
              {isAr ? "ميزان" : "Mizan"}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mb-2">
              {isAr ? "مصر، بالأرقام." : "Egypt, visualized."}
            </p>
            <p className="text-sm text-muted-foreground/60 mb-8 max-w-md leading-relaxed">
              {isAr
                ? "بيانات موثّقة عن البرلمان والوزارات والدستور والميزانية والديون."
                : "Cited data on parliament, ministries, constitution, budget, and debt."}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="gap-2 rounded-full px-7 font-bold">
                <Link href="/government">
                  {isAr ? "استكشاف الحكومة" : "Explore Government"}
                  <Chevron size={16} />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full px-7">
                <Link href="/tools/tax-calculator">{isAr ? "أين تذهب ضرائبك؟" : "Where Do Your Taxes Go?"}</Link>
              </Button>
            </div>
          </div>

          {/* Animated metrics strip */}
          <div className="border border-border rounded-xl bg-card/50 mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 [&>*:not(:first-child)]:border-s [&>*:not(:first-child)]:border-border">
              {homeStats ? (
                <>
                  <HeroStat
                    value={homeStats.parliamentarians.value}
                    label={isAr ? "عضو برلمان" : "Parliamentarians"}
                    sanadLevel={homeStats.parliamentarians.sanadLevel}
                    sourceUrl={homeStats.parliamentarians.sourceUrl}
                  />
                  <HeroStat
                    value={homeStats.ministries.value}
                    label={isAr ? "وزارة" : "Ministries"}
                    sanadLevel={homeStats.ministries.sanadLevel}
                    sourceUrl={homeStats.ministries.sourceUrl}
                  />
                  <HeroStat
                    value={homeStats.constitutionArticles.value}
                    label={isAr ? "مادة دستورية" : "Constitutional Articles"}
                    sanadLevel={homeStats.constitutionArticles.sanadLevel}
                    sourceUrl={homeStats.constitutionArticles.sourceUrl}
                  />
                  <HeroStat
                    value={homeStats.governorates.value}
                    label={isAr ? "محافظة" : "Governorates"}
                    sanadLevel={homeStats.governorates.sanadLevel}
                    sourceUrl={homeStats.governorates.sourceUrl}
                  />
                </>
              ) : (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="text-center py-5">
                    <div className="h-10 w-20 mx-auto bg-muted/20 animate-pulse rounded mb-2" />
                    <div className="h-3 w-28 mx-auto bg-muted/10 animate-pulse rounded" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* AI Pipeline Status */}
      <AiPipelineStatus />

      <SectionDivider />

      {/* ════════════════════════════════════════════════════
          BENTO GRID — Variable-sized feature cards
         ════════════════════════════════════════════════════ */}
      <section className="container-page py-12 md:py-16">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6">
          {isAr ? "استكشف" : "Explore"}
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 auto-rows-[140px] md:auto-rows-[160px]">

          {/* ── Government — 2×2 hero card with mini map ── */}
          <BentoCard href="/governorate" className="col-span-2 row-span-2">
            <div className="absolute inset-0">
              <EgyptMapSVG data={mapData.data} maxValue={mapData.max} className="opacity-60" />
            </div>
            <div className="relative p-5 flex flex-col justify-end h-full bg-gradient-to-t from-card/90 via-card/40 to-transparent">
              <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center mb-2">
                <MapPin size={18} strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold group-hover:text-primary transition-colors">
                {isAr ? "المحافظات" : "Governorates"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isAr ? "خريطة تفاعلية · بيانات سكانية" : "Interactive map · Population data"}
              </p>
              <span className="text-xs font-semibold text-primary/70 group-hover:text-primary inline-flex items-center gap-1 mt-2 transition-all">
                {isAr ? "استكشف" : "Explore"} <Chevron size={12} />
              </span>
            </div>
          </BentoCard>

          {/* ── Government ── */}
          <BentoCard href="/government">
            <div className="p-4 flex flex-col h-full">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-auto">
                <Building2 size={16} strokeWidth={1.5} />
              </div>
              <div className="mt-auto">
                <p className="font-mono text-2xl font-bold tabular-nums text-foreground" dir="ltr">
                  {homeStats ? <NumberTicker value={homeStats.ministries.value} delay={0.3} /> : <span className="bg-muted/20 animate-pulse rounded inline-block w-8 h-7" />}
                </p>
                <h3 className="text-sm font-bold group-hover:text-primary transition-colors mt-0.5">
                  {isAr ? "الحكومة" : "Government"}
                </h3>
                <p className="text-[0.65rem] text-muted-foreground">{isAr ? "الرئيس · الوزراء" : "President · Ministers"}</p>
              </div>
            </div>
          </BentoCard>

          {/* ── Parliament ── */}
          <BentoCard href="/parliament">
            <div className="p-4 flex flex-col h-full">
              <div className="w-8 h-8 rounded-lg bg-chart-2/10 text-chart-2 flex items-center justify-center mb-auto">
                <Users size={16} strokeWidth={1.5} />
              </div>
              <div className="mt-auto">
                <p className="font-mono text-2xl font-bold tabular-nums text-foreground" dir="ltr">
                  {homeStats ? <NumberTicker value={homeStats.parliamentarians.value} delay={0.4} /> : <span className="bg-muted/20 animate-pulse rounded inline-block w-10 h-7" />}
                </p>
                <h3 className="text-sm font-bold group-hover:text-primary transition-colors mt-0.5">
                  {isAr ? "البرلمان" : "Parliament"}
                </h3>
                <p className="text-[0.65rem] text-muted-foreground">{isAr ? "مجلس النواب والشيوخ" : "House & Senate"}</p>
              </div>
            </div>
          </BentoCard>

          {/* ── Budget — wide 2×1 card ── */}
          <BentoCard href="/budget" className="col-span-2">
            <div className="p-4 flex items-center h-full gap-4">
              <div className="flex-shrink-0">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                  <BarChart3 size={18} strokeWidth={1.5} />
                </div>
                <h3 className="text-sm font-bold group-hover:text-primary transition-colors">
                  {isAr ? "الموازنة" : "Budget"}
                </h3>
                {homeStats?.budget && (
                  <p className="text-[0.6rem] text-muted-foreground mt-0.5">{homeStats.budget.year}</p>
                )}
              </div>
              {homeStats?.budget && (homeStats.budget.totalRevenue > 0 || homeStats.budget.totalExpenditure > 0) ? (
                <div className="flex-1 flex items-end gap-3 h-full py-3">
                  {/* Mini bar chart: revenue vs expenditure */}
                  <div className="flex items-end gap-2 flex-1 h-full">
                    <div className="flex flex-col items-center gap-1 flex-1">
                      <div
                        className="w-full rounded-t-sm bg-chart-3/80 transition-all duration-700 min-h-[8px]"
                        style={{
                          height: `${Math.min(100, (homeStats.budget.totalRevenue / Math.max(homeStats.budget.totalRevenue, homeStats.budget.totalExpenditure)) * 100)}%`,
                        }}
                      />
                      <span className="text-[0.55rem] text-muted-foreground whitespace-nowrap">{isAr ? "إيرادات" : "Rev."}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 flex-1">
                      <div
                        className="w-full rounded-t-sm bg-chart-4/80 transition-all duration-700 min-h-[8px]"
                        style={{
                          height: `${Math.min(100, (homeStats.budget.totalExpenditure / Math.max(homeStats.budget.totalRevenue, homeStats.budget.totalExpenditure)) * 100)}%`,
                        }}
                      />
                      <span className="text-[0.55rem] text-muted-foreground whitespace-nowrap">{isAr ? "مصروفات" : "Exp."}</span>
                    </div>
                    {homeStats.budget.deficit !== 0 && (
                      <div className="flex flex-col items-center gap-1 flex-1">
                        <div
                          className="w-full rounded-t-sm bg-destructive/60 transition-all duration-700 min-h-[8px]"
                          style={{
                            height: `${Math.min(100, (Math.abs(homeStats.budget.deficit) / Math.max(homeStats.budget.totalRevenue, homeStats.budget.totalExpenditure)) * 100)}%`,
                          }}
                        />
                        <span className="text-[0.55rem] text-muted-foreground whitespace-nowrap">{isAr ? "عجز" : "Def."}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-end flex-shrink-0">
                    <p className="font-mono text-lg font-bold tabular-nums" dir="ltr">
                      {symbol}{fmtNum(fromEGP(homeStats.budget.totalExpenditure), { decimals: 0 })}B
                    </p>
                    <p className="text-[0.6rem] text-muted-foreground">{isAr ? "إجمالي الإنفاق" : "Total spending"}</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="h-16 w-full bg-muted/10 animate-pulse rounded" />
                </div>
              )}
            </div>
          </BentoCard>

          {/* ── Constitution ── */}
          <BentoCard href="/constitution">
            <div className="p-4 flex flex-col h-full">
              <div className="w-8 h-8 rounded-lg bg-chart-5/10 text-chart-5 flex items-center justify-center mb-auto">
                <BookOpen size={16} strokeWidth={1.5} />
              </div>
              <div className="mt-auto">
                <p className="font-mono text-2xl font-bold tabular-nums text-foreground" dir="ltr">
                  {homeStats ? <NumberTicker value={homeStats.constitutionArticles.value} delay={0.5} /> : <span className="bg-muted/20 animate-pulse rounded inline-block w-10 h-7" />}
                </p>
                <h3 className="text-sm font-bold group-hover:text-primary transition-colors mt-0.5">
                  {isAr ? "الدستور" : "Constitution"}
                </h3>
                <p className="text-[0.65rem] text-muted-foreground">{isAr ? "تعديلات ٢٠١٩" : "2019 Amendments"}</p>
              </div>
            </div>
          </BentoCard>

          {/* ── Economy ── */}
          <BentoCard href="/economy">
            <div className="p-4 flex flex-col h-full">
              <div className="w-8 h-8 rounded-lg bg-chart-3/10 text-chart-3 flex items-center justify-center mb-auto">
                <LineChart size={16} strokeWidth={1.5} />
              </div>
              <div className="mt-auto">
                <h3 className="text-sm font-bold group-hover:text-primary transition-colors">
                  {isAr ? "الاقتصاد" : "Economy"}
                </h3>
                <p className="text-[0.65rem] text-muted-foreground">{isAr ? "الناتج المحلي · التضخم" : "GDP · Inflation · FX"}</p>
              </div>
            </div>
          </BentoCard>

          {/* ── Debt — with live data ── */}
          <BentoCard href="/debt">
            <div className="p-4 flex flex-col h-full">
              <div className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center mb-auto">
                <TrendingDown size={16} strokeWidth={1.5} />
              </div>
              <div className="mt-auto">
                {totalDebt && totalDebt.value > 0 ? (
                  <>
                    <p className="font-mono text-lg font-bold tabular-nums text-foreground" dir="ltr">
                      {totalDebt.debtToGdpRatio ? `${totalDebt.debtToGdpRatio.toFixed(0)}%` : ""}
                    </p>
                    <p className="text-[0.6rem] text-muted-foreground">{isAr ? "من الناتج المحلي" : "of GDP"}</p>
                  </>
                ) : null}
                <h3 className="text-sm font-bold group-hover:text-primary transition-colors mt-0.5">
                  {isAr ? "الدين العام" : "National Debt"}
                </h3>
              </div>
            </div>
          </BentoCard>

          {/* ── Tax Calculator ── */}
          <BentoCard href="/tools/tax-calculator">
            <div className="p-4 flex flex-col h-full">
              <div className="w-8 h-8 rounded-lg bg-chart-1/10 text-chart-1 flex items-center justify-center mb-auto">
                <Calculator size={16} strokeWidth={1.5} />
              </div>
              <div className="mt-auto">
                <h3 className="text-sm font-bold group-hover:text-primary transition-colors">
                  {isAr ? "حاسبة الضريبة" : "Tax Calculator"}
                </h3>
                <p className="text-[0.65rem] text-muted-foreground">{isAr ? "أين تذهب ضرائبك؟" : "Where do your taxes go?"}</p>
              </div>
            </div>
          </BentoCard>

          {/* ── Daily Poll ── */}
          <BentoCard className="col-span-2 md:col-span-1">
            <div className="p-3 h-full overflow-hidden">
              <DailyPoll compact />
            </div>
          </BentoCard>

          {/* ── Elections ── */}
          <BentoCard href="/elections">
            <div className="p-4 flex flex-col h-full">
              <div className="w-8 h-8 rounded-lg bg-chart-4/10 text-chart-4 flex items-center justify-center mb-auto">
                <Landmark size={16} strokeWidth={1.5} />
              </div>
              <div className="mt-auto">
                <h3 className="text-sm font-bold group-hover:text-primary transition-colors">
                  {isAr ? "الانتخابات" : "Elections"}
                </h3>
                <p className="text-[0.65rem] text-muted-foreground">{isAr ? "نتائج رئاسية وبرلمانية" : "Presidential & parliamentary"}</p>
              </div>
            </div>
          </BentoCard>

          {/* ── Investment Simulator ── */}
          <BentoCard href="/tools/invest">
            <div className="p-4 flex flex-col h-full">
              <div className="w-8 h-8 rounded-lg bg-chart-3/10 text-chart-3 flex items-center justify-center mb-auto">
                <TrendingUp size={16} strokeWidth={1.5} />
              </div>
              <div className="mt-auto">
                <h3 className="text-sm font-bold group-hover:text-primary transition-colors">
                  {isAr ? "محاكي الاستثمار" : "Invest Simulator"}
                </h3>
                <p className="text-[0.65rem] text-muted-foreground">{isAr ? "ذهب · دولار · عقار" : "Gold · USD · Real Estate"}</p>
              </div>
            </div>
          </BentoCard>

          {/* ── Buy vs Rent ── */}
          <BentoCard href="/tools/buy-vs-rent">
            <div className="p-4 flex flex-col h-full">
              <div className="w-8 h-8 rounded-lg bg-chart-2/10 text-chart-2 flex items-center justify-center mb-auto">
                <Home size={16} strokeWidth={1.5} />
              </div>
              <div className="mt-auto">
                <h3 className="text-sm font-bold group-hover:text-primary transition-colors">
                  {isAr ? "شراء أم إيجار؟" : "Buy vs Rent"}
                </h3>
                <p className="text-[0.65rem] text-muted-foreground">{isAr ? "حاسبة القرار العقاري" : "Real estate calculator"}</p>
              </div>
            </div>
          </BentoCard>

        </div>
      </section>

      <SectionDivider />

      {/* ════════════════════════════════════════════════════
          TOTAL DEBT HIGHLIGHT — Redesigned
         ════════════════════════════════════════════════════ */}
      {totalDebt && totalDebt.value > 0 && (
        <section className="container-page py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Debt card */}
            <div
              onClick={() => router.push("/debt")}
              className="cursor-pointer group"
            >
              <div className="rounded-xl border border-border bg-card/50 p-6 h-full hover:border-primary/40 transition-all hover:shadow-[0_0_30px_-5px_rgba(201,168,76,0.08)]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center flex-shrink-0">
                    <TrendingDown size={20} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      {isAr ? "إجمالي الدين العام" : "Total Public Debt"}
                    </p>
                  </div>
                </div>
                <div className="flex items-baseline gap-3 flex-wrap mb-3">
                  <span className="font-mono text-3xl md:text-4xl font-bold tracking-tighter tabular-nums text-foreground" dir="ltr">
                    {symbol}{fmtNum(
                      fromUSD(homeStats?.externalDebt?.value ?? 0) +
                      fromEGP(homeStats?.domesticDebt?.value ?? 0),
                      { decimals: 1 }
                    )}<span className="text-lg ml-0.5">{isAr ? "مليار" : "B"}</span>
                  </span>
                  <SanadBadge sanadLevel={totalDebt.sanadLevel} sourceUrl={totalDebt.sourceUrl} />
                </div>
                {totalDebt.debtToGdpRatio && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-destructive/70 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min(100, totalDebt.debtToGdpRatio)}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono tabular-nums text-muted-foreground">
                      {totalDebt.debtToGdpRatio.toFixed(1)}% {isAr ? "من الناتج" : "GDP"}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground/70">
                  {homeStats?.externalDebt && (
                    <span>
                      {isAr ? "خارجي:" : "Ext:"}{" "}
                      <span dir="ltr" className="font-mono tabular-nums">
                        {symbol}{fmtNum(fromUSD(homeStats.externalDebt.value), { decimals: 1 })}B
                      </span>
                    </span>
                  )}
                  {homeStats?.domesticDebt && (
                    <span>
                      {isAr ? "داخلي:" : "Dom:"}{" "}
                      <span dir="ltr" className="font-mono tabular-nums">
                        {symbol}{fmtNum(fromEGP(homeStats.domesticDebt.value), { decimals: 1 })}B
                      </span>
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold text-primary/70 group-hover:text-primary inline-flex items-center gap-1 mt-3 transition-all">
                  {isAr ? "تفاصيل الدين" : "Debt Details"} <Arrow size={12} />
                </span>
              </div>
            </div>

            {/* Budget card */}
            {homeStats?.budget && (homeStats.budget.totalRevenue > 0 || homeStats.budget.totalExpenditure > 0) && (
              <div
                onClick={() => router.push("/budget")}
                className="cursor-pointer group"
              >
                <div className="rounded-xl border border-border bg-card/50 p-6 h-full hover:border-primary/40 transition-all hover:shadow-[0_0_30px_-5px_rgba(201,168,76,0.08)]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <BarChart3 size={20} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                        {isAr ? `موازنة ${homeStats.budget.year}` : `${homeStats.budget.year} Budget`}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-[0.65rem] text-muted-foreground uppercase tracking-wider">{isAr ? "إيرادات" : "Revenue"}</p>
                      <p className="font-mono text-lg font-bold tabular-nums text-chart-3" dir="ltr">
                        {symbol}{fmtNum(fromEGP(homeStats.budget.totalRevenue), { decimals: 0 })}B
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.65rem] text-muted-foreground uppercase tracking-wider">{isAr ? "مصروفات" : "Spending"}</p>
                      <p className="font-mono text-lg font-bold tabular-nums text-chart-4" dir="ltr">
                        {symbol}{fmtNum(fromEGP(homeStats.budget.totalExpenditure), { decimals: 0 })}B
                      </p>
                    </div>
                    {homeStats.budget.deficit !== 0 && (
                      <div>
                        <p className="text-[0.65rem] text-muted-foreground uppercase tracking-wider">{isAr ? "العجز" : "Deficit"}</p>
                        <p className="font-mono text-lg font-bold tabular-nums text-destructive" dir="ltr">
                          {symbol}{fmtNum(fromEGP(Math.abs(homeStats.budget.deficit)), { decimals: 0 })}B
                        </p>
                      </div>
                    )}
                  </div>
                  {/* Revenue vs Expenditure bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-chart-3/70 rounded-full" style={{
                          width: `${(homeStats.budget.totalRevenue / homeStats.budget.totalExpenditure) * 100}%`
                        }} />
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-chart-4/70 rounded-full w-full" />
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-primary/70 group-hover:text-primary inline-flex items-center gap-1 mt-4 transition-all">
                    {isAr ? "استكشف الموازنة" : "Explore Budget"} <Arrow size={12} />
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <SectionDivider />

      {/* ════════════════════════════════════════════════════
          AI-MANAGED PLATFORM — Redesigned
         ════════════════════════════════════════════════════ */}
      <section className="container-page py-10 md:py-14">
        <div className="rounded-xl border border-border bg-gradient-to-br from-card/80 to-card/40 p-6 md:p-8">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Bot size={16} />
            </div>
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
            {[
              { href: "/transparency", icon: Bot, en: "Transparency", ar: "الشفافية", descEn: "Full audit log of every data update", descAr: "سجل كامل لكل تحديث بيانات" },
              { href: "/methodology", icon: BookMarked, en: "Methodology", ar: "المنهجية", descEn: "How we collect from official sources", descAr: "كيف نجمع البيانات من مصادر رسمية" },
              { href: "/funding", icon: Heart, en: "Funding", ar: "التمويل", descEn: "Transparent funding breakdown", descAr: "التمويل الشفاف" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="no-underline group">
                  <div className="border border-border/60 rounded-lg p-4 hover:border-primary/40 hover:bg-card/60 transition-all">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                      <p className="text-sm font-semibold group-hover:text-primary transition-colors">
                        {isAr ? item.ar : item.en}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">{isAr ? item.descAr : item.descEn}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          FOR AI AGENTS — Redesigned
         ════════════════════════════════════════════════════ */}
      <section className="container-page pb-12">
        <div className="flex items-center gap-2 mb-2">
          <Bot size={14} className="text-primary" />
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {isAr ? "للذكاء الاصطناعي والوكلاء" : "For AI Agents & LLMs"}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a href="/llms.txt" className="no-underline group">
            <div className="border border-border/60 rounded-lg p-4 hover:border-chart-2/40 transition-colors">
              <p className="text-sm font-semibold group-hover:text-chart-2 transition-colors inline-flex items-center gap-1.5 font-mono">/llms.txt <ExternalLink size={11} /></p>
              <p className="text-xs text-muted-foreground mt-1">{isAr ? "ملخص هيكلي لجميع البيانات" : "Structured overview for LLM context"}</p>
            </div>
          </a>
          <a href="/llms-full.txt" className="no-underline group">
            <div className="border border-border/60 rounded-lg p-4 hover:border-chart-2/40 transition-colors">
              <p className="text-sm font-semibold group-hover:text-chart-2 transition-colors inline-flex items-center gap-1.5 font-mono">/llms-full.txt <ExternalLink size={11} /></p>
              <p className="text-xs text-muted-foreground mt-1">{isAr ? "تصدير كامل بتنسيق Markdown" : "Full Markdown data export"}</p>
            </div>
          </a>
          <a href="https://github.com/Ba3lisa/mizan" target="_blank" rel="noopener noreferrer" className="no-underline group sm:col-span-2">
            <div className="border border-border/60 rounded-lg p-4 hover:border-primary/40 transition-colors flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold group-hover:text-primary transition-colors inline-flex items-center gap-1.5">GitHub <ExternalLink size={11} /></p>
                <p className="text-xs text-muted-foreground mt-0.5">{isAr ? "الكود مفتوح المصدر — راجع الكود" : "Open source — audit the code"}</p>
              </div>
              <Arrow size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </a>
        </div>
      </section>

    </div>
  );
}
