"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Skeleton } from "boneyard-js/react";
import { useLanguage } from "@/components/providers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Database,
  ArrowRight,
  BrainCircuit,
} from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface IndicatorMeta {
  key: string;
  nameAr: string;
  nameEn: string;
  sourceEn: string;
  sourceAr: string;
  sourceUrl: string;
  unit?: string;
  highlight?: boolean;
  isMonetary?: boolean; // USD-denominated, eligible for currency toggle
}

// ─── Indicator Metadata ───────────────────────────────────────────────────────

const KEY_METRICS: IndicatorMeta[] = [
  {
    key: "gdp_growth",
    nameAr: "نمو الناتج المحلي الإجمالي",
    nameEn: "GDP Growth",
    sourceEn: "World Bank",
    sourceAr: "البنك الدولي",
    sourceUrl: "https://data.worldbank.org/country/egypt-arab-rep",
  },
  {
    key: "inflation",
    nameAr: "معدل التضخم",
    nameEn: "Inflation Rate",
    sourceEn: "CAPMAS",
    sourceAr: "الجهاز المركزي للتعبئة",
    sourceUrl: "https://www.capmas.gov.eg",
  },
  {
    key: "unemployment",
    nameAr: "معدل البطالة",
    nameEn: "Unemployment",
    sourceEn: "CAPMAS",
    sourceAr: "الجهاز المركزي للتعبئة",
    sourceUrl: "https://www.capmas.gov.eg",
  },
  {
    key: "exchange_rate",
    nameAr: "سعر الدولار",
    nameEn: "USD/EGP Rate",
    sourceEn: "Central Bank of Egypt",
    sourceAr: "البنك المركزي المصري",
    sourceUrl: "https://www.cbe.org.eg/en/economic-research/statistics",
    highlight: true,
  },
];

const MONEY_FLOWS: IndicatorMeta[] = [
  {
    key: "remittances",
    nameAr: "تحويلات المصريين بالخارج",
    nameEn: "Remittances",
    sourceEn: "World Bank",
    sourceAr: "البنك الدولي",
    sourceUrl: "https://data.worldbank.org/indicator/BX.TRF.PWKR.CD.DT",
    isMonetary: true,
  },
  {
    key: "fdi_inflows",
    nameAr: "الاستثمار الأجنبي المباشر",
    nameEn: "FDI Inflows",
    sourceEn: "World Bank",
    sourceAr: "البنك الدولي",
    sourceUrl: "https://data.worldbank.org/indicator/BX.KLT.DINV.CD.WD",
    isMonetary: true,
  },
  {
    key: "tourism_receipts",
    nameAr: "إيرادات السياحة",
    nameEn: "Tourism Receipts",
    sourceEn: "World Bank",
    sourceAr: "البنك الدولي",
    sourceUrl: "https://data.worldbank.org/indicator/ST.INT.RCPT.CD",
    isMonetary: true,
  },
  {
    key: "suez_revenue",
    nameAr: "إيرادات قناة السويس",
    nameEn: "Suez Canal Revenue",
    sourceEn: "Suez Canal Authority",
    sourceAr: "هيئة قناة السويس",
    sourceUrl: "https://www.suezcanal.gov.eg",
    isMonetary: true,
  },
  {
    key: "current_account",
    nameAr: "الحساب الجاري",
    nameEn: "Current Account",
    sourceEn: "World Bank",
    sourceAr: "البنك الدولي",
    sourceUrl: "https://data.worldbank.org/indicator/BN.CAB.XOKA.CD",
    isMonetary: true,
  },
];

const MARKETS: IndicatorMeta[] = [
  {
    key: "egx30",
    nameAr: "مؤشر البورصة المصرية EGX 30",
    nameEn: "EGX 30 Index",
    sourceEn: "Egyptian Exchange",
    sourceAr: "البورصة المصرية",
    sourceUrl: "https://www.egx.com.eg",
    highlight: true,
  },
];

