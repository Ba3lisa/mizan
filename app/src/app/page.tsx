"use client";

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
import { NewsTicker } from "@/components/news-ticker";
import { useLanguage, useCurrency } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { AiPipelineStatus } from "@/components/ai-pipeline-status";
import { SanadBadge } from "@/components/sanad-badge";

/* ─── Nile-wave section divider with centered icon ─── */
function SectionDivider({ icon: Icon }: { icon?: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }> }) {
  return (
    <div className="relative flex items-center container-page pointer-events-none" aria-hidden>
      {/* Left wave */}
      <svg viewBox="0 0 200 12" className="flex-1 h-3" preserveAspectRatio="none">
        <path d="M200,6 Q185,0 170,6 T140,6 T110,6 T80,6 T50,6 T20,6 T0,6" fill="none" stroke="var(--primary)" strokeWidth="1" opacity="0.25" />
      </svg>
      {/* Center icon */}
      <div className="mx-3 w-7 h-7 rounded-full border border-primary/20 flex items-center justify-center flex-shrink-0 bg-background">
        {Icon ? <Icon size={14} strokeWidth={1.5} className="text-primary/40" /> : <Scale size={14} strokeWidth={1.5} className="text-primary/40" />}
      </div>
      {/* Right wave */}
      <svg viewBox="0 0 200 12" className="flex-1 h-3" preserveAspectRatio="none">
        <path d="M0,6 Q15,0 30,6 T60,6 T90,6 T120,6 T150,6 T180,6 T200,6" fill="none" stroke="var(--primary)" strokeWidth="1" opacity="0.25" />
      </svg>
    </div>
  );
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

/* ─── Mini donut chart (SVG) ─── */
function MiniDonut({ segments, size = 48 }: { segments: { value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;
  const r = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;

  // Precompute cumulative angles to avoid mutation during render
  const arcs = segments.reduce<{ startAngle: number; endAngle: number; color: string }[]>((acc, seg) => {
    const prev = acc.length > 0 ? acc[acc.length - 1].endAngle : -90;
    const angle = (seg.value / total) * 360;
    acc.push({ startAngle: prev, endAngle: prev + angle, color: seg.color });
    return acc;
  }, []);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs.map((arc, i) => {
        const angle = arc.endAngle - arc.startAngle;
        const startRad = (arc.startAngle * Math.PI) / 180;
        const endRad = (arc.endAngle * Math.PI) / 180;
        const largeArc = angle > 180 ? 1 : 0;
        const x1 = cx + r * Math.cos(startRad);
        const y1 = cy + r * Math.sin(startRad);
        const x2 = cx + r * Math.cos(endRad);
        const y2 = cy + r * Math.sin(endRad);
        return (
          <path
            key={i}
            d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
            fill={arc.color}
            opacity={0.8}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={r * 0.55} fill="var(--card)" />
    </svg>
  );
}

/* ─── Mini horizontal stacked bar ─── */
function StackedBar({ items }: { items: { value: number; color: string; label: string }[] }) {
  const total = items.reduce((s, item) => s + item.value, 0);
  if (total === 0) return null;
  return (
    <div className="w-full space-y-1.5">
      <div className="flex h-3 rounded-full overflow-hidden bg-muted/30">
        {items.map((item, i) => (
          <div
            key={i}
            className="h-full transition-all duration-700 first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(item.value / total) * 100}%`, backgroundColor: item.color }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[0.55rem] text-muted-foreground">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Mini gauge arc ─── */
function GaugeArc({ percentage, color, size = 56 }: { percentage: number; color: string; size?: number }) {
  const r = size / 2 - 5;
  const cx = size / 2;
  const cy = size / 2 + 4;
  const startAngle = -180;
  const sweepAngle = (Math.min(percentage, 100) / 100) * 180;
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = ((startAngle + sweepAngle) * Math.PI) / 180;

  return (
    <svg width={size} height={size * 0.6} viewBox={`0 0 ${size} ${size * 0.65}`}>
      {/* Background arc */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="var(--muted)"
        strokeWidth={4}
        strokeLinecap="round"
        opacity={0.3}
      />
      {/* Value arc */}
      <path
        d={`M ${cx + r * Math.cos(startRad)} ${cy + r * Math.sin(startRad)} A ${r} ${r} 0 ${sweepAngle > 180 ? 1 : 0} 1 ${cx + r * Math.cos(endRad)} ${cy + r * Math.sin(endRad)}`}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        opacity={0.8}
      />
    </svg>
  );
}


export default function HomePage() {
  const { lang, dir } = useLanguage();
  const { symbol, fromUSD, fromEGP, fmt: fmtNum } = useCurrency();
  const router = useRouter();
  const isAr = lang === "ar";
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;
  const homeStats = useQuery(api.government.getHomeStats);
  const totalDebt = homeStats?.totalDebt;

  return (
    <div className="page-content" dir={dir}>

      {/* ════════════════════════════════════════════════════
          HERO — Title + Poll side-by-side (restored layout)
         ════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div className="container-page relative" style={{ zIndex: 1 }}>
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_320px] gap-6 lg:items-stretch pt-4 md:pt-8 pb-12 md:pb-16" style={{ direction: "ltr" }}>
            {/* News — visual left on desktop, stretches to match poll height */}
            <div className="order-2 lg:order-1 w-full max-w-sm mx-auto lg:mx-0">
              <NewsTicker />
            </div>

            {/* Hero text — perfectly centered */}
            <div className="order-1 lg:order-2 flex flex-col items-center justify-center text-center" dir={dir}>
              <Scale size={28} className="text-primary mb-6 opacity-80" strokeWidth={1.5} />
              <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-3" style={{ lineHeight: 0.95 }}>
                {isAr ? "ميزان" : "Mizan"}
              </h1>
              <p className="text-base md:text-lg text-muted-foreground mb-2">
                {isAr ? "مصر، بالأرقام." : "Egypt, visualized."}
              </p>
              <p className="text-sm text-muted-foreground/60 mb-6 max-w-sm leading-relaxed">
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

            {/* Poll — visual right on desktop */}
            <div className="order-3 lg:sticky lg:top-24 w-full max-w-sm mx-auto lg:mx-0">
              <DailyPoll />
            </div>
          </div>
        </div>
      </section>

      {/* AI Pipeline Status */}
      <AiPipelineStatus />

      <SectionDivider icon={Landmark} />

      {/* ════════════════════════════════════════════════════
          BENTO GRID — Each card has meaningful graphics
         ════════════════════════════════════════════════════ */}
      <section className="container-page py-6 md:py-10 relative">

        <h2 className="relative text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6">
          {isAr ? "استكشف" : "Explore"}
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 auto-rows-[160px] md:auto-rows-[180px]">

          {/* ── Government — org chart graphic ── */}
          <BentoCard href="/government" className="col-span-2">
            <div className="p-5 flex flex-col h-full">
              <div className="flex items-start justify-between mb-auto">
                <div>
                  <h3 className="text-base font-bold group-hover:text-primary transition-colors">
                    {isAr ? "الحكومة" : "Government"}
                  </h3>
                  <p className="text-[0.65rem] text-muted-foreground mt-0.5">{isAr ? "الرئيس · رئيس الوزراء · الوزراء" : "President · PM · Ministers"}</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <Building2 size={16} strokeWidth={1.5} />
                </div>
              </div>
              {/* Mini org chart */}
              <div className="mt-auto flex items-end gap-4">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-[0.6rem] font-bold text-primary">P</span>
                  </div>
                  <div className="w-px h-3 bg-border" />
                  <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center">
                    <span className="text-[0.5rem] font-bold text-primary/80">PM</span>
                  </div>
                  <div className="w-px h-2 bg-border" />
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="w-3 h-3 rounded-full bg-muted-foreground/20" />
                    ))}
                  </div>
                </div>
                <div className="flex-1 text-end">
                  <p className="font-mono text-3xl font-bold tabular-nums text-foreground" dir="ltr">
                    {homeStats ? homeStats.ministries.value.toLocaleString() : <span className="bg-muted/20 animate-pulse rounded inline-block w-10 h-8" />}
                  </p>
                  <p className="text-[0.65rem] text-muted-foreground">{isAr ? "وزارة" : "Ministries"}</p>
                </div>
              </div>
            </div>
          </BentoCard>

          {/* ── Parliament — donut chart ── */}
          <BentoCard href="/parliament">
            <div className="p-4 flex flex-col h-full">
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-bold group-hover:text-primary transition-colors">
                  {isAr ? "البرلمان" : "Parliament"}
                </h3>
                <div className="w-7 h-7 rounded-lg bg-chart-2/10 text-chart-2 flex items-center justify-center flex-shrink-0">
                  <Users size={14} strokeWidth={1.5} />
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <MiniDonut segments={homeStats ? [
                  { value: homeStats.parliamentarians.house, color: "var(--chart-2)" },
                  { value: homeStats.parliamentarians.senate, color: "var(--chart-5)" },
                ] : [{ value: 1, color: "var(--muted)" }]} size={60} />
              </div>
              <div className="mt-auto">
                <p className="font-mono text-xl font-bold tabular-nums text-foreground" dir="ltr">
                  {homeStats ? homeStats.parliamentarians.value.toLocaleString() : <span className="bg-muted/20 animate-pulse rounded inline-block w-10 h-6" />}
                </p>
                <div className="flex gap-3 text-[0.55rem] text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-chart-2 inline-block" />{isAr ? "نواب" : "House"}</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-chart-5 inline-block" />{isAr ? "شيوخ" : "Senate"}</span>
                </div>
              </div>
            </div>
          </BentoCard>

          {/* ── Constitution — article count visual ── */}
          <BentoCard href="/constitution">
            <div className="p-4 flex flex-col h-full">
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-bold group-hover:text-primary transition-colors">
                  {isAr ? "الدستور" : "Constitution"}
                </h3>
                <div className="w-7 h-7 rounded-lg bg-chart-5/10 text-chart-5 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={14} strokeWidth={1.5} />
                </div>
              </div>
              {/* Visual: grid of dots representing articles */}
              <div className="flex-1 flex items-center justify-center py-2">
                <div className="grid grid-cols-13 gap-[2px]">
                  {Array.from({ length: 52 }).map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-[1px] bg-chart-5/40 transition-colors group-hover:bg-chart-5/60" />
                  ))}
                </div>
              </div>
              <div className="mt-auto">
                <p className="font-mono text-xl font-bold tabular-nums text-foreground" dir="ltr">
                  {homeStats ? homeStats.constitutionArticles.value.toLocaleString() : <span className="bg-muted/20 animate-pulse rounded inline-block w-10 h-6" />}
                </p>
                <p className="text-[0.6rem] text-muted-foreground">{isAr ? "مادة · تعديلات ٢٠١٩" : "Articles · 2019 Amendments"}</p>
              </div>
            </div>
          </BentoCard>

          {/* ── Budget — wide card with proper stacked bar ── */}
          <BentoCard href="/budget" className="col-span-2">
            <div className="p-5 flex flex-col h-full">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-bold group-hover:text-primary transition-colors">
                    {isAr ? "الموازنة العامة" : "National Budget"}
                  </h3>
                  {homeStats?.budget && (
                    <p className="text-[0.65rem] text-muted-foreground mt-0.5">{homeStats.budget.year}</p>
                  )}
                </div>
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <BarChart3 size={16} strokeWidth={1.5} />
                </div>
              </div>
              {homeStats?.budget && (homeStats.budget.totalRevenue > 0 || homeStats.budget.totalExpenditure > 0) ? (
                <div className="mt-auto space-y-3">
                  {/* Revenue / Expenditure / Deficit numbers */}
                  <div className="flex justify-between gap-2">
                    <div className="text-center flex-1">
                      <p className="text-[0.6rem] text-muted-foreground mb-0.5">{isAr ? "إيرادات" : "Revenue"}</p>
                      <p className="font-mono text-base font-bold tabular-nums text-chart-3" dir="ltr">
                        {symbol}{fmtNum(fromEGP(homeStats.budget.totalRevenue), { decimals: 0 })}B
                      </p>
                    </div>
                    <div className="text-center flex-1">
                      <p className="text-[0.6rem] text-muted-foreground mb-0.5">{isAr ? "مصروفات" : "Spending"}</p>
                      <p className="font-mono text-base font-bold tabular-nums text-chart-4" dir="ltr">
                        {symbol}{fmtNum(fromEGP(homeStats.budget.totalExpenditure), { decimals: 0 })}B
                      </p>
                    </div>
                    {homeStats.budget.deficit !== 0 && (
                      <div className="text-center flex-1">
                        <p className="text-[0.6rem] text-muted-foreground mb-0.5">{isAr ? "عجز" : "Deficit"}</p>
                        <p className="font-mono text-base font-bold tabular-nums text-destructive" dir="ltr">
                          {symbol}{fmtNum(fromEGP(Math.abs(homeStats.budget.deficit)), { decimals: 0 })}B
                        </p>
                      </div>
                    )}
                  </div>
                  {/* Stacked bar */}
                  <StackedBar items={[
                    { value: homeStats.budget.totalRevenue, color: "var(--chart-3)", label: isAr ? "إيرادات" : "Revenue" },
                    { value: Math.abs(homeStats.budget.deficit), color: "var(--destructive)", label: isAr ? "عجز" : "Deficit" },
                  ]} />
                </div>
              ) : (
                <div className="mt-auto h-20 bg-muted/10 animate-pulse rounded" />
              )}
            </div>
          </BentoCard>

          {/* ── Debt — gauge arc ── */}
          <BentoCard href="/debt">
            <div className="p-4 flex flex-col h-full">
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-bold group-hover:text-primary transition-colors">
                  {isAr ? "الدين العام" : "National Debt"}
                </h3>
                <div className="w-7 h-7 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center flex-shrink-0">
                  <TrendingDown size={14} strokeWidth={1.5} />
                </div>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center">
                {totalDebt && totalDebt.debtToGdpRatio ? (
                  <>
                    <GaugeArc percentage={totalDebt.debtToGdpRatio} color="var(--destructive)" size={72} />
                    <p className="font-mono text-xl font-bold tabular-nums text-foreground -mt-1" dir="ltr">
                      {totalDebt.debtToGdpRatio.toFixed(0)}%
                    </p>
                    <p className="text-[0.55rem] text-muted-foreground">{isAr ? "من الناتج المحلي" : "of GDP"}</p>
                  </>
                ) : (
                  <div className="w-16 h-8 bg-muted/20 animate-pulse rounded" />
                )}
              </div>
            </div>
          </BentoCard>

          {/* ── Economy — sparkline-style graphic ── */}
          <BentoCard href="/economy">
            <div className="p-4 flex flex-col h-full">
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-bold group-hover:text-primary transition-colors">
                  {isAr ? "الاقتصاد" : "Economy"}
                </h3>
                <div className="w-7 h-7 rounded-lg bg-chart-3/10 text-chart-3 flex items-center justify-center flex-shrink-0">
                  <LineChart size={14} strokeWidth={1.5} />
                </div>
              </div>
              <p className="text-[0.6rem] text-muted-foreground mt-1">{isAr ? "الناتج المحلي · التضخم · سعر الصرف" : "GDP · Inflation · FX rate"}</p>
              {/* Mini sparkline — constrained height */}
              <div className="mt-auto h-12">
                <svg viewBox="0 0 100 30" className="w-full h-full" preserveAspectRatio="none">
                  <path
                    d="M 0 25 Q 15 22, 25 20 T 50 14 T 75 10 T 100 5"
                    fill="none"
                    stroke="var(--chart-3)"
                    strokeWidth={2}
                    strokeLinecap="round"
                    opacity={0.6}
                  />
                  <path
                    d="M 0 25 Q 15 22, 25 20 T 50 14 T 75 10 T 100 5 L 100 30 L 0 30 Z"
                    fill="var(--chart-3)"
                    opacity={0.08}
                  />
                </svg>
              </div>
            </div>
          </BentoCard>

          {/* ── Tax Calculator — interactive teaser ── */}
          <BentoCard href="/tools/tax-calculator">
            <div className="p-4 flex flex-col h-full">
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-bold group-hover:text-primary transition-colors">
                  {isAr ? "حاسبة الضريبة" : "Tax Calculator"}
                </h3>
                <div className="w-7 h-7 rounded-lg bg-chart-1/10 text-chart-1 flex items-center justify-center flex-shrink-0">
                  <Calculator size={14} strokeWidth={1.5} />
                </div>
              </div>
              {/* Mini tax breakdown preview */}
              <div className="flex-1 flex flex-col justify-center gap-1.5 py-2">
                {[
                  { w: "85%", color: "var(--chart-1)" },
                  { w: "62%", color: "var(--chart-2)" },
                  { w: "45%", color: "var(--chart-3)" },
                  { w: "30%", color: "var(--chart-4)" },
                ].map((bar, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: bar.w, backgroundColor: bar.color, opacity: 0.6 }} />
                  </div>
                ))}
              </div>
              <p className="text-[0.6rem] text-muted-foreground mt-auto">{isAr ? "أين تذهب ضرائبك؟" : "Where do your taxes go?"}</p>
            </div>
          </BentoCard>

          {/* ── Elections ── */}
          <BentoCard href="/elections">
            <div className="p-4 flex flex-col h-full">
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-bold group-hover:text-primary transition-colors">
                  {isAr ? "الانتخابات" : "Elections"}
                </h3>
                <div className="w-7 h-7 rounded-lg bg-chart-4/10 text-chart-4 flex items-center justify-center flex-shrink-0">
                  <Landmark size={14} strokeWidth={1.5} />
                </div>
              </div>
              {/* Timeline dots */}
              <div className="flex-1 flex items-center justify-center py-3">
                <div className="flex items-center gap-1 w-full px-2">
                  <div className="h-px flex-1 bg-border" />
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-chart-4/40" />
                    <span className="text-[0.5rem] text-muted-foreground">2018</span>
                  </div>
                  <div className="h-px flex-1 bg-border" />
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-3 h-3 rounded-full bg-chart-4/70 ring-2 ring-chart-4/20" />
                    <span className="text-[0.5rem] text-muted-foreground font-bold">2024</span>
                  </div>
                  <div className="h-px flex-1 bg-border/40 border-dashed" />
                </div>
              </div>
              <p className="text-[0.65rem] text-muted-foreground mt-auto">{isAr ? "نتائج رئاسية وبرلمانية" : "Presidential & parliamentary"}</p>
            </div>
          </BentoCard>

          {/* ── Investment Simulator — asset comparison bars ── */}
          <BentoCard href="/tools/invest">
            <div className="p-4 flex flex-col h-full">
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-bold group-hover:text-primary transition-colors">
                  {isAr ? "محاكي الاستثمار" : "Invest Simulator"}
                </h3>
                <div className="w-7 h-7 rounded-lg bg-chart-3/10 text-chart-3 flex items-center justify-center flex-shrink-0">
                  <TrendingUp size={14} strokeWidth={1.5} />
                </div>
              </div>
              {/* Asset comparison mini bars */}
              <div className="flex-1 flex flex-col justify-center gap-2 py-2">
                {[
                  { label: isAr ? "ذهب" : "Gold", w: "90%", color: "var(--chart-1)" },
                  { label: isAr ? "دولار" : "USD", w: "65%", color: "var(--chart-3)" },
                  { label: isAr ? "عقار" : "RE", w: "50%", color: "var(--chart-2)" },
                  { label: isAr ? "بورصة" : "EGX", w: "35%", color: "var(--chart-4)" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[0.5rem] text-muted-foreground w-6 text-end">{item.label}</span>
                    <div className="flex-1 h-1.5 bg-muted/20 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: item.w, backgroundColor: item.color, opacity: 0.7 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </BentoCard>

          {/* ── Buy vs Rent — scale graphic ── */}
          <BentoCard href="/tools/buy-vs-rent">
            <div className="p-4 flex flex-col h-full">
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-bold group-hover:text-primary transition-colors">
                  {isAr ? "شراء أم إيجار؟" : "Buy vs Rent"}
                </h3>
                <div className="w-7 h-7 rounded-lg bg-chart-2/10 text-chart-2 flex items-center justify-center flex-shrink-0">
                  <Home size={14} strokeWidth={1.5} />
                </div>
              </div>
              {/* Balance scale graphic */}
              <div className="flex-1 flex items-center justify-center py-2">
                <svg viewBox="0 0 60 36" width={60} height={36}>
                  {/* Fulcrum */}
                  <polygon points="30,8 26,36 34,36" fill="var(--border)" opacity={0.5} />
                  {/* Beam */}
                  <line x1="8" y1="14" x2="52" y2="10" stroke="var(--chart-2)" strokeWidth={2} opacity={0.6} strokeLinecap="round" />
                  {/* Left pan (Buy) */}
                  <circle cx="8" cy="16" r="5" fill="var(--chart-2)" opacity={0.3} />
                  <text x="8" y="18" textAnchor="middle" fontSize="4" fill="var(--chart-2)" fontWeight="bold">{isAr ? "ش" : "B"}</text>
                  {/* Right pan (Rent) */}
                  <circle cx="52" cy="12" r="5" fill="var(--chart-4)" opacity={0.3} />
                  <text x="52" y="14" textAnchor="middle" fontSize="4" fill="var(--chart-4)" fontWeight="bold">{isAr ? "إ" : "R"}</text>
                </svg>
              </div>
              <p className="text-[0.6rem] text-muted-foreground mt-auto">{isAr ? "حاسبة القرار العقاري" : "Real estate calculator"}</p>
            </div>
          </BentoCard>

          {/* ── Governorates ── */}
          <BentoCard href="/governorate">
            <div className="p-4 flex flex-col h-full">
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-bold group-hover:text-primary transition-colors">
                  {isAr ? "المحافظات" : "Governorates"}
                </h3>
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <MapPin size={14} strokeWidth={1.5} />
                </div>
              </div>
              <div className="mt-auto">
                <p className="font-mono text-xl font-bold tabular-nums text-foreground" dir="ltr">
                  {homeStats ? homeStats.governorates.value.toLocaleString() : <span className="bg-muted/20 animate-pulse rounded inline-block w-8 h-6" />}
                </p>
                <p className="text-[0.65rem] text-muted-foreground">{isAr ? "محافظ · نواب · إحصاءات" : "Governor · MPs · Stats"}</p>
              </div>
            </div>
          </BentoCard>

        </div>
      </section>

      <SectionDivider icon={TrendingDown} />

      {/* ════════════════════════════════════════════════════
          TOTAL DEBT + BUDGET — Side by side detail cards
         ════════════════════════════════════════════════════ */}
      {totalDebt && totalDebt.value > 0 && (
        <section className="container-page py-8 relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Debt card */}
            <div onClick={() => router.push("/debt")} className="cursor-pointer group">
              <div className="rounded-xl border border-border bg-card/50 p-6 h-full hover:border-primary/40 transition-all hover:shadow-[0_0_30px_-5px_rgba(201,168,76,0.08)]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center flex-shrink-0">
                    <TrendingDown size={20} strokeWidth={1.5} />
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    {isAr ? "إجمالي الدين العام" : "Total Public Debt"}
                  </p>
                </div>
                <div className="flex items-baseline gap-3 flex-wrap mb-3">
                  <span className="font-mono text-3xl md:text-4xl font-bold tracking-tighter tabular-nums text-foreground" dir="ltr">
                    {symbol}{fmtNum(fromUSD(homeStats?.externalDebt?.value ?? 0) + fromEGP(homeStats?.domesticDebt?.value ?? 0), { decimals: 1 })}<span className="text-lg ml-0.5">{isAr ? "مليار" : "B"}</span>
                  </span>
                  <SanadBadge sanadLevel={totalDebt.sanadLevel} sourceUrl={totalDebt.sourceUrl} />
                </div>
                {totalDebt.debtToGdpRatio && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-destructive/70 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, totalDebt.debtToGdpRatio)}%` }} />
                    </div>
                    <span className="text-xs font-mono tabular-nums text-muted-foreground">{totalDebt.debtToGdpRatio.toFixed(1)}% {isAr ? "من الناتج" : "GDP"}</span>
                  </div>
                )}
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground/70">
                  {homeStats?.externalDebt && <span>{isAr ? "خارجي:" : "Ext:"} <span dir="ltr" className="font-mono tabular-nums">{symbol}{fmtNum(fromUSD(homeStats.externalDebt.value), { decimals: 1 })}B</span></span>}
                  {homeStats?.domesticDebt && <span>{isAr ? "داخلي:" : "Dom:"} <span dir="ltr" className="font-mono tabular-nums">{symbol}{fmtNum(fromEGP(homeStats.domesticDebt.value), { decimals: 1 })}B</span></span>}
                </div>
                <span className="text-xs font-semibold text-primary/70 group-hover:text-primary inline-flex items-center gap-1 mt-3 transition-all">
                  {isAr ? "تفاصيل الدين" : "Debt Details"} <Arrow size={12} />
                </span>
              </div>
            </div>

            {/* Budget detail card */}
            {homeStats?.budget && (homeStats.budget.totalRevenue > 0 || homeStats.budget.totalExpenditure > 0) && (
              <div onClick={() => router.push("/budget")} className="cursor-pointer group">
                <div className="rounded-xl border border-border bg-card/50 p-6 h-full hover:border-primary/40 transition-all hover:shadow-[0_0_30px_-5px_rgba(201,168,76,0.08)]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <BarChart3 size={20} strokeWidth={1.5} />
                    </div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      {isAr ? `موازنة ${homeStats.budget.year}` : `${homeStats.budget.year} Budget`}
                    </p>
                  </div>
                  <div className="flex justify-between gap-3 mb-4">
                    <div className="text-center flex-1">
                      <p className="text-[0.65rem] text-muted-foreground uppercase tracking-wider mb-0.5">{isAr ? "إيرادات" : "Revenue"}</p>
                      <p className="font-mono text-lg font-bold tabular-nums text-chart-3" dir="ltr">{symbol}{fmtNum(fromEGP(homeStats.budget.totalRevenue), { decimals: 0 })}B</p>
                    </div>
                    <div className="text-center flex-1">
                      <p className="text-[0.65rem] text-muted-foreground uppercase tracking-wider mb-0.5">{isAr ? "مصروفات" : "Spending"}</p>
                      <p className="font-mono text-lg font-bold tabular-nums text-chart-4" dir="ltr">{symbol}{fmtNum(fromEGP(homeStats.budget.totalExpenditure), { decimals: 0 })}B</p>
                    </div>
                    {homeStats.budget.deficit !== 0 && (
                      <div className="text-center flex-1">
                        <p className="text-[0.65rem] text-muted-foreground uppercase tracking-wider mb-0.5">{isAr ? "العجز" : "Deficit"}</p>
                        <p className="font-mono text-lg font-bold tabular-nums text-destructive" dir="ltr">{symbol}{fmtNum(fromEGP(Math.abs(homeStats.budget.deficit)), { decimals: 0 })}B</p>
                      </div>
                    )}
                  </div>
                  <StackedBar items={[
                    { value: homeStats.budget.totalRevenue, color: "var(--chart-3)", label: isAr ? "إيرادات" : "Revenue" },
                    { value: Math.abs(homeStats.budget.deficit), color: "var(--destructive)", label: isAr ? "عجز" : "Deficit" },
                  ]} />
                  <span className="text-xs font-semibold text-primary/70 group-hover:text-primary inline-flex items-center gap-1 mt-4 transition-all">
                    {isAr ? "استكشف الموازنة" : "Explore Budget"} <Arrow size={12} />
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <SectionDivider icon={Bot} />

      {/* ════════════════════════════════════════════════════
          AI-MANAGED PLATFORM
         ════════════════════════════════════════════════════ */}
      <section className="container-page py-10 md:py-14">
        <div className="relative rounded-xl border border-border bg-gradient-to-br from-card/80 to-card/40 p-6 md:p-8 overflow-hidden">
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
              : "All data is collected, verified, and refreshed every 12 hours by AI agents."}
          </p>
          <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                      <p className="text-sm font-semibold group-hover:text-primary transition-colors">{isAr ? item.ar : item.en}</p>
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
          FOR AI AGENTS
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

        {/* Bottom rule */}
        <div className="mt-8 h-px bg-gradient-to-r from-transparent via-border/20 to-transparent container-page" />
      </section>

    </div>
  );
}
