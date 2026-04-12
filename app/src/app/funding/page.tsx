"use client";

import { useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useLanguage } from "@/components/providers";
import { fmtUSD } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
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
  Activity,
  Cpu,
  ChevronDown,
  ChevronRight,
  Zap,
  Globe,
  Layers,
  BrainCircuit,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  LineChart,
  PieChart,
  Pie,
  Area,
  Line,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

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

// Types for usage data (api.usage may not exist yet — handled defensively)
interface DailyUsageEntry {
  date: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  callCount: number;
}

interface ProviderUsageEntry {
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  callCount: number;
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

// ─── Fixed infrastructure costs ───────────────────────────────────────────────

const FIXED_COSTS = [
  { serviceEn: "Convex (current: Starter)", serviceAr: "Convex (الباقة الحالية)", monthlyUsd: 10, maxUsd: 20, noteEn: "Pay-as-you-go, capped at $20", noteAr: "دفع حسب الاستخدام، بحد أقصى $20", paidSince: "2026-03" },
  { serviceEn: "DigitalOcean App Platform", serviceAr: "DigitalOcean App", monthlyUsd: 12, noteEn: "App hosting + deployment", noteAr: "استضافة التطبيق", paidSince: "2026-04" },
  { serviceEn: "Cloudflare DNS + CDN", serviceAr: "Cloudflare DNS + CDN", monthlyUsd: 0, noteEn: "Free tier", noteAr: "مجاني", paidSince: "2026-04" },
];
const FIXED_TOTAL_USD = FIXED_COSTS.reduce((s, c) => s + c.monthlyUsd, 0);

// ─── Scaling Roadmap tiers ────────────────────────────────────────────────────

const SCALING_TIERS = [
  {
    budgetUsd: 22,
    labelEn: "Current — Bootstrapped",
    labelAr: "الحالي — تمويل ذاتي",
    color: "#C9A84C",
    featuresEn: [
      "Single LLM (Claude Haiku) for data extraction",
      "12-hour automated refresh cycle",
      "Basic HTML scraping (no JS-rendered sites)",
      "~120 AI calls/month, minimal token budget",
    ],
    featuresAr: [
      "نموذج واحد (Claude Haiku) لاستخراج البيانات",
      "تحديث تلقائي كل 12 ساعة",
      "استخراج HTML أساسي (بدون مواقع JS)",
      "~120 استدعاء AI شهرياً، ميزانية محدودة",
    ],
    current: true,
  },
  {
    budgetUsd: 75,
    labelEn: "Multi-Model Verification",
    labelAr: "تحقق متعدد النماذج",
    color: "#6C8EEF",
    featuresEn: [
      "3 LLM providers (Claude + GPT-4o-mini + Gemini Flash)",
      "LLM Council: every data point verified by 3 models",
      "3-hour refresh cycle for key indicators",
      "~1,000 AI calls/month across providers",
    ],
    featuresAr: [
      "3 نماذج ذكاء اصطناعي (Claude + GPT + Gemini)",
      "مجلس التحقق: كل بيان يُراجع من 3 نماذج",
      "تحديث المؤشرات الرئيسية كل 3 ساعات",
      "~1,000 استدعاء AI شهرياً عبر النماذج",
    ],
    current: false,
  },
  {
    budgetUsd: 200,
    labelEn: "Browser Automation",
    labelAr: "أتمتة المتصفح",
    color: "#2EC4B6",
    featuresEn: [
      "Browserbase: access JS-rendered gov sites (cabinet.gov.eg, parliament.gov.eg)",
      "Hourly refresh for exchange rates + stock market",
      "Deep extraction: PDFs, dynamic tables, multi-page navigation",
      "~5,000 AI calls + ~500 browser sessions/month",
    ],
    featuresAr: [
      "Browserbase: الوصول للمواقع الحكومية (مجلس الوزراء، البرلمان)",
      "تحديث سعر الصرف والبورصة كل ساعة",
      "استخراج عميق: PDF، جداول ديناميكية، تنقل متعدد الصفحات",
      "~5,000 استدعاء AI + ~500 جلسة متصفح شهرياً",
    ],
    current: false,
  },
  {
    budgetUsd: 500,
    labelEn: "Social Intelligence + Advanced AI",
    labelAr: "ذكاء اجتماعي + ذكاء اصطناعي متقدم",
    color: "#E76F51",
    featuresEn: [
      "X (Twitter) API: collect Egyptian public discourse on government + economy",
      "Claude Sonnet / GPT-4o for complex analysis (not just extraction)",
      "Multi-source cross-referencing: every number verified from 3+ sources",
      "AI-generated Arabic research reports with citations",
      "~50K tweet reads/month via official X API pay-per-use ($250)",
    ],
    featuresAr: [
      "واجهة X (تويتر): جمع النقاش المصري العام حول الحكومة والاقتصاد",
      "Claude Sonnet / GPT-4o للتحليل المعقد (ليس فقط استخراج)",
      "مراجعة من 3+ مصادر لكل رقم",
      "تقارير بحثية عربية بالذكاء الاصطناعي مع مراجع",
      "~50 ألف تغريدة شهرياً عبر واجهة X الرسمية ($250)",
    ],
    current: false,
  },
  {
    budgetUsd: 1000,
    labelEn: "Real-Time Data + Full Social Monitoring",
    labelAr: "بيانات لحظية + مراقبة اجتماعية كاملة",
    color: "#9B72CF",
    featuresEn: [
      "X API Pro ($200+): 300K+ tweet reads/month, full archive search",
      "Real-time feeds: EGX tick data, CBE rate changes, breaking news",
      "ML anomaly detection: flag unusual data changes automatically",
      "Full 596 parliament member tracking with social media activity",
      "Public API for researchers, journalists, and civic organizations",
    ],
    featuresAr: [
      "واجهة X احترافية: 300+ ألف تغريدة شهرياً، بحث الأرشيف الكامل",
      "بيانات لحظية: بورصة، أسعار بنك مركزي، أخبار عاجلة",
      "كشف تلقائي للبيانات غير الطبيعية بالتعلم الآلي",
      "متابعة كاملة لـ596 نائب مع نشاطهم على وسائل التواصل",
      "واجهة برمجة عامة للباحثين والصحفيين والمنظمات المدنية",
    ],
    current: false,
  },
];

// ─── Provider colors ──────────────────────────────────────────────────────────

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: "#C9A84C",
  openai: "#2EC4B6",
  google: "#6C8EEF",
  openrouter: "#E76F51",
  other: "#7A8299",
};