const NATIONAL_PROFILE: IndicatorMeta[] = [
  {
    key: "gdp_nominal",
    nameAr: "الناتج المحلي الإجمالي (القيمة)",
    nameEn: "GDP (Nominal)",
    sourceEn: "World Bank",
    sourceAr: "البنك الدولي",
    sourceUrl: "https://data.worldbank.org/indicator/NY.GDP.MKTP.CD",
    isMonetary: true,
  },
  {
    key: "gdp_per_capita",
    nameAr: "نصيب الفرد من الناتج المحلي",
    nameEn: "GDP Per Capita",
    sourceEn: "World Bank",
    sourceAr: "البنك الدولي",
    sourceUrl: "https://data.worldbank.org/indicator/NY.GDP.PCAP.CD",
    isMonetary: true,
  },
  {
    key: "population",
    nameAr: "عدد السكان",
    nameEn: "Population",
    sourceEn: "World Bank",
    sourceAr: "البنك الدولي",
    sourceUrl: "https://data.worldbank.org/indicator/SP.POP.TOTL",
  },
  {
    key: "reserves",
    nameAr: "الاحتياطي الأجنبي",
    nameEn: "Foreign Reserves",
    sourceEn: "Central Bank of Egypt",
    sourceAr: "البنك المركزي المصري",
    sourceUrl: "https://www.cbe.org.eg/en/economic-research/statistics",
    isMonetary: true,
  },
  {
    key: "poverty_rate",
    nameAr: "معدل الفقر",
    nameEn: "Poverty Rate",
    sourceEn: "World Bank",
    sourceAr: "البنك الدولي",
    sourceUrl: "https://data.worldbank.org/indicator/SI.POV.DDAY",
  },
];

const DEBT_BURDEN: IndicatorMeta[] = [
  {
    key: "debt_service_exports",
    nameAr: "خدمة الدين / الصادرات",
    nameEn: "Debt Service as % of Exports",
    sourceEn: "World Bank",
    sourceAr: "البنك الدولي",
    sourceUrl: "https://data.worldbank.org/indicator/DT.TDS.DECT.EX.ZS",
  },
];

const IMF_FORECASTS: IndicatorMeta[] = [
  {
    key: "imf_gdp_growth_forecast",
    nameAr: "نمو الناتج المحلي (IMF)",
    nameEn: "GDP Growth Forecast",
    sourceEn: "IMF WEO",
    sourceAr: "صندوق النقد الدولي",
    sourceUrl: "https://www.imf.org/external/datamapper/profile/EGY",
  },
  {
    key: "imf_inflation_forecast",
    nameAr: "توقعات التضخم (IMF)",
    nameEn: "Inflation Forecast",
    sourceEn: "IMF WEO",
    sourceAr: "صندوق النقد الدولي",
    sourceUrl: "https://www.imf.org/external/datamapper/profile/EGY",
  },
  {
    key: "imf_current_account_forecast",
    nameAr: "الحساب الجاري (IMF)",
    nameEn: "Current Account Forecast (% GDP)",
    sourceEn: "IMF WEO",
    sourceAr: "صندوق النقد الدولي",
    sourceUrl: "https://www.imf.org/external/datamapper/profile/EGY",
  },
  {
    key: "imf_gov_debt_gdp",
    nameAr: "الدين الحكومي / الناتج (IMF)",
    nameEn: "Gov Debt / GDP Forecast",
    sourceEn: "IMF WEO",
    sourceAr: "صندوق النقد الدولي",
    sourceUrl: "https://www.imf.org/external/datamapper/profile/EGY",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatValue(value: number, unit: string): string {
  if (unit === "USD" || unit === "USD B") {
    return `$${value.toFixed(1)}B`;
  }
  if (unit === "%" || unit === "percent") {
    return `${value.toFixed(1)}%`;
  }
  if (unit === "EGP") {
    return `${value.toFixed(1)}`;
  }
  if (unit === "USD/yr" || unit === "USD/yr B") {
    return `$${value.toFixed(1)}B`;
  }
  if (unit === "people" || unit === "persons") {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
    return value.toFixed(0);
  }
  if (unit === "index") {
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  return `${value.toFixed(2)}`;
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data, trend }: { data: number[]; trend: "up" | "down" }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 140;
  const h = 50;
  const pad = 4;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * innerW;
    const y = pad + (1 - (v - min) / range) * innerH;
    return `${x},${y}`;
  });

  const polyline = points.join(" ");
  const color = trend === "up" ? "#3FC380" : "#E5484D";

  const firstX = pad;
  const lastX = pad + innerW;
  const area = `${firstX},${h} ${polyline} ${lastX},${h}`;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="overflow-visible"
    >
      <polygon points={area} fill={color} fillOpacity={0.12} />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {(() => {
        const last = points[points.length - 1].split(",");
        return <circle cx={last[0]} cy={last[1]} r={2.5} fill={color} />;
      })()}
    </svg>
  );
}

// ─── Indicator Card ───────────────────────────────────────────────────────────

interface IndicatorRecord {
  value: number;
  unit: string;
  date: string;
  year?: string;
  sourceUrl?: string;
  sourceNameEn?: string;
}

