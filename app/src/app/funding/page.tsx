"use client";

import Link from "next/link";
import { Skeleton } from "boneyard-js/react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useLanguage, useCurrency } from "@/components/providers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Heart,
  DollarSign,
  TrendingUp,
  Users,
  ExternalLink,
  Server,
  Bot,
  Code2,
  Database,
  MoreHorizontal,
  Calendar,
  ShieldCheck,
  CircleDollarSign,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FundingSummaryRow {
  _id: string;
  month: string;
  totalDonationsUsd: number;
  totalAllocatedUsd: number;
  balanceUsd: number;
  infrastructureCostUsd: number;
  aiApiCostUsd: number;
  developmentCostUsd: number;
  dataCostUsd: number;
  otherCostUsd: number;
  updatedAt: number;
}

interface AllocationItem {
  _id: string;
  category: string;
  categoryEn: string;
  categoryAr: string;
  amountUsd: number;
  currency: string;
  descriptionEn: string;
  descriptionAr: string;
  vendor?: string;
  isRecurring: boolean;
  periodStart: string;
  periodEnd: string;
  receiptUrl?: string;
}

interface AllocationBreakdown {
  [category: string]: { totalUsd: number; items: AllocationItem[] };
}

interface DonationRow {
  _id: string;
  _creationTime: number;
  donorName: string | null;
  isAnonymous: boolean;
  amountUsd: number;
  currency: string;
  paymentProvider: string;
  status: string;
  messageEn: string | null;
  messageAr: string | null;
  createdAt: number;
}

// ─── Category config ──────────────────────────────────────────────────────────

interface CategoryConfig {
  key: string;
  labelEn: string;
  labelAr: string;
  color: string;
  icon: React.ReactNode;
}

const CATEGORY_CONFIG: CategoryConfig[] = [
  {
    key: "infrastructure",
    labelEn: "Infrastructure",
    labelAr: "البنية التحتية",
    color: "#6C8EEF",
    icon: <Server size={14} />,
  },
  {
    key: "ai_api_costs",
    labelEn: "AI API Costs",
    labelAr: "تكاليف الذكاء الاصطناعي",
    color: "#C9A84C",
    icon: <Bot size={14} />,
  },
  {
    key: "development",
    labelEn: "Development",
    labelAr: "التطوير",
    color: "#2EC4B6",
    icon: <Code2 size={14} />,
  },
  {
    key: "data_acquisition",
    labelEn: "Data Acquisition",
    labelAr: "جمع البيانات",
    color: "#E76F51",
    icon: <Database size={14} />,
  },
  {
    key: "other",
    labelEn: "Other",
    labelAr: "أخرى",
    color: "#7A8299",
    icon: <MoreHorizontal size={14} />,
  },
];

// ─── Summary Cards ────────────────────────────────────────────────────────────

interface SummaryCardsProps {
  summaries: FundingSummaryRow[] | undefined;
  isAr: boolean;
  fmtUsd: (v: number) => string;
}

function SummaryCards({ summaries, isAr, fmtUsd }: SummaryCardsProps) {
  const isLoading = summaries === undefined;

  const totals = (() => {
    if (isLoading || summaries.length === 0) {
      return { raised: 0, spent: 0, balance: 0, sponsors: 0 };
    }
    const raised = summaries.reduce((s, r) => s + r.totalDonationsUsd, 0);
    const spent = summaries.reduce((s, r) => s + r.totalAllocatedUsd, 0);
    return { raised, spent, balance: raised - spent, sponsors: 0 };
  })();

  const cards = [
    {
      labelEn: "Total Raised",
      labelAr: "إجمالي ما جُمع",
      value: fmtUsd(totals.raised),
      icon: <TrendingUp size={18} className="text-emerald-400" />,
      accent: "text-emerald-400",
    },
    {
      labelEn: "Total Spent",
      labelAr: "إجمالي ما أُنفق",
      value: fmtUsd(totals.spent),
      icon: <DollarSign size={18} className="text-primary" />,
      accent: "text-primary",
    },
    {
      labelEn: "Current Balance",
      labelAr: "الرصيد الحالي",
      value: fmtUsd(totals.balance),
      icon: <CircleDollarSign size={18} className="text-blue-400" />,
      accent: totals.balance >= 0 ? "text-blue-400" : "text-red-400",
    },
    {
      labelEn: "Sponsors",
      labelAr: "الداعمون",
      value: isLoading ? "—" : "GitHub Sponsors",
      icon: <Users size={18} className="text-purple-400" />,
      accent: "text-purple-400",
    },
  ];

  return (
    <Skeleton name="funding-summary" loading={isLoading}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.labelEn} className="border-border/60">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {isAr ? card.labelAr : card.labelEn}
                </span>
                {card.icon}
              </div>
              <p className={cn("text-2xl font-black tabular-nums", card.accent)}>
                {card.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </Skeleton>
  );
}