// ─── Fade-in animation props ──────────────────────────────────────────────────

const fadeInUpProps = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: "easeOut" },
  viewport: { once: true, margin: "-80px" },
} as const;

// ─── Summary Cards ────────────────────────────────────────────────────────────

interface SummaryCardsProps {
  summaries: FundingSummaryRow[] | undefined;
}

function SummaryCards({ summaries }: SummaryCardsProps) {
  const { t } = useLanguage();
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
      label: t.funding_totalRaised,
      value: fmtUSD(totals.raised),
      icon: <TrendingUp size={18} className="text-emerald-400" />,
      accent: "text-emerald-400",
    },
    {
      label: t.funding_totalSpent,
      value: fmtUSD(totals.spent),
      icon: <DollarSign size={18} className="text-primary" />,
      accent: "text-primary",
    },
    {
      label: t.funding_currentBalance,
      value: fmtUSD(totals.balance),
      icon: <CircleDollarSign size={18} className="text-blue-400" />,
      accent: totals.balance >= 0 ? "text-blue-400" : "text-red-400",
    },
    {
      label: t.funding_sponsors,
      value: isLoading ? "—" : "GitHub Sponsors",
      icon: <Users size={18} className="text-purple-400" />,
      accent: "text-purple-400",
    },
  ];

  return (
    <Skeleton name="funding-summary" loading={isLoading}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.label} className="border-border/60">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {card.label}
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
}

function AllocationBar({ config, totalUsd, maxUsd, items }: AllocationBarProps) {
  const { t, lang } = useLanguage();
  const isAr = lang === "ar";
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
            {fmtUSD(totalUsd)}
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
                      {t.funding_recurring}
                    </Badge>
                  )}
                  {item.receiptUrl && (
                    <a
                      href={item.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary inline-flex items-center gap-0.5 hover:underline"
                    >
                      {t.funding_receipt} <ExternalLink size={8} />
                    </a>
                  )}
                </div>
              </div>
              <span className="tabular-nums text-foreground/80 shrink-0">
                {fmtUSD(item.amountUsd)}
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
}