interface IndicatorCardProps {
  meta: IndicatorMeta;
  record: IndicatorRecord | null;
  timeline: number[];
  isAr: boolean;
  size?: "large" | "medium" | "small";
}

function IndicatorCard({
  meta,
  record,
  timeline,
  isAr,
  size = "medium",
}: IndicatorCardProps) {
  if (!record) {
    return (
      <Card
        className={`border-border/60 bg-card/60 backdrop-blur-sm ${
          meta.highlight ? "border-[#C9A84C]/30 bg-[#C9A84C]/5" : ""
        }`}
      >
        <CardContent
          className={`flex flex-col items-center justify-center text-center ${
            size === "large"
              ? "p-6 min-h-[180px]"
              : size === "small"
                ? "p-4 min-h-[120px]"
                : "p-5 min-h-[150px]"
          }`}
        >
          <Database
            size={16}
            className="text-muted-foreground/25 mb-2"
          />
          <p className="text-xs font-medium text-muted-foreground mb-0.5">
            {isAr ? meta.nameAr : meta.nameEn}
          </p>
          <p className="text-[0.625rem] text-muted-foreground/40">
            {isAr ? "لا توجد بيانات بعد" : "No data available yet"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const displayValue = formatValue(record.value, record.unit);
  const displayYear = record.year ?? record.date.slice(0, 4);

  const trend: "up" | "down" =
    timeline.length >= 2
      ? timeline[timeline.length - 1] >= timeline[timeline.length - 2]
        ? "up"
        : "down"
      : "up";

  const TrendIcon = trend === "up" ? TrendingUp : TrendingDown;
  const sourceUrl = record.sourceUrl ?? meta.sourceUrl;
  const sourceNameEn = record.sourceNameEn ?? meta.sourceEn;

  return (
    <Card
      className={`border-border/60 bg-card/60 backdrop-blur-sm hover:border-primary/30 transition-all ${
        meta.highlight ? "border-[#C9A84C]/50 bg-[#C9A84C]/5" : ""
      }`}
    >
      <CardContent className={size === "large" ? "p-6" : size === "small" ? "p-4" : "p-5"}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <p
              className={`text-muted-foreground font-medium truncate ${
                size === "small" ? "text-[0.65rem]" : "text-xs"
              }`}
            >
              {isAr ? meta.nameAr : meta.nameEn}
            </p>
            {meta.highlight && (
              <Badge
                variant="outline"
                className="text-[0.6rem] mt-1 border-[#C9A84C]/50 text-[#C9A84C]"
              >
                {isAr ? "مؤشر رئيسي" : "Key metric"}
              </Badge>
            )}
          </div>
          <Badge
            variant="secondary"
            className={`font-mono flex-shrink-0 ms-2 ${
              size === "small" ? "text-[0.6rem]" : "text-xs"
            } ${
              trend === "up"
                ? "bg-green-500/10 text-green-400 border-green-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}
          >
            <TrendIcon size={10} className="inline me-0.5" />
            {trend === "up" ? "+" : "-"}
          </Badge>
        </div>

        <p
          className={`font-mono font-black tracking-tight text-foreground mb-1 ${
            size === "large"
              ? "text-4xl"
              : size === "small"
                ? "text-2xl"
                : "text-3xl"
          }`}
          dir="ltr"
        >
          {displayValue}
        </p>
        <p className="text-[0.625rem] text-muted-foreground mb-3">
          {record.unit} · {displayYear}
        </p>

        {timeline.length >= 2 && size !== "small" && (
          <div className="mb-1">
            <Sparkline data={timeline} trend={trend} />
          </div>
        )}

        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.6rem] text-primary/50 hover:text-primary no-underline hover:underline mt-2 truncate block"
          >
            {isAr ? meta.sourceAr : sourceNameEn}
          </a>
        ) : (
          <p className="text-[0.6rem] text-muted-foreground/50 mt-2 truncate">
            {isAr ? meta.sourceAr : sourceNameEn}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Indicator Card with Timeline ─────────────────────────────────────────────

interface IndicatorCardWithTimelineProps {
  meta: IndicatorMeta;
  record: IndicatorRecord | null;
  isAr: boolean;
  size?: "large" | "medium" | "small";
}

function IndicatorCardWithTimeline({
  meta,
  record,
  isAr,
  size,
}: IndicatorCardWithTimelineProps) {
  const timelineRecords = useQuery(api.economy.getIndicatorTimeline, {
    indicator: meta.key,
  });

  const timeline: number[] = timelineRecords
    ? timelineRecords.map((r) => r.value)
    : [];

  return (
    <IndicatorCard
      meta={meta}
      record={record}
      timeline={timeline}
      isAr={isAr}
      size={size}
    />
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  en,
  ar,
  isAr,
}: {
  en: string;
  ar: string;
  isAr: boolean;
}) {
  return (
    <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 mt-8">
      {isAr ? ar : en}
    </h2>
  );
}

// ─── AI Narrative Section ─────────────────────────────────────────────────────

function AiNarrativeSection({ isAr }: { isAr: boolean }) {
  const reports = useQuery(api.lineage.listResearchReports, {
    category: "economy",
  });

  const isLoading = reports === undefined;
  const latestReport = reports?.[0] ?? null;

  if (!isLoading && !latestReport) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <BrainCircuit size={14} className="text-primary/60" />
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {isAr ? "تحليل الذكاء الاصطناعي" : "AI Economic Analysis"}
        </h2>
        {latestReport && (
          <span className="ms-auto text-[0.6rem] text-muted-foreground/50 font-mono">
            {new Date(latestReport.generatedAt).toLocaleDateString(
              isAr ? "ar-EG" : "en-GB",
              { day: "2-digit", month: "short", year: "numeric" }
            )}
          </span>
        )}
      </div>

      <Skeleton name="economy-narrative" loading={isLoading}>
        {latestReport && (
          <Card className="border-border/60 bg-card/40 backdrop-blur-sm">
            <CardContent className="p-6">
              {/* Title */}
              <p className="text-sm font-semibold text-foreground mb-2">
                {isAr ? latestReport.titleAr : latestReport.titleEn}
              </p>

              {/* Summary */}
              <p className="text-sm text-muted-foreground leading-relaxed mb-5 border-s-2 border-primary/30 ps-3">
                {isAr ? latestReport.summaryAr : latestReport.summaryEn}
              </p>

              {/* Content — split by line breaks into insight paragraphs */}
              <div className="space-y-3">
                {(isAr ? latestReport.contentAr : latestReport.contentEn)
                  .split("\n")
                  .filter((line) => line.trim().length > 0)
                  .slice(0, 5)
                  .map((line, idx) => (
                    <div
                      key={idx}
                      className="flex gap-3 text-[0.8rem] text-muted-foreground leading-relaxed"
                    >
                      <span className="text-primary/40 font-mono text-xs mt-0.5 flex-shrink-0 tabular-nums">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <p>{line.trim()}</p>
                    </div>
                  ))}
              </div>

              {/* Footer */}
              <div className="mt-5 pt-4 border-t border-border/50 flex items-center gap-3 flex-wrap">
                <Badge variant="secondary" className="text-[0.6rem] font-mono">
                  {latestReport.agentModel}
                </Badge>
                <span className="text-[0.6rem] text-muted-foreground/50">
                  {isAr ? "المصادر المفحوصة:" : "Sources checked:"}{" "}
                  {latestReport.sourcesChecked.length}
                </span>
                {latestReport.discrepanciesFound > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[0.6rem] border-amber-500/30 text-amber-400"
                  >
                    {latestReport.discrepanciesFound}{" "}
                    {isAr ? "تناقضات" : "discrepancies"}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </Skeleton>
    </section>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EconomyPage() {
  const { lang, dir } = useLanguage();
  const isAr = lang === "ar";

  const allLatest = useQuery(api.economy.getAllLatest);
  const isLoading = allLatest === undefined;

  // Helper: get record from the map (handles new keys not yet in backend)
  function getRecord(key: string): IndicatorRecord | null {
    if (!allLatest) return null;
    return (allLatest as Record<string, IndicatorRecord | null>)[key] ?? null;
  }

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">
              {isAr ? "المؤشرات الاقتصادية" : "Economic Indicators"}
            </p>
            <h1 className="text-3xl md:text-4xl font-black mb-2">
              {isAr ? "المسار الاقتصادي" : "Economic Tracker"}
            </h1>
            <p className="text-muted-foreground text-sm max-w-lg">
              {isAr
                ? "مؤشرات اقتصادية رئيسية لمصر — من البنك الدولي والبنك المركزي وجهاز التعبئة والإحصاء"
                : "Key Egyptian economic indicators — World Bank, CBE, CAPMAS"}
            </p>
          </div>

          {/* Currency toggle removed -- use the global one in the header */}
        </div>

        {/* ── AI Narrative ───────────────────────────────────────────────── */}
        <AiNarrativeSection isAr={isAr} />

        {/* ── Key Metrics ────────────────────────────────────────────────── */}
        <SectionHeader en="Key Metrics" ar="المؤشرات الرئيسية" isAr={isAr} />
        <Skeleton name="economy-key-metrics" loading={isLoading}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
            {KEY_METRICS.map((meta) => (
              <IndicatorCardWithTimeline
                key={meta.key}
                meta={meta}
                record={getRecord(meta.key)}
                isAr={isAr}
                size="large"
              />
            ))}
          </div>
        </Skeleton>

        {/* ── Money Flows ────────────────────────────────────────────────── */}
        <SectionHeader en="Money Flows" ar="تدفقات المال" isAr={isAr} />
        <Skeleton name="economy-money-flows" loading={isLoading}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-2">
            {MONEY_FLOWS.map((meta) => (
              <IndicatorCardWithTimeline
                key={meta.key}
                meta={meta}
                record={getRecord(meta.key)}
                isAr={isAr}
                size="medium"
              />
            ))}
          </div>
        </Skeleton>

        {/* ── Markets ────────────────────────────────────────────────────── */}
        <SectionHeader en="Markets" ar="الأسواق المالية" isAr={isAr} />
        <Skeleton name="economy-markets" loading={isLoading}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
            {MARKETS.map((meta) => (
              <IndicatorCardWithTimeline
                key={meta.key}
                meta={meta}
                record={getRecord(meta.key)}
                isAr={isAr}
                size="large"
              />
            ))}
          </div>
        </Skeleton>

        {/* ── National Profile ────────────────────────────────────────────── */}
        <SectionHeader en="National Profile" ar="الملف الوطني" isAr={isAr} />
        <Skeleton name="economy-national-profile" loading={isLoading}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-2">
            {NATIONAL_PROFILE.map((meta) => (
              <IndicatorCardWithTimeline
                key={meta.key}
                meta={meta}
                record={getRecord(meta.key)}
                isAr={isAr}
                size="small"
              />
            ))}
          </div>
        </Skeleton>

        {/* ── Debt Burden ─────────────────────────────────────────────────── */}
        <SectionHeader en="Debt Burden" ar="عبء الدين" isAr={isAr} />
        <Skeleton name="economy-debt-burden" loading={isLoading}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {DEBT_BURDEN.map((meta) => (
              <IndicatorCardWithTimeline
                key={meta.key}
                meta={meta}
                record={getRecord(meta.key)}
                isAr={isAr}
                size="medium"
              />
            ))}

            {/* Link card to debt page */}
            <Link href="/debt" className="no-underline">
              <Card className="border-border/40 bg-card/30 hover:border-primary/30 hover:bg-card/50 transition-all h-full">
                <CardContent className="p-5 flex flex-col justify-between h-full min-h-[150px]">
                  <p className="text-xs text-muted-foreground font-medium">
                    {isAr
                      ? "استكشاف تفاصيل الدين الوطني"
                      : "Explore full debt breakdown"}
                  </p>
                  <div className="flex items-center gap-1.5 text-primary/70 text-sm font-semibold mt-4">
                    {isAr ? "صفحة الدين" : "Debt Page"}
                    <ArrowRight size={14} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </Skeleton>

        {/* ── IMF Forecasts ────────────────────────────────────────────────── */}
        <SectionHeader en="IMF Forecasts (through 2030)" ar="توقعات صندوق النقد الدولي (حتى 2030)" isAr={isAr} />
        <Skeleton name="economy-imf" loading={isLoading}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
            {IMF_FORECASTS.map((meta) => (
              <IndicatorCardWithTimeline
                key={meta.key}
                meta={meta}
                record={getRecord(meta.key)}
                isAr={isAr}
              />
            ))}
          </div>
        </Skeleton>

        {/* ── Sources footer ──────────────────────────────────────────────── */}
        <div className="mt-8 pt-6 border-t border-border flex flex-wrap gap-4 text-[0.625rem] text-muted-foreground">
          {[
            {
              label: "World Bank",
              url: "https://data.worldbank.org/country/egypt-arab-rep",
            },
            {
              label: "Central Bank of Egypt",
              url: "https://www.cbe.org.eg/en/economic-research/statistics",
            },
            { label: "CAPMAS", url: "https://www.capmas.gov.eg" },
            {
              label: "Suez Canal Authority",
              url: "https://www.suezcanal.gov.eg",
            },
            {
              label: "Egyptian Exchange",
              url: "https://www.egx.com.eg",
            },
            {
              label: "IMF DataMapper",
              url: "https://www.imf.org/external/datamapper/profile/EGY",
            },
          ].map((s) => (
            <a
              key={s.label}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary/60 hover:text-primary no-underline hover:underline transition-colors"
            >
              <ExternalLink size={9} /> {s.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