// ─── Allocation Bar ───────────────────────────────────────────────────────────

interface AllocationBarProps {
  config: CategoryConfig;
  totalUsd: number;
  maxUsd: number;
  items: AllocationItem[];
  isAr: boolean;
  fmtUsd: (v: number) => string;
}

function AllocationBar({ config, totalUsd, maxUsd, items, isAr, fmtUsd }: AllocationBarProps) {
  const pct = maxUsd > 0 ? (totalUsd / maxUsd) * 100 : 0;
  const pctDisplay = maxUsd > 0 ? Math.round((totalUsd / maxUsd) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Category header row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <span style={{ color: config.color }}>{config.icon}</span>
          <span className="text-sm font-semibold truncate">
            {isAr ? config.labelAr : config.labelEn}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground">{pctDisplay}%</span>
          <span className="text-sm font-bold tabular-nums" style={{ color: config.color }}>
            {fmtUsd(totalUsd)}
          </span>
        </div>
      </div>

      {/* Bar */}
      <div className="h-2 w-full rounded-full bg-muted/40">
        <div
          className="h-2 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: config.color, opacity: 0.85 }}
        />
      </div>

      {/* Line items */}
      {items.length > 0 && (
        <div className="space-y-2 pl-6 border-l-2" style={{ borderColor: config.color + "33" }}>
          {items.map((item) => (
            <div key={item._id} className="flex items-start justify-between gap-4 text-xs">
              <div className="min-w-0">
                <p className="text-foreground/90 leading-snug">
                  {isAr ? item.descriptionAr : item.descriptionEn}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {item.vendor && (
                    <span className="text-muted-foreground">{item.vendor}</span>
                  )}
                  <span className="text-muted-foreground/60">
                    {item.periodStart} – {item.periodEnd}
                  </span>
                  {item.isRecurring && (
                    <Badge variant="outline" className="text-[0.55rem] px-1.5 py-0">
                      {isAr ? "متكرر" : "Recurring"}
                    </Badge>
                  )}
                  {item.receiptUrl && (
                    <a
                      href={item.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary inline-flex items-center gap-0.5 hover:underline"
                    >
                      {isAr ? "إيصال" : "Receipt"} <ExternalLink size={8} />
                    </a>
                  )}
                </div>
              </div>
              <span className="tabular-nums text-foreground/80 shrink-0">
                {fmtUsd(item.amountUsd)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Allocation Section ───────────────────────────────────────────────────────

interface AllocationSectionProps {
  breakdown: AllocationBreakdown | undefined;
  isAr: boolean;
  fmtUsd: (v: number) => string;
}

function AllocationSection({ breakdown, isAr, fmtUsd }: AllocationSectionProps) {
  const isLoading = breakdown === undefined;

  const isEmpty = !isLoading && Object.keys(breakdown).length === 0;

  const grandTotal = !isLoading
    ? Object.values(breakdown).reduce((s, v) => s + v.totalUsd, 0)
    : 0;

  return (
    <Skeleton name="funding-allocations" loading={isLoading}>
      {isEmpty ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {isAr ? "لا توجد بيانات إنفاق بعد." : "No spending data yet."}
        </p>
      ) : (
        <div className="space-y-6">
          {CATEGORY_CONFIG.map((cfg) => {
            const entry = breakdown![cfg.key];
            if (!entry || entry.totalUsd === 0) return null;
            return (
              <AllocationBar
                key={cfg.key}
                config={cfg}
                totalUsd={entry.totalUsd}
                maxUsd={grandTotal}
                items={entry.items as AllocationItem[]}
                isAr={isAr}
                fmtUsd={fmtUsd}
              />
            );
          })}
        </div>
      )}
    </Skeleton>
  );
}

// ─── Payment provider badge ───────────────────────────────────────────────────

function ProviderBadge({ provider }: { provider: string }) {
  const labels: Record<string, string> = {
    github_sponsors: "GitHub Sponsors",
    stripe: "Stripe",
    other: "Other",
  };
  return (
    <Badge variant="outline" className="text-[0.6rem]">
      {labels[provider] ?? provider}
    </Badge>
  );
}

// ─── Donations Section ────────────────────────────────────────────────────────

interface DonationsSectionProps {
  donations: DonationRow[] | undefined;
  isAr: boolean;
  fmtUsd: (v: number) => string;
}

function DonationsSection({ donations, isAr, fmtUsd }: DonationsSectionProps) {
  const isLoading = donations === undefined;
  const isEmpty = !isLoading && donations.length === 0;

  const fmtDate = (ts: number) =>
    new Date(ts).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <Skeleton name="funding-donations" loading={isLoading}>
      {isEmpty ? (
        <div className="text-center py-12 space-y-4">
          <Heart size={32} className="mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {isAr
              ? "لم تُسجَّل أي تبرعات بعد. كن أول من يدعم ميزان."
              : "No donations recorded yet. Be the first to support Mizan."}
          </p>
          <Button asChild size="sm" className="gap-2">
            <a
              href="https://github.com/sponsors/Ba3lisa"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Heart size={14} />
              {isAr ? "دعم عبر GitHub Sponsors" : "Support via GitHub Sponsors"}
            </a>
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {donations!.map((d) => (
            <div key={d._id} className="py-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Heart size={14} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {d.donorName ?? (isAr ? "مجهول الهوية" : "Anonymous")}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <ProviderBadge provider={d.paymentProvider} />
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar size={10} />
                      {fmtDate(d.createdAt)}
                    </span>
                  </div>
                  {(isAr ? d.messageAr : d.messageEn) && (
                    <p className="text-xs text-muted-foreground mt-2 italic leading-relaxed">
                      &ldquo;{isAr ? d.messageAr : d.messageEn}&rdquo;
                    </p>
                  )}
                </div>
              </div>
              <span className="text-sm font-bold tabular-nums text-primary shrink-0">
                {fmtUsd(d.amountUsd)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Skeleton>
  );
}

// ─── Monthly Timeline Chart ───────────────────────────────────────────────────

interface TimelineChartProps {
  timeline: FundingSummaryRow[] | undefined;
  isAr: boolean;
  fmtUsd: (v: number) => string;
}

function TimelineChart({ timeline, isAr, fmtUsd }: TimelineChartProps) {
  const isLoading = timeline === undefined;

  if (isLoading) {
    return (
      <Skeleton name="funding-timeline" loading>
        <div className="h-36 bg-muted/20 rounded-lg" />
      </Skeleton>
    );
  }

  if (timeline.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        {isAr ? "لا توجد بيانات شهرية بعد." : "No monthly data yet."}
      </p>
    );
  }

  const svgW = 600;
  const svgH = 140;
  const padL = 60;
  const padR = 20;
  const padT = 16;
  const padB = 28;
  const innerW = svgW - padL - padR;
  const innerH = svgH - padT - padB;

  const maxVal = Math.max(...timeline.map((r) => Math.max(r.totalDonationsUsd, r.totalAllocatedUsd))) * 1.2 || 1;
  const n = timeline.length;

  const xOf = (i: number) => padL + (i / Math.max(n - 1, 1)) * innerW;
  const yOf = (v: number) => padT + (1 - v / maxVal) * innerH;

  const raisedPath = timeline
    .map((r, i) => `${i === 0 ? "M" : "L"} ${xOf(i)} ${yOf(r.totalDonationsUsd)}`)
    .join(" ");
  const spentPath = timeline
    .map((r, i) => `${i === 0 ? "M" : "L"} ${xOf(i)} ${yOf(r.totalAllocatedUsd)}`)
    .join(" ");

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full"
        style={{ minWidth: "320px", height: `${svgH}px` }}
      >
        {/* Grid lines */}
        {[0, 0.5, 1].map((frac) => {
          const y = padT + (1 - frac) * innerH;
          return (
            <g key={frac}>
              <line x1={padL} y1={y} x2={svgW - padR} y2={y} stroke="#252A36" strokeWidth={0.5} />
              <text
                x={padL - 6}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                fill="#7A8299"
                fontSize={8}
                fontFamily="var(--font-mono)"
              >
                {fmtUsd(maxVal * frac)}
              </text>
            </g>
          );
        })}

        {/* Raised area fill */}
        <path
          d={`${raisedPath} L ${xOf(n - 1)} ${padT + innerH} L ${xOf(0)} ${padT + innerH} Z`}
          fill="#2EC4B6"
          opacity={0.12}
        />

        {/* Spent area fill */}
        <path
          d={`${spentPath} L ${xOf(n - 1)} ${padT + innerH} L ${xOf(0)} ${padT + innerH} Z`}
          fill="#C9A84C"
          opacity={0.12}
        />

        {/* Raised line */}
        <path d={raisedPath} fill="none" stroke="#2EC4B6" strokeWidth={2} />

        {/* Spent line */}
        <path d={spentPath} fill="none" stroke="#C9A84C" strokeWidth={1.5} strokeDasharray="4 3" />

        {/* Month labels */}
        {timeline
          .filter((_, i) => i === 0 || i === n - 1 || (n > 6 && i % 2 === 0))
          .map((r, _i, _arr) => {
            const origIdx = timeline.indexOf(r);
            return (
              <text
                key={r.month}
                x={xOf(origIdx)}
                y={svgH - 6}
                textAnchor={origIdx === 0 ? "start" : origIdx === n - 1 ? "end" : "middle"}
                fill="#7A8299"
                fontSize={8}
                fontFamily="var(--font-mono)"
              >
                {r.month}
              </text>
            );
          })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-2 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-0.5 rounded bg-[#2EC4B6]" />
          <span className="text-xs text-muted-foreground">{isAr ? "ما جُمع" : "Raised"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-0.5 rounded bg-[#C9A84C] opacity-70 border-t border-dashed border-[#C9A84C]" />
          <span className="text-xs text-muted-foreground">{isAr ? "ما أُنفق" : "Spent"}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FundingPage() {
  const { lang, dir } = useLanguage();
  const { fromUSD, fmt, symbol } = useCurrency();
  const isAr = lang === "ar";

  const summaries = useQuery(api.funding.getFundingSummary) as FundingSummaryRow[] | undefined;
  const donations = useQuery(api.funding.getRecentDonations, { limit: 20 }) as DonationRow[] | undefined;
  const breakdown = useQuery(api.funding.getAllocationBreakdown, {}) as AllocationBreakdown | undefined;
  const timeline = useQuery(api.funding.getFundingTimeline, { months: 12 }) as FundingSummaryRow[] | undefined;

  // Format a USD value using current currency preference
  const fmtUsd = (v: number) => `${fmt(fromUSD(v))} ${symbol}`;

  const hasNoData =
    summaries !== undefined &&
    donations !== undefined &&
    summaries.length === 0 &&
    donations.length === 0;

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page">

        {/* ════════ PAGE HEADER ════════ */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest">
                {isAr ? "الشفافية" : "Transparency"}
              </p>
              <h1 className="text-2xl md:text-3xl font-black">
                {isAr ? "التمويل والشفافية" : "Funding & Transparency"}
              </h1>
            </div>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            {isAr
              ? "ميزان مشروع مفتوح المصدر يعتمد على دعم المجتمع. كل دولار يُجمع ويُنفق موثَّق هنا بشكل علني. لا توجد أسرار — الشفافية مبدأنا الأول."
              : "Mizan is an open-source project funded by the community. Every dollar raised and spent is documented here publicly. No secrets — transparency is our first principle."}
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-5">
            <Button asChild size="sm" className="gap-2">
              <a
                href="https://github.com/sponsors/Ba3lisa"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Heart size={14} />
                {isAr ? "دعم ميزان عبر GitHub Sponsors" : "Support Mizan on GitHub Sponsors"}
                <ExternalLink size={12} />
              </a>
            </Button>
            <Badge variant="outline" className="text-xs gap-1.5 py-1.5 px-3">
              <ShieldCheck size={12} className="text-emerald-400" />
              {isAr ? "تمويل موثَّق بالكامل" : "100% Transparent Funding"}
            </Badge>
          </div>
        </div>

        {/* ════════ EMPTY STATE ════════ */}
        {hasNoData && (
          <Card className="border-border/60 mb-10">
            <CardContent className="py-16 text-center space-y-5">
              <Heart size={40} className="mx-auto text-muted-foreground/30" />
              <div>
                <p className="text-base font-semibold mb-1">
                  {isAr ? "لا توجد بيانات تمويل بعد" : "No funding data yet"}
                </p>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  {isAr
                    ? "كن أول من يدعم ميزان وتظهر هنا. كل تبرع يُوثَّق علنياً."
                    : "Be the first to support Mizan and appear here. Every contribution is publicly documented."}
                </p>
              </div>
              <Button asChild size="sm" className="gap-2">
                <a
                  href="https://github.com/sponsors/Ba3lisa"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Heart size={14} />
                  {isAr ? "دعم ميزان" : "Support Mizan"}
                  <ExternalLink size={12} />
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ════════ SUMMARY CARDS ════════ */}
        <section className="mb-12" id="summary">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={16} className="text-primary" />
            <h2 className="text-base font-bold uppercase tracking-widest text-primary">
              {isAr ? "ملخص التمويل" : "Funding Summary"}
            </h2>
          </div>
          <SummaryCards summaries={summaries} isAr={isAr} fmtUsd={fmtUsd} />
        </section>

        {/* ════════ MONTHLY TIMELINE ════════ */}
        <section className="mb-12" id="timeline">
          <div className="flex items-center gap-2 mb-5">
            <DollarSign size={16} className="text-primary" />
            <h2 className="text-base font-bold uppercase tracking-widest text-primary">
              {isAr ? "الجدول الزمني (١٢ شهراً)" : "12-Month Timeline"}
            </h2>
          </div>
          <Card className="border-border/60">
            <CardContent className="p-6">
              <TimelineChart timeline={timeline} isAr={isAr} fmtUsd={fmtUsd} />
            </CardContent>
          </Card>
        </section>

        {/* ════════ WHERE MONEY GOES ════════ */}
        <section className="mb-12" id="allocations">
          <div className="flex items-center gap-2 mb-2">
            <CircleDollarSign size={16} className="text-primary" />
            <h2 className="text-base font-bold uppercase tracking-widest text-primary">
              {isAr ? "أين يذهب المال؟" : "Where Does the Money Go?"}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5 max-w-xl">
            {isAr
              ? "تفصيل كامل لكل مصاريف المشروع حسب الفئة، مع إيصالات الدفع حيثما تتوفر."
              : "Full breakdown of all project expenses by category, with payment receipts where available."}
          </p>
          <Card className="border-border/60">
            <CardContent className="p-6">
              <AllocationSection breakdown={breakdown} isAr={isAr} fmtUsd={fmtUsd} />
            </CardContent>
          </Card>
        </section>

        {/* ════════ RECENT DONATIONS ════════ */}
        <section className="mb-12" id="donations">
          <div className="flex items-center gap-2 mb-2">
            <Heart size={16} className="text-primary" />
            <h2 className="text-base font-bold uppercase tracking-widest text-primary">
              {isAr ? "آخر التبرعات" : "Recent Donations"}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5 max-w-xl">
            {isAr
              ? "شكراً لكل من يدعم هذا المشروع. يُحترم اختيار إخفاء الهوية تلقائياً."
              : "Thank you to everyone who supports this project. Anonymity choices are always respected."}
          </p>
          <Card className="border-border/60">
            <CardContent className="px-6 py-2">
              <DonationsSection donations={donations} isAr={isAr} fmtUsd={fmtUsd} />
            </CardContent>
          </Card>
        </section>

        <Separator className="my-10 opacity-30" />

        {/* ════════ HOW TO SUPPORT ════════ */}
        <section className="mb-12" id="support">
          <div className="flex items-center gap-2 mb-5">
            <Heart size={16} className="text-primary" />
            <h2 className="text-base font-bold uppercase tracking-widest text-primary">
              {isAr ? "كيف تدعم المشروع؟" : "How to Support"}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* GitHub Sponsors card */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Heart size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">GitHub Sponsors</p>
                    <p className="text-xs text-muted-foreground">github.com/sponsors/Ba3lisa</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {isAr
                    ? "يمكنك الدعم الشهري أو لمرة واحدة عبر GitHub Sponsors. أي مبلغ يُحدث فارقاً."
                    : "You can sponsor monthly or one-time via GitHub Sponsors. Any amount makes a difference."}
                </p>
                <Button asChild className="w-full gap-2" size="sm">
                  <a
                    href="https://github.com/sponsors/Ba3lisa"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Heart size={14} />
                    {isAr ? "ادعم عبر GitHub Sponsors" : "Sponsor on GitHub"}
                    <ExternalLink size={12} />
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* What your money funds */}
            <Card className="border-border/60">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <ShieldCheck size={20} className="text-muted-foreground" />
                  </div>
                  <p className="font-bold text-sm">
                    {isAr ? "ماذا يموِّل دعمك؟" : "What Does Your Support Fund?"}
                  </p>
                </div>
                <ul className="space-y-2">
                  {[
                    {
                      icon: <Server size={13} className="text-[#6C8EEF]" />,
                      en: "Server & database hosting (Convex, Vercel)",
                      ar: "استضافة الخوادم وقواعد البيانات",
                    },
                    {
                      icon: <Bot size={13} className="text-primary" />,
                      en: "AI API costs for automated data collection",
                      ar: "تكاليف الذكاء الاصطناعي لجمع البيانات تلقائياً",
                    },
                    {
                      icon: <Database size={13} className="text-[#E76F51]" />,
                      en: "Manual data acquisition and verification",
                      ar: "جمع البيانات والتحقق منها يدوياً",
                    },
                    {
                      icon: <Code2 size={13} className="text-[#2EC4B6]" />,
                      en: "Open-source development and maintenance",
                      ar: "التطوير مفتوح المصدر والصيانة المستمرة",
                    },
                  ].map((item) => (
                    <li key={item.en} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-0.5 shrink-0">{item.icon}</span>
                      {isAr ? item.ar : item.en}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ════════ FOOTER NOTE ════════ */}
        <div className="text-center text-xs text-muted-foreground/60 pb-8 space-y-1">
          <p>
            {isAr
              ? "ميزان مشروع مستقل غير مرتبط بأي حكومة أو حزب."
              : "Mizan is an independent project, not affiliated with any government or political party."}
          </p>
          <p>
            <Link href="/methodology" className="text-primary hover:underline">
              {isAr ? "اقرأ عن منهجيتنا" : "Read about our methodology"}
            </Link>
            {" · "}
            <Link href="/transparency" className="text-primary hover:underline">
              {isAr ? "سجل تدقيق البيانات" : "Data audit trail"}
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
