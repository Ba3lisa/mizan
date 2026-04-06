"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Skeleton } from "boneyard-js/react";
import { useLanguage } from "@/components/providers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, TrendingUp, TrendingDown, Database } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Indicator display config for known DB keys.
 * Maps the Convex indicator key to bilingual metadata.
 */
interface IndicatorMeta {
  key: string;
  nameAr: string;
  nameEn: string;
  sourceEn: string;
  sourceAr: string;
  sourceUrl: string;
  highlight?: boolean;
}

const INDICATOR_META: IndicatorMeta[] = [
  {
    key: "gdp_growth",
    nameAr: "الناتج المحلي الإجمالي",
    nameEn: "GDP",
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
  {
    key: "reserves",
    nameAr: "الاحتياطي الأجنبي",
    nameEn: "Foreign Reserves",
    sourceEn: "Central Bank of Egypt",
    sourceAr: "البنك المركزي المصري",
    sourceUrl: "https://www.cbe.org.eg/en/economic-research/statistics",
  },
  {
    key: "suez_revenue",
    nameAr: "إيرادات قناة السويس",
    nameEn: "Suez Canal Revenue",
    sourceEn: "Suez Canal Authority",
    sourceAr: "هيئة قناة السويس",
    sourceUrl: "https://www.suezcanal.gov.eg",
  },
];

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
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
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

interface IndicatorCardProps {
  meta: IndicatorMeta;
  record: {
    value: number;
    unit: string;
    date: string;
    year?: string;
    sourceUrl?: string;
    sourceNameEn?: string;
  } | null;
  timeline: number[];
  isAr: boolean;
}

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
  return `${value.toFixed(2)}`;
}

function IndicatorCard({ meta, record, timeline, isAr }: IndicatorCardProps) {
  if (!record) {
    return (
      <Card
        className={`border-border/60 bg-card/60 backdrop-blur-sm ${
          meta.highlight ? "border-[#C9A84C]/50 bg-[#C9A84C]/5" : ""
        }`}
      >
        <CardContent className="p-5 flex flex-col items-center justify-center min-h-[160px] text-center">
          <Database size={18} className="text-muted-foreground/30 mb-2" />
          <p className="text-xs font-medium text-muted-foreground mb-0.5">
            {isAr ? meta.nameAr : meta.nameEn}
          </p>
          <p className="text-[0.625rem] text-muted-foreground/50">
            {isAr ? "لا توجد بيانات بعد" : "No data available yet"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const displayValue = formatValue(record.value, record.unit);
  const displayYear = record.year ?? record.date.slice(0, 4);

  // Determine trend from timeline direction
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
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium truncate">
              {isAr ? meta.nameAr : meta.nameEn}
            </p>
            {meta.highlight && (
              <Badge
                variant="outline"
                className="text-[0.6rem] mt-1 border-[#C9A84C]/50 text-[#C9A84C]"
              >
                {isAr ? "أكبر تحول" : "Biggest shift"}
              </Badge>
            )}
          </div>
          <Badge
            variant="secondary"
            className={`text-xs font-mono flex-shrink-0 ms-2 ${
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
          className="font-mono text-3xl font-black tracking-tight text-foreground mb-1"
          dir="ltr"
        >
          {displayValue}
        </p>
        <p className="text-[0.625rem] text-muted-foreground mb-4">
          {record.unit} · {displayYear}
        </p>

        {/* Sparkline */}
        {timeline.length >= 2 && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <Sparkline data={timeline} trend={trend} />
            </div>
          </div>
        )}

        {/* Source */}
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


// ─── Timeline fetcher per indicator ──────────────────────────────────────────

function IndicatorCardWithTimeline({
  meta,
  record,
  isAr,
}: Omit<IndicatorCardProps, "timeline">) {
  const timelineRecords = useQuery(api.economy.getIndicatorTimeline, {
    indicator: meta.key,
  });

  const timeline: number[] = timelineRecords
    ? timelineRecords.map((r) => r.value)
    : [];

  return (
    <IndicatorCard meta={meta} record={record} timeline={timeline} isAr={isAr} />
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EconomyPage() {
  const { lang, dir } = useLanguage();
  const isAr = lang === "ar";

  const allLatest = useQuery(api.economy.getAllLatest);

  const isLoading = allLatest === undefined;

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page">
        {/* Header */}
        <div className="mb-10">
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

        {/* Grid */}
        <Skeleton name="economy-indicators" loading={isLoading}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!isLoading &&
              INDICATOR_META.map((meta) => {
                const record = allLatest[meta.key] ?? null;
                return (
                  <IndicatorCardWithTimeline
                    key={meta.key}
                    meta={meta}
                    record={record}
                    isAr={isAr}
                  />
                );
              })}
          </div>
        </Skeleton>

        {/* Sources footer */}
        <div className="mt-10 pt-6 border-t border-border flex flex-wrap gap-4 text-[0.625rem] text-muted-foreground">
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