function AllocationSection({ breakdown }: AllocationSectionProps) {
  const { t } = useLanguage();
  const isLoading = breakdown === undefined;

  const isEmpty = !isLoading && Object.keys(breakdown ?? {}).length === 0;

  const grandTotal = breakdown
    ? Object.values(breakdown).reduce((s, v) => s + v.totalUsd, 0)
    : 0;

  return (
    <Skeleton name="funding-allocations" loading={isLoading}>
      {isEmpty ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {t.funding_noSpendingData}
        </p>
      ) : (
        <div className="space-y-6">
          {CATEGORY_CONFIG.map((cfg) => {
            const entry = breakdown?.[cfg.key];
            if (!entry || entry.totalUsd === 0) return null;
            return (
              <AllocationBar
                key={cfg.key}
                config={cfg}
                totalUsd={entry.totalUsd}
                maxUsd={grandTotal}
                items={entry.items as AllocationItem[]}
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
}

function DonationsSection({ donations }: DonationsSectionProps) {
  const { t, lang } = useLanguage();
  const isAr = lang === "ar";
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
            {t.funding_noDonationsYet}
          </p>
          <Button asChild size="sm" className="gap-2">
            <a
              href="https://github.com/sponsors/Ba3lisa"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Heart size={14} />
              {t.funding_supportViaGithub}
            </a>
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {(donations ?? []).map((d) => (
            <div key={d._id} className="py-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Heart size={14} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {d.donorName ?? t.funding_anonymous}
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
                {fmtUSD(d.amountUsd)}
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
}

function TimelineChart({ timeline }: TimelineChartProps) {
  const { t } = useLanguage();
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
        {t.funding_noMonthlyData}
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
                {fmtUSD(maxVal * frac)}
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
          <span className="text-xs text-muted-foreground">{t.funding_raised}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-0.5 rounded bg-[#C9A84C] opacity-70 border-t border-dashed border-[#C9A84C]" />
          <span className="text-xs text-muted-foreground">{t.funding_spent}</span>
        </div>
      </div>
    </div>
  );
}

// ─── API Usage Dashboard ──────────────────────────────────────────────────────
// Uses api.usage queries that may not exist yet. If the module is absent, shows
// a placeholder card instead of crashing.

// Determine at module load whether api.usage exists. It's stable per build.
const usageApi = (api as unknown as Record<string, Record<string, unknown>>)["usage"] as
  | {
      getDailyUsage: Parameters<typeof useQuery>[0];
      getUsageByProvider: Parameters<typeof useQuery>[0];
    }
  | undefined;

// This inner component is only mounted when usageApi is defined.
function ApiUsageDashboardInner() {
  const { t, lang } = useLanguage();
  const _isAr = lang === "ar";
  // Hooks are always called here since this component is only mounted when
  // usageApi is defined — safe per Rules of Hooks.
  const dailyUsage = useQuery(
    usageApi!.getDailyUsage,
    { days: 30 },
  ) as DailyUsageEntry[] | null | undefined;

  const providerUsage = useQuery(
    usageApi!.getUsageByProvider,
    { days: 30 },
  ) as ProviderUsageEntry[] | null | undefined;

  const currentMonthCost = dailyUsage
    ? dailyUsage.slice(-30).reduce((s, d) => s + d.costUsd, 0)
    : null;

  const currentMonthTokens = dailyUsage
    ? dailyUsage.slice(-30).reduce((s, d) => s + d.totalTokens, 0)
    : null;

  const totalCalls = dailyUsage
    ? dailyUsage.slice(-30).reduce((s, d) => s + d.callCount, 0)
    : null;

  // Accumulate cost over time for line chart
  const costAccumulation = dailyUsage
    ? dailyUsage.reduce<Array<{ date: string; cumulative: number }>>((acc, d, i) => {
        const prev = i > 0 ? acc[i - 1].cumulative : 0;
        acc.push({ date: d.date.slice(5), cumulative: Math.round((prev + d.costUsd) * 100) / 100 });
        return acc;
      }, [])
    : [];

  const fmtTokens = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : String(n);

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: t.funding_apiCost30d,
            value: currentMonthCost !== null ? `$${currentMonthCost.toFixed(2)}` : "—",
            icon: <DollarSign size={16} className="text-[#C9A84C]" />,
            accent: "text-[#C9A84C]",
          },
          {
            label: t.funding_totalTokens,
            value: currentMonthTokens !== null ? fmtTokens(currentMonthTokens) : "—",
            icon: <Cpu size={16} className="text-[#6C8EEF]" />,
            accent: "text-[#6C8EEF]",
          },
          {
            label: t.funding_apiCalls,
            value: totalCalls !== null ? totalCalls.toLocaleString() : "—",
            icon: <Activity size={16} className="text-[#2EC4B6]" />,
            accent: "text-[#2EC4B6]",
          },
          {
            label: t.funding_providers,
            value: providerUsage ? String(providerUsage.length) : "—",
            icon: <Globe size={16} className="text-purple-400" />,
            accent: "text-purple-400",
          },
        ].map((card) => (
          <Card key={card.label} className="border-border/60">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {card.label}
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

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Daily tokens area chart */}
        <Card className="border-border/60">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              {t.funding_dailyTokens}
            </p>
            {!dailyUsage || dailyUsage.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground/60">
                {t.funding_noDataYet}
              </div>
            ) : (
              <div dir="ltr" className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyUsage} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#252A36" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 9, fill: "#7A8299" }}
                      tickLine={false}
                      axisLine={false}
                      interval={6}
                      tickFormatter={(v: string) => v.slice(5)}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: "#7A8299" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => fmtTokens(v)}
                    />
                    <Tooltip
                      contentStyle={{ background: "#1A1F2E", border: "1px solid #252A36", borderRadius: 6 }}
                      labelStyle={{ color: "#7A8299", fontSize: 10 }}
                      itemStyle={{ color: "#C9A84C", fontSize: 10 }}
                      formatter={(v: unknown) => [fmtTokens(Number(v)), t.funding_tokens]}
                    />
                    <Area
                      type="monotone"
                      dataKey="totalTokens"
                      stroke="#C9A84C"
                      strokeWidth={2}
                      fill="url(#tokenGrad)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Provider breakdown pie */}
        <Card className="border-border/60">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              {t.funding_aiProviderBreakdown}
            </p>
            {!providerUsage || providerUsage.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground/60">
                {t.funding_noDataYet}
              </div>
            ) : (
              <div dir="ltr" className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={providerUsage}
                      dataKey="totalTokens"
                      nameKey="provider"
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={55}
                      paddingAngle={3}
                    >
                      {providerUsage.map((entry, idx) => (
                        <Cell
                          key={`cell-${idx}`}
                          fill={PROVIDER_COLORS[entry.provider.toLowerCase()] ?? "#7A8299"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#1A1F2E", border: "1px solid #252A36", borderRadius: 6 }}
                      labelStyle={{ color: "#7A8299", fontSize: 10 }}
                      itemStyle={{ fontSize: 10 }}
                      formatter={(v: unknown) => [fmtTokens(Number(v)), t.funding_tokens]}
                    />
                    <Legend
                      formatter={(value: string) => (
                        <span style={{ fontSize: 10, color: "#7A8299" }}>
                          {value.charAt(0).toUpperCase() + value.slice(1)}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cost accumulation line */}
      <Card className="border-border/60">
        <CardContent className="p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            {t.funding_costAccumulation}
          </p>
          {costAccumulation.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-sm text-muted-foreground/60">
              {t.funding_noDataYet}
            </div>
          ) : (
            <div dir="ltr" className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={costAccumulation} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#252A36" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: "#7A8299" }}
                    tickLine={false}
                    axisLine={false}
                    interval={6}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "#7A8299" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `$${v.toFixed(1)}`}
                  />
                  <Tooltip
                    contentStyle={{ background: "#1A1F2E", border: "1px solid #252A36", borderRadius: 6 }}
                    labelStyle={{ color: "#7A8299", fontSize: 10 }}
                    itemStyle={{ color: "#2EC4B6", fontSize: 10 }}
                    formatter={(v: unknown) => [`$${Number(v).toFixed(2)}`, t.funding_cumulativeCost]}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#2EC4B6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ApiUsageDashboard() {
  const { t } = useLanguage();
  if (!usageApi) {
    // Data agent hasn't created api.usage yet — show placeholder
    return (
      <Card className="border-border/60 border-dashed">
        <CardContent className="py-12 text-center space-y-3">
          <BrainCircuit size={28} className="mx-auto text-muted-foreground/30" />
          <p className="text-sm font-semibold text-muted-foreground">
            {t.funding_comingSoonDashboard}
          </p>
          <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto">
            {t.funding_comingSoonDashboardDesc}
          </p>
        </CardContent>
      </Card>
    );
  }

  return <ApiUsageDashboardInner />;
}

// ─── Infrastructure Costs Card ────────────────────────────────────────────────

interface InfrastructureCostsCardProps {
  apiCostThisMonth: number | null;
}

function InfrastructureCostsCard({ apiCostThisMonth }: InfrastructureCostsCardProps) {
  const { t, lang } = useLanguage();
  const isAr = lang === "ar";
  const total = FIXED_TOTAL_USD + (apiCostThisMonth ?? 0);

  return (
    <Card className="border-border/60">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Server size={16} className="text-[#6C8EEF]" />
          <p className="text-sm font-bold">
            {t.funding_monthlyCostBreakdown}
          </p>
        </div>
        <div className="space-y-2">
          {FIXED_COSTS.map((row) => (
            <div key={row.serviceEn} className="space-y-0.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{isAr ? row.serviceAr : row.serviceEn}</span>
                <span className="tabular-nums font-mono text-foreground/80">
                  {row.monthlyUsd === 0 ? t.funding_free : fmtUSD(row.monthlyUsd)}
                  {"maxUsd" in row && row.maxUsd ? ` / ${fmtUSD(row.maxUsd)} max` : ""}
                </span>
              </div>
              {"noteEn" in row && (
                <p className="text-[0.6rem] text-muted-foreground/50">
                  {isAr ? row.noteAr : row.noteEn}
                  {"paidSince" in row && ` · ${t.funding_paidSince} ${row.paidSince}`}
                </p>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Bot size={12} className="text-[#C9A84C]" />
              {t.funding_aiApiThisMonth}
            </span>
            <span className="tabular-nums font-mono text-[#C9A84C]">
              {apiCostThisMonth !== null ? fmtUSD(apiCostThisMonth) : "—"}
            </span>
          </div>
          <Separator className="my-2 opacity-30" />
          <div className="flex items-center justify-between text-sm font-bold">
            <span>{t.funding_totalMonthly}</span>
            <span className="tabular-nums text-primary">{fmtUSD(total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Runway Calculator ────────────────────────────────────────────────────────

interface RunwayCalculatorProps {
  summaries: FundingSummaryRow[] | undefined;
  apiCostThisMonth: number | null;
}

function RunwayCalculator({ summaries, apiCostThisMonth }: RunwayCalculatorProps) {
  const { t } = useLanguage();
  const isLoading = summaries === undefined;

  const balance = summaries
    ? summaries.reduce((s, r) => s + r.totalDonationsUsd - r.totalAllocatedUsd, 0)
    : 0;

  const monthlyBurn = FIXED_TOTAL_USD + (apiCostThisMonth ?? 0);
  const runwayMonths = monthlyBurn > 0 ? Math.floor(balance / monthlyBurn) : Infinity;
  const progressPct = Math.min(100, Math.max(0, (runwayMonths / 12) * 100));

  const runwayColor =
    runwayMonths > 6
      ? { bar: "#2EC4B6", text: "text-[#2EC4B6]" }
      : runwayMonths >= 3
      ? { bar: "#C9A84C", text: "text-[#C9A84C]" }
      : { bar: "#E5484D", text: "text-[#E5484D]" };

  const runwayLabel =
    runwayMonths === Infinity
      ? t.funding_unlimited
      : `${runwayMonths} ${t.funding_months}`;

  return (
    <Card className="border-border/60">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp size={16} className="text-primary" />
          <p className="text-sm font-bold">
            {t.funding_runwayCalc}
          </p>
        </div>

        {isLoading ? (
          <div className="h-24 bg-muted/20 rounded-lg animate-pulse" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t.funding_currentBalance}
                </p>
                <p className="text-lg font-black text-blue-400 tabular-nums">{fmtUSD(balance)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t.funding_monthlyBurn}
                </p>
                <p className="text-lg font-black text-[#C9A84C] tabular-nums">{fmtUSD(monthlyBurn)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t.funding_runway}
                </p>
                <p className={cn("text-lg font-black tabular-nums", runwayColor.text)}>
                  {runwayLabel}
                </p>
              </div>
            </div>

            <div>
              <div className="h-3 w-full rounded-full bg-muted/30 overflow-hidden">
                <div
                  className="h-3 rounded-full transition-all duration-700"
                  style={{ width: `${progressPct}%`, backgroundColor: runwayColor.bar }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[0.6rem] text-muted-foreground">0</span>
                <span className="text-[0.6rem] text-muted-foreground">6 {t.funding_mo}</span>
                <span className="text-[0.6rem] text-muted-foreground">12 {t.funding_mo}</span>
              </div>
            </div>

            {runwayMonths < 3 && (
              <p className="text-xs text-[#E5484D] bg-[#E5484D]/10 rounded-lg px-3 py-2">
                {t.funding_lowRunwayWarning}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Scaling Roadmap ──────────────────────────────────────────────────────────

function ScalingRoadmap() {
  const { t, lang } = useLanguage();
  const isAr = lang === "ar";
  return (
    <div className="space-y-4">
      {SCALING_TIERS.map((tier, idx) => (
        <div
          key={tier.budgetUsd}
          className={cn(
            "relative rounded-xl border p-5 transition-all",
            tier.current
              ? "border-[#C9A84C]/60 bg-[#C9A84C]/5 shadow-[0_0_20px_rgba(201,168,76,0.08)]"
              : "border-border/40 opacity-70 hover:opacity-90",
          )}
        >
          {/* Gold top-border accent for current tier */}
          {tier.current && (
            <div
              className="absolute top-0 left-6 right-6 h-0.5 rounded-full"
              style={{ backgroundColor: tier.color }}
            />
          )}

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ backgroundColor: tier.color + "22", color: tier.color }}
              >
                <Layers size={15} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-bold" style={{ color: tier.color }}>
                    {isAr ? tier.labelAr : tier.labelEn}
                  </span>
                  {tier.current && (
                    <Badge
                      variant="outline"
                      className="text-[0.55rem] px-1.5 py-0"
                      style={{ borderColor: tier.color + "60", color: tier.color }}
                    >
                      {t.funding_current}
                    </Badge>
                  )}
                </div>
                <ul className="space-y-1 mt-2">
                  {(isAr ? tier.featuresAr : tier.featuresEn).map((f, fi) => (
                    <li key={fi} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <ChevronRight size={10} className="mt-0.5 shrink-0" style={{ color: tier.color }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xl font-black tabular-nums" style={{ color: tier.color }}>
                {fmtUSD(tier.budgetUsd)}
              </p>
              <p className="text-[0.6rem] text-muted-foreground">{t.funding_perMonth}</p>
              {idx < SCALING_TIERS.length - 1 && (
                <p className="text-[0.6rem] text-muted-foreground/50 mt-1">
                  {t.funding_nextTier}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Cost Transparency Table ──────────────────────────────────────────────────

// Similar to ApiUsageDashboard — only mount inner query component when API exists
function CostTransparencyTable() {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  if (!usageApi) {
    return (
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-2">
          <Activity size={14} />
          {t.funding_apiCallLog}
        </span>
        <ChevronDown
          size={14}
          className={cn("transition-transform", expanded && "rotate-180")}
        />
      </button>
    );
  }

  return <CostTransparencyTableInner />;
}

function CostTransparencyTableInner() {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  const recentData = useQuery(
    usageApi!.getDailyUsage,
    { days: 7 },
  ) as DailyUsageEntry[] | null | undefined;

  return (
    <div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold hover:text-primary transition-colors"
      >
        <span className="flex items-center gap-2">
          <Activity size={14} />
          {t.funding_apiCallLog}
          {recentData && (
            <Badge variant="secondary" className="text-[0.6rem] px-1.5 py-0">
              {recentData.length}
            </Badge>
          )}
        </span>
        <ChevronDown
          size={14}
          className={cn("transition-transform", expanded && "rotate-180")}
        />
      </button>

      {expanded && (
        <div className="border-t border-border/40 overflow-x-auto">
          {!recentData || recentData.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground/60">
              {t.funding_noDataAvailable}
            </p>
          ) : (
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-border/40 bg-muted/20">
                  {[
                    t.funding_colDate,
                    t.funding_colTokensIn,
                    t.funding_colTokensOut,
                    t.funding_colTotalTokens,
                    t.funding_colCost,
                    t.funding_colCalls,
                  ].map((label) => (
                    <th
                      key={label}
                      className="px-4 py-2 text-start text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentData.slice(0, 20).map((row, i) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-2.5 tabular-nums text-xs font-mono text-muted-foreground">
                      {row.date}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-xs">
                      {row.inputTokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-xs">
                      {row.outputTokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-xs font-semibold">
                      {row.totalTokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-xs text-[#C9A84C] font-mono">
                      ${row.costUsd.toFixed(4)}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-xs text-muted-foreground">
                      {row.callCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FundingPage() {
  const { t, lang, dir } = useLanguage();
  const _isAr = lang === "ar";

  const summaries = useQuery(api.funding.getFundingSummary) as FundingSummaryRow[] | undefined;
  const donations = useQuery(api.funding.getRecentDonations, { limit: 20 }) as DonationRow[] | undefined;
  const breakdown = useQuery(api.funding.getAllocationBreakdown, {}) as AllocationBreakdown | undefined;
  const timeline = useQuery(api.funding.getFundingTimeline, { months: 12 }) as FundingSummaryRow[] | undefined;

  const hasNoData =
    summaries !== undefined &&
    donations !== undefined &&
    summaries.length === 0 &&
    donations.length === 0;

  // Compute API cost this month for infrastructure / runway cards.
  // If usage API doesn't exist, stays null.
  const apiCostThisMonth: number | null = null;

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
                {t.funding_transparencyLabel}
              </p>
              <h1 className="text-2xl md:text-3xl font-black">
                {t.funding_title}
              </h1>
            </div>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            {t.funding_description}
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-5">
            <Button asChild size="sm" className="gap-2">
              <a
                href="https://github.com/sponsors/Ba3lisa"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Heart size={14} />
                {t.funding_supportMizan}
                <ExternalLink size={12} />
              </a>
            </Button>
            <Badge variant="outline" className="text-xs gap-1.5 py-1.5 px-3">
              <ShieldCheck size={12} className="text-emerald-400" />
              {t.funding_transparentBadge}
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
                  {t.funding_noDataYetTitle}
                </p>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  {t.funding_noDataYetDesc}
                </p>
              </div>
              <Button asChild size="sm" className="gap-2">
                <a
                  href="https://github.com/sponsors/Ba3lisa"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Heart size={14} />
                  {t.funding_supportMizanShort}
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
              {t.funding_summary}
            </h2>
          </div>
          <SummaryCards summaries={summaries} />
        </section>

        {/* ════════ AI API USAGE DASHBOARD ════════ */}
        <motion.section
          className="mb-12"
          id="api-usage"
          {...fadeInUpProps}
        >
          <div className="flex items-center gap-2 mb-5">
            <BrainCircuit size={16} className="text-primary" />
            <h2 className="text-base font-bold uppercase tracking-widest text-primary">
              {t.funding_aiApiUsage}
            </h2>
          </div>
          <ApiUsageDashboard />
        </motion.section>

        {/* ════════ INFRASTRUCTURE + RUNWAY ════════ */}
        <motion.section
          className="mb-12"
          id="costs"
          {...fadeInUpProps}
        >
          <div className="flex items-center gap-2 mb-5">
            <Zap size={16} className="text-primary" />
            <h2 className="text-base font-bold uppercase tracking-widest text-primary">
              {t.funding_costsAndRunway}
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <InfrastructureCostsCard
              apiCostThisMonth={apiCostThisMonth}
            />
            <RunwayCalculator
              summaries={summaries}
              apiCostThisMonth={apiCostThisMonth}
            />
          </div>
        </motion.section>

        {/* ════════ MONTHLY TIMELINE ════════ */}
        <section className="mb-12" id="timeline">
          <div className="flex items-center gap-2 mb-5">
            <DollarSign size={16} className="text-primary" />
            <h2 className="text-base font-bold uppercase tracking-widest text-primary">
              {t.funding_timeline}
            </h2>
          </div>
          <Card className="border-border/60">
            <CardContent className="p-6">
              <TimelineChart timeline={timeline} />
            </CardContent>
          </Card>
        </section>

        {/* ════════ WHERE MONEY GOES ════════ */}
        <section className="mb-12" id="allocations">
          <div className="flex items-center gap-2 mb-2">
            <CircleDollarSign size={16} className="text-primary" />
            <h2 className="text-base font-bold uppercase tracking-widest text-primary">
              {t.funding_whereMoneyGoes}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5 max-w-xl">
            {t.funding_whereMoneyGoesDesc}
          </p>
          <Card className="border-border/60">
            <CardContent className="p-6">
              <AllocationSection breakdown={breakdown} />
            </CardContent>
          </Card>
        </section>

        {/* ════════ SCALING ROADMAP ════════ */}
        <motion.section
          className="mb-12"
          id="roadmap"
          {...fadeInUpProps}
        >
          <div className="flex items-center gap-2 mb-2">
            <Layers size={16} className="text-primary" />
            <h2 className="text-base font-bold uppercase tracking-widest text-primary">
              {t.funding_scalingRoadmap}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5 max-w-xl">
            {t.funding_scalingRoadmapDesc}
          </p>
          <ScalingRoadmap />
        </motion.section>

        {/* ════════ COST TRANSPARENCY TABLE ════════ */}
        <motion.section
          className="mb-12"
          id="transparency-table"
          {...fadeInUpProps}
        >
          <div className="flex items-center gap-2 mb-5">
            <Activity size={16} className="text-primary" />
            <h2 className="text-base font-bold uppercase tracking-widest text-primary">
              {t.funding_costTransparencyLog}
            </h2>
          </div>
          <Card className="border-border/60 overflow-hidden">
            <CostTransparencyTable />
          </Card>
        </motion.section>

        {/* ════════ RECENT DONATIONS ════════ */}
        <section className="mb-12" id="donations">
          <div className="flex items-center gap-2 mb-2">
            <Heart size={16} className="text-primary" />
            <h2 className="text-base font-bold uppercase tracking-widest text-primary">
              {t.funding_recentDonations}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5 max-w-xl">
            {t.funding_recentDonationsDesc}
          </p>
          <Card className="border-border/60">
            <CardContent className="px-6 py-2">
              <DonationsSection donations={donations} />
            </CardContent>
          </Card>
        </section>

        <Separator className="my-10 opacity-30" />

        {/* ════════ HOW TO SUPPORT ════════ */}
        <section className="mb-12" id="support">
          <div className="flex items-center gap-2 mb-5">
            <Heart size={16} className="text-primary" />
            <h2 className="text-base font-bold uppercase tracking-widest text-primary">
              {t.funding_howToSupport}
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
                  {t.funding_sponsorDesc}
                </p>
                <Button asChild className="w-full gap-2" size="sm">
                  <a
                    href="https://github.com/sponsors/Ba3lisa"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Heart size={14} />
                    {t.funding_sponsorOnGithub}
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
                    {t.funding_whatSupportFunds}
                  </p>
                </div>
                <ul className="space-y-2">
                  {([
                    { icon: <Server size={13} className="text-[#6C8EEF]" />, label: t.funding_fundServers },
                    { icon: <Bot size={13} className="text-primary" />, label: t.funding_fundAiApi },
                    { icon: <Database size={13} className="text-[#E76F51]" />, label: t.funding_fundDataAcq },
                    { icon: <Code2 size={13} className="text-[#2EC4B6]" />, label: t.funding_fundOpenSource },
                  ] as const).map((item) => (
                    <li key={item.label} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-0.5 shrink-0">{item.icon}</span>
                      {item.label}
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
            {t.funding_independentNote}
          </p>
          <p>
            <Link href="/methodology" className="text-primary hover:underline">
              {t.funding_readMethodology}
            </Link>
            {" · "}
            <Link href="/transparency" className="text-primary hover:underline">
              {t.funding_dataAuditTrail}
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
