"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Skeleton } from "boneyard-js/react";
import { useLanguage } from "@/components/providers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataSourceFooter } from "@/components/data-source";
import {
  TrendingUp,
  TrendingDown,
  Database,
  ArrowRight,
  BrainCircuit,
} from "lucide-react";
import { SanadBadge } from "@/components/sanad-badge";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  LineChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

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
  isMonetary?: boolean;
}

interface IndicatorRecord {
  value: number;
  unit: string;
  date: string;
  year?: string;
  sourceUrl?: string;
  sourceNameEn?: string;
  sanadLevel?: number;
}

interface TimelineRecord {
  value: number;
  unit: string;
  date: string;
  year?: string;
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

// ─── Chart Color Palette ──────────────────────────────────────────────────────

const COLORS = {
  gold: "#C9A84C",
  green: "#2EC4B6",
  red: "#E5484D",
  blue: "#6C8EEF",
  purple: "#9B72CF",
  orange: "#E76F51",
  teal: "#2EC4B6",
} as const;

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

function getYearLabel(record: TimelineRecord): string {
  return record.year ?? record.date.slice(0, 4);
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
  unit?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  isAr: boolean;
}

function CustomTooltip({ active, payload, label, isAr }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl text-foreground text-xs"
      dir="ltr"
    >
      <p className="font-mono font-bold text-muted-foreground mb-1.5">{label}</p>
      {payload.map((item, i) => (
        <div key={i} className="flex items-center gap-2 mb-0.5">
          <span
            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: item.color }}
          />
          <span className="text-muted-foreground">{isAr ? item.name : item.name}:</span>
          <span className="font-mono font-semibold" style={{ color: item.color }}>
            {typeof item.value === "number" ? item.value.toFixed(2) : item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Mini Sparkline (inline SVG, used in hero cards) ─────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 32;
  const pad = 2;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * innerW;
    const y = pad + (1 - (v - min) / range) * innerH;
    return `${x},${y}`;
  });
  const polyline = points.join(" ");
  const area = `${pad},${h} ${polyline} ${pad + innerW},${h}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polygon points={area} fill={color} fillOpacity={0.15} />
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
        return <circle cx={last[0]} cy={last[1]} r={2} fill={color} />;
      })()}
    </svg>
  );
}

// ─── Hero Metric Card ─────────────────────────────────────────────────────────

interface HeroCardProps {
  meta: IndicatorMeta;
  record: IndicatorRecord | null;
  isAr: boolean;
  index: number;
}

function HeroCard({ meta, record, isAr, index }: HeroCardProps) {
  const timelineRecords = useQuery(api.economy.getIndicatorTimeline, {
    indicator: meta.key,
  });

  const values: number[] = timelineRecords ? timelineRecords.map((r) => r.value) : [];
  const isLoading = timelineRecords === undefined;

  // Find value from previous year (not just previous data point)
  const currentYear = record?.year ?? new Date().getFullYear().toString();
  const prevYearStr = String(parseInt(currentYear) - 1);
  const prevYearRecord = timelineRecords?.find((r) => r.year === prevYearStr);
  const latestValue = values.length > 0 ? values[values.length - 1] : null;
  const prevYearValue = prevYearRecord?.value ?? (values.length >= 2 ? values[values.length - 2] : null);

  const trend: "up" | "down" =
    latestValue !== null && prevYearValue !== null
      ? latestValue >= prevYearValue ? "up" : "down"
      : "up";

  const yoyChange =
    latestValue !== null && prevYearValue !== null
      ? latestValue - prevYearValue
      : null;

  const TrendIcon = trend === "up" ? TrendingUp : TrendingDown;
  const trendColor = meta.key === "inflation" || meta.key === "exchange_rate"
    ? trend === "up" ? COLORS.red : COLORS.green
    : trend === "up" ? COLORS.green : COLORS.red;

  const sparkColor = meta.highlight ? COLORS.gold : trendColor;
  const displayYear = record?.year ?? record?.date?.slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5, ease: "easeOut" }}
    >
      <Card
        className={`relative overflow-hidden border transition-all duration-300 hover:shadow-lg hover:shadow-black/20 ${
          meta.highlight
            ? "border-[#C9A84C]/40 bg-gradient-to-br from-[#C9A84C]/8 to-[#C9A84C]/3 hover:border-[#C9A84C]/60"
            : "border-border/60 bg-card/60 hover:border-primary/30"
        }`}
      >
        {meta.highlight && (
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/60 to-transparent" />
        )}
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground leading-tight">
              {isAr ? meta.nameAr : meta.nameEn}
            </p>
            {meta.highlight && (
              <span className="text-[0.55rem] font-mono px-1.5 py-0.5 rounded border border-[#C9A84C]/40 text-[#C9A84C] bg-[#C9A84C]/8 uppercase tracking-wider">
                {isAr ? "رئيسي" : "LIVE"}
              </span>
            )}
          </div>

          {isLoading || !record ? (
            <div className="h-10 w-24 bg-muted/20 animate-pulse rounded mb-2" />
          ) : (
            <>
              <div className="flex items-end gap-2 mb-1" dir="ltr">
                <span
                  className="text-3xl font-black tracking-tight font-mono"
                  style={{ color: meta.highlight ? COLORS.gold : "hsl(var(--foreground))" }}
                >
                  {formatValue(record.value, record.unit)}
                </span>
                {record.sanadLevel && (
                  <SanadBadge
                    sanadLevel={record.sanadLevel}
                    sourceUrl={record.sourceUrl}
                    showLabel
                    className="mb-1"
                  />
                )}
              </div>
              <div className="flex items-center gap-2 mb-3" dir="ltr">
                <TrendIcon size={11} style={{ color: trendColor }} />
                {yoyChange !== null && (
                  <span
                    className="text-[0.65rem] font-mono font-semibold"
                    style={{ color: trendColor }}
                  >
                    {yoyChange > 0 ? "+" : ""}{yoyChange.toFixed(1)}
                  </span>
                )}
                <span className="text-[0.6rem] text-muted-foreground/60">
                  {isAr ? "من السنة الماضية" : "vs last year"} · {displayYear}
                </span>
              </div>
              {values.length >= 2 && (
                <div dir="ltr">
                  <Sparkline data={values.slice(-8)} color={sparkColor} />
                </div>
              )}
            </>
          )}

          <a
            href={meta.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 text-[0.55rem] uppercase tracking-wider text-muted-foreground/40 hover:text-primary/60 no-underline transition-colors block"
          >
            {isAr ? meta.sourceAr : meta.sourceEn}
          </a>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── GDP & Growth Chart ───────────────────────────────────────────────────────

function GdpGrowthChart({ isAr }: { isAr: boolean }) {
  const gdpNominal = useQuery(api.economy.getIndicatorTimeline, { indicator: "gdp_nominal" });
  const gdpGrowth = useQuery(api.economy.getIndicatorTimeline, { indicator: "gdp_growth" });

  const isLoading = gdpNominal === undefined || gdpGrowth === undefined;

  const data = (() => {
    if (!gdpNominal || !gdpGrowth) return [];
    const byYear: Record<string, { year: string; gdp?: number; growth?: number }> = {};
    for (const r of gdpNominal) {
      const yr = getYearLabel(r);
      byYear[yr] = { ...byYear[yr], year: yr, gdp: r.value };
    }
    for (const r of gdpGrowth) {
      const yr = getYearLabel(r);
      byYear[yr] = { ...byYear[yr], year: yr, growth: r.value };
    }
    return Object.values(byYear).sort((a, b) => a.year.localeCompare(b.year));
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="mb-8"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="h-4 w-1 rounded-full bg-[#C9A84C]" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">
          {isAr ? "الناتج المحلي والنمو" : "GDP & Growth"}
        </h3>
        <div className="flex items-center gap-3 ms-auto">
          <span className="flex items-center gap-1.5 text-[0.6rem] text-muted-foreground">
            <span className="inline-block w-3 h-0.5 rounded bg-[#C9A84C]" />
            {isAr ? "الناتج (مليار $)" : "GDP (B USD)"}
          </span>
          <span className="flex items-center gap-1.5 text-[0.6rem] text-muted-foreground">
            <span className="inline-block w-3 h-0.5 rounded bg-[#2EC4B6]" />
            {isAr ? "نسبة النمو %" : "Growth %"}
          </span>
        </div>
      </div>
      <Skeleton name="chart-gdp" loading={isLoading}>
        {data.length === 0 ? (
          <EmptyChart isAr={isAr} />
        ) : (
          <div className="h-[280px] md:h-[300px]" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gdpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.gold} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.gold} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.green} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={COLORS.green} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  strokeOpacity={0.4}
                  vertical={false}
                />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontFamily: "monospace" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="gdp"
                  orientation="left"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontFamily: "monospace" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${v.toFixed(0)}B`}
                  width={52}
                />
                <YAxis
                  yAxisId="growth"
                  orientation="right"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontFamily: "monospace" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                  width={40}
                />
                <Tooltip
                  content={<CustomTooltip isAr={isAr} />}
                  cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                />
                <Area
                  yAxisId="gdp"
                  type="monotone"
                  dataKey="gdp"
                  stroke={COLORS.gold}
                  strokeWidth={2}
                  fill="url(#gdpGrad)"
                  name={isAr ? "الناتج المحلي" : "GDP (B USD)"}
                  animationDuration={1500}
                  dot={false}
                  activeDot={{ r: 4, stroke: COLORS.gold, strokeWidth: 2, fill: "hsl(var(--background))" }}
                />
                <Area
                  yAxisId="growth"
                  type="monotone"
                  dataKey="growth"
                  stroke={COLORS.green}
                  strokeWidth={2}
                  fill="url(#growthGrad)"
                  name={isAr ? "نسبة النمو %" : "Growth %"}
                  animationDuration={1500}
                  dot={false}
                  activeDot={{ r: 4, stroke: COLORS.green, strokeWidth: 2, fill: "hsl(var(--background))" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Skeleton>
    </motion.div>
  );
}

// ─── Inflation & Exchange Rate Chart ─────────────────────────────────────────

function InflationExchangeChart({ isAr }: { isAr: boolean }) {
  const inflation = useQuery(api.economy.getIndicatorTimeline, { indicator: "inflation" });
  const exchange = useQuery(api.economy.getIndicatorTimeline, { indicator: "exchange_rate" });

  const isLoading = inflation === undefined || exchange === undefined;

  const data = (() => {
    if (!inflation || !exchange) return [];
    const byYear: Record<string, { year: string; inflation?: number; exchange?: number }> = {};
    for (const r of inflation) {
      const yr = getYearLabel(r);
      byYear[yr] = { ...byYear[yr], year: yr, inflation: r.value };
    }
    for (const r of exchange) {
      const yr = getYearLabel(r);
      byYear[yr] = { ...byYear[yr], year: yr, exchange: r.value };
    }
    return Object.values(byYear).sort((a, b) => a.year.localeCompare(b.year));
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.35 }}
      className="mb-8"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="h-4 w-1 rounded-full bg-[#E5484D]" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">
          {isAr ? "التضخم وسعر الصرف" : "Inflation & Exchange Rate"}
        </h3>
        <div className="flex items-center gap-3 ms-auto">
          <span className="flex items-center gap-1.5 text-[0.6rem] text-muted-foreground">
            <span className="inline-block w-3 h-0.5 rounded bg-[#E5484D]" />
            {isAr ? "التضخم %" : "Inflation %"}
          </span>
          <span className="flex items-center gap-1.5 text-[0.6rem] text-muted-foreground">
            <span className="inline-block w-3 h-0.5 rounded bg-[#6C8EEF]" />
            {isAr ? "جنيه/دولار" : "EGP/USD"}
          </span>
        </div>
      </div>
      <Skeleton name="chart-inflation" loading={isLoading}>
        {data.length === 0 ? (
          <EmptyChart isAr={isAr} />
        ) : (
          <div className="h-[280px] md:h-[300px]" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  strokeOpacity={0.4}
                  vertical={false}
                />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontFamily: "monospace" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="inf"
                  orientation="left"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontFamily: "monospace" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                  width={36}
                />
                <YAxis
                  yAxisId="ex"
                  orientation="right"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontFamily: "monospace" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v.toFixed(0)}`}
                  width={40}
                />
                <Tooltip
                  content={<CustomTooltip isAr={isAr} />}
                  cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                />
                <Line
                  yAxisId="inf"
                  type="monotone"
                  dataKey="inflation"
                  stroke={COLORS.red}
                  strokeWidth={2}
                  name={isAr ? "التضخم %" : "Inflation %"}
                  animationDuration={1500}
                  dot={false}
                  activeDot={{ r: 4, stroke: COLORS.red, strokeWidth: 2, fill: "hsl(var(--background))" }}
                />
                <Line
                  yAxisId="ex"
                  type="monotone"
                  dataKey="exchange"
                  stroke={COLORS.blue}
                  strokeWidth={2}
                  name={isAr ? "سعر الصرف" : "Exchange Rate"}
                  animationDuration={1500}
                  dot={false}
                  activeDot={{ r: 4, stroke: COLORS.blue, strokeWidth: 2, fill: "hsl(var(--background))" }}
                  strokeDasharray="4 2"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Skeleton>
    </motion.div>
  );
}

// ─── Money Flows Stacked Chart ────────────────────────────────────────────────

function MoneyFlowsChart({ isAr }: { isAr: boolean }) {
  const remittances = useQuery(api.economy.getIndicatorTimeline, { indicator: "remittances" });
  const fdi = useQuery(api.economy.getIndicatorTimeline, { indicator: "fdi_inflows" });
  const tourism = useQuery(api.economy.getIndicatorTimeline, { indicator: "tourism_receipts" });
  const suez = useQuery(api.economy.getIndicatorTimeline, { indicator: "suez_revenue" });

  const isLoading =
    remittances === undefined || fdi === undefined || tourism === undefined || suez === undefined;

  const data = (() => {
    if (!remittances || !fdi || !tourism || !suez) return [];
    const byYear: Record<
      string,
      { year: string; remittances?: number; fdi?: number; tourism?: number; suez?: number }
    > = {};
    for (const r of remittances) {
      const yr = getYearLabel(r);
      byYear[yr] = { ...byYear[yr], year: yr, remittances: r.value };
    }
    for (const r of fdi) {
      const yr = getYearLabel(r);
      byYear[yr] = { ...byYear[yr], year: yr, fdi: r.value };
    }
    for (const r of tourism) {
      const yr = getYearLabel(r);
      byYear[yr] = { ...byYear[yr], year: yr, tourism: r.value };
    }
    for (const r of suez) {
      const yr = getYearLabel(r);
      byYear[yr] = { ...byYear[yr], year: yr, suez: r.value };
    }
    return Object.values(byYear).sort((a, b) => a.year.localeCompare(b.year));
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
      className="mb-8"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="h-4 w-1 rounded-full bg-[#9B72CF]" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">
          {isAr ? "تدفقات الدخل الوطني" : "Income Flows"}
        </h3>
        <div className="flex flex-wrap items-center gap-3 ms-auto">
          {[
            { color: COLORS.teal, label: isAr ? "تحويلات" : "Remittances" },
            { color: COLORS.purple, label: isAr ? "استثمار أجنبي" : "FDI" },
            { color: COLORS.orange, label: isAr ? "سياحة" : "Tourism" },
            { color: COLORS.gold, label: isAr ? "السويس" : "Suez" },
          ].map((item) => (
            <span key={item.label} className="flex items-center gap-1.5 text-[0.6rem] text-muted-foreground">
              <span className="inline-block w-3 h-0.5 rounded" style={{ background: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
      <Skeleton name="chart-money-flows" loading={isLoading}>
        {data.length === 0 ? (
          <EmptyChart isAr={isAr} />
        ) : (
          <div className="h-[280px] md:h-[300px]" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  {[
                    { id: "remGrad", color: COLORS.teal },
                    { id: "fdiGrad", color: COLORS.purple },
                    { id: "tourGrad", color: COLORS.orange },
                    { id: "suezGrad", color: COLORS.gold },
                  ].map(({ id, color }) => (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  strokeOpacity={0.4}
                  vertical={false}
                />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontFamily: "monospace" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontFamily: "monospace" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${v.toFixed(0)}B`}
                  width={46}
                />
                <Tooltip
                  content={<CustomTooltip isAr={isAr} />}
                  cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="remittances"
                  stroke={COLORS.teal}
                  strokeWidth={1.5}
                  fill="url(#remGrad)"
                  stackId="flows"
                  name={isAr ? "تحويلات" : "Remittances"}
                  animationDuration={1500}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="fdi"
                  stroke={COLORS.purple}
                  strokeWidth={1.5}
                  fill="url(#fdiGrad)"
                  stackId="flows"
                  name={isAr ? "استثمار أجنبي" : "FDI"}
                  animationDuration={1500}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="tourism"
                  stroke={COLORS.orange}
                  strokeWidth={1.5}
                  fill="url(#tourGrad)"
                  stackId="flows"
                  name={isAr ? "سياحة" : "Tourism"}
                  animationDuration={1500}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="suez"
                  stroke={COLORS.gold}
                  strokeWidth={1.5}
                  fill="url(#suezGrad)"
                  stackId="flows"
                  name={isAr ? "السويس" : "Suez"}
                  animationDuration={1500}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Skeleton>
    </motion.div>
  );
}

// ─── Empty Chart Placeholder ──────────────────────────────────────────────────

function EmptyChart({ isAr }: { isAr: boolean }) {
  return (
    <div className="h-[280px] flex flex-col items-center justify-center gap-2 border border-dashed border-border/40 rounded-xl">
      <Database size={18} className="text-muted-foreground/25" />
      <p className="text-xs text-muted-foreground/40">
        {isAr ? "لا توجد بيانات بعد" : "No data available yet"}
      </p>
    </div>
  );
}

// ─── Money Flow Card (with mini recharts area) ────────────────────────────────

interface MoneyFlowCardProps {
  meta: IndicatorMeta;
  record: IndicatorRecord | null;
  isAr: boolean;
  accentColor: string;
}

function MoneyFlowCard({ meta, record, isAr, accentColor }: MoneyFlowCardProps) {
  const timelineRecords = useQuery(api.economy.getIndicatorTimeline, {
    indicator: meta.key,
  });
  const values: number[] = timelineRecords ? timelineRecords.map((r) => r.value) : [];
  const chartData = values.slice(-6).map((v, i) => ({ i, v }));

  const trend: "up" | "down" =
    values.length >= 2
      ? values[values.length - 1] >= values[values.length - 2]
        ? "up"
        : "down"
      : "up";
  const yoyChange =
    values.length >= 2 ? values[values.length - 1] - values[values.length - 2] : null;

  return (
    <Card className="border-border/60 bg-card/50 hover:border-border/80 transition-all duration-200 overflow-hidden">
      <CardContent className="p-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground mb-2 truncate">
          {isAr ? meta.nameAr : meta.nameEn}
        </p>

        {!record ? (
          <div className="flex flex-col items-start gap-1 mt-2 mb-3">
            <Database size={14} className="text-muted-foreground/25" />
            <p className="text-[0.6rem] text-muted-foreground/40">
              {isAr ? "لا توجد بيانات" : "No data"}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between mb-2" dir="ltr">
              <span className="text-xl font-black font-mono text-foreground flex items-center gap-1.5">
                {formatValue(record.value, record.unit)}
                {record.sanadLevel && (
                  <SanadBadge sanadLevel={record.sanadLevel} sourceUrl={record.sourceUrl} />
                )}
              </span>
              {yoyChange !== null && (
                <span
                  className="text-[0.65rem] font-mono font-bold px-1.5 py-0.5 rounded"
                  style={{
                    color: trend === "up" ? COLORS.green : COLORS.red,
                    background: trend === "up" ? "rgba(46,196,182,0.1)" : "rgba(229,72,77,0.1)",
                  }}
                >
                  {trend === "up" ? "+" : ""}{yoyChange.toFixed(1)}
                </span>
              )}
            </div>

            {chartData.length >= 2 && (
              <div className="h-[52px] -mx-1 mb-1" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                    <defs>
                      <linearGradient id={`mfg-${meta.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={accentColor} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={accentColor} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke={accentColor}
                      strokeWidth={1.5}
                      fill={`url(#mfg-${meta.key})`}
                      dot={false}
                      animationDuration={1200}
                      isAnimationActive
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        <a
          href={meta.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[0.55rem] uppercase tracking-wider text-muted-foreground/35 hover:text-primary/50 transition-colors no-underline block mt-1"
        >
          {isAr ? meta.sourceAr : meta.sourceEn}
        </a>
      </CardContent>
    </Card>
  );
}

// ─── IMF Forecast Bar Chart ───────────────────────────────────────────────────

function ImfForecastChart({ meta, record, isAr }: { meta: IndicatorMeta; record: IndicatorRecord | null; isAr: boolean }) {
  const timelineRecords = useQuery(api.economy.getIndicatorTimeline, {
    indicator: meta.key,
  });

  const chartData = (() => {
    if (!timelineRecords) return [];
    return timelineRecords.map((r) => ({
      year: getYearLabel(r),
      value: r.value,
      isForecast: parseInt(getYearLabel(r)) >= 2025,
    }));
  })();

  const maxVal = chartData.length > 0 ? Math.max(...chartData.map((d) => Math.abs(d.value))) : 10;

  return (
    <Card className="border-border/60 bg-card/50 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground leading-snug">
            {isAr ? meta.nameAr : meta.nameEn}
          </p>
          {record && (
            <span className="text-xs font-mono font-black text-foreground ms-2 flex-shrink-0">
              {formatValue(record.value, record.unit)}
            </span>
          )}
        </div>

        <div className="space-y-1.5" dir="ltr">
          {chartData.slice(-8).map((d) => {
            const pct = maxVal > 0 ? (Math.abs(d.value) / maxVal) * 100 : 0;
            const barColor = d.isForecast ? COLORS.blue : COLORS.gold;
            return (
              <div key={d.year} className="flex items-center gap-2">
                <span className="text-[0.6rem] font-mono text-muted-foreground/60 w-8 flex-shrink-0">
                  {d.year}
                </span>
                <div className="flex-1 h-4 bg-muted/15 rounded-sm overflow-hidden relative">
                  <div
                    className="h-full rounded-sm transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: barColor,
                      opacity: d.isForecast ? 0.55 : 0.85,
                    }}
                  />
                </div>
                <span
                  className="text-[0.6rem] font-mono w-10 text-right flex-shrink-0"
                  style={{ color: barColor }}
                >
                  {d.value.toFixed(1)}%
                </span>
                {d.isForecast && (
                  <span className="text-[0.5rem] text-muted-foreground/40 flex-shrink-0 font-mono">
                    {isAr ? "توقع" : "fcst"}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <a
          href={meta.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 text-[0.55rem] uppercase tracking-wider text-muted-foreground/35 hover:text-primary/50 transition-colors no-underline block"
        >
          {isAr ? meta.sourceAr : meta.sourceEn}
        </a>
      </CardContent>
    </Card>
  );
}

// ─── National Profile Stat ────────────────────────────────────────────────────

function NationalStat({
  meta,
  record,
  isAr,
}: {
  meta: IndicatorMeta;
  record: IndicatorRecord | null;
  isAr: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-xl border border-border/40 bg-card/30 hover:border-border/60 transition-all">
      <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground/70 truncate">
        {isAr ? meta.nameAr : meta.nameEn}
      </p>
      {!record ? (
        <p className="text-base font-black font-mono text-muted-foreground/25">—</p>
      ) : (
        <>
          <p className="text-xl font-black font-mono text-foreground flex items-center gap-1.5" dir="ltr">
            {formatValue(record.value, record.unit)}
            {record.sanadLevel && (
              <SanadBadge sanadLevel={record.sanadLevel} sourceUrl={record.sourceUrl} />
            )}
          </p>
          <p className="text-[0.55rem] font-mono text-muted-foreground/40">
            {record.unit} · {record.year ?? record.date.slice(0, 4)}
          </p>
        </>
      )}
    </div>
  );
}

// ─── Indicator Card With Timeline (unchanged, kept for Markets section) ───────

interface IndicatorCardWithTimelineProps {
  meta: IndicatorMeta;
  record: IndicatorRecord | null;
  isAr: boolean;
}

function MarketCard({ meta, record, isAr }: IndicatorCardWithTimelineProps) {
  const timelineRecords = useQuery(api.economy.getIndicatorTimeline, {
    indicator: meta.key,
  });
  const values: number[] = timelineRecords ? timelineRecords.map((r) => r.value) : [];
  const chartData = values.slice(-12).map((v, i) => ({ i, v }));

  const trend: "up" | "down" =
    values.length >= 2
      ? values[values.length - 1] >= values[values.length - 2]
        ? "up"
        : "down"
      : "up";
  const TrendIcon = trend === "up" ? TrendingUp : TrendingDown;
  const trendColor = trend === "up" ? COLORS.green : COLORS.red;

  return (
    <Card
      className={`border overflow-hidden transition-all ${
        meta.highlight
          ? "border-[#C9A84C]/40 bg-gradient-to-br from-[#C9A84C]/6 to-transparent"
          : "border-border/60 bg-card/50"
      }`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
              {isAr ? meta.nameAr : meta.nameEn}
            </p>
            {meta.highlight && (
              <Badge
                variant="outline"
                className="text-[0.55rem] mt-1 border-[#C9A84C]/40 text-[#C9A84C] px-1.5 py-0"
              >
                {isAr ? "مميز" : "Featured"}
              </Badge>
            )}
          </div>
          {record && (
            <span
              className="flex items-center gap-1 text-[0.65rem] font-mono font-bold px-1.5 py-0.5 rounded"
              style={{
                color: trendColor,
                background: trend === "up" ? "rgba(46,196,182,0.1)" : "rgba(229,72,77,0.1)",
              }}
            >
              <TrendIcon size={10} />
              {trend === "up" ? "▲" : "▼"}
            </span>
          )}
        </div>

        {!record ? (
          <div className="flex items-center gap-2 py-4">
            <Database size={14} className="text-muted-foreground/25" />
            <p className="text-xs text-muted-foreground/40">{isAr ? "لا توجد بيانات" : "No data"}</p>
          </div>
        ) : (
          <>
            <p
              className="text-3xl font-black font-mono tracking-tight text-foreground mb-1 flex items-center gap-2"
              dir="ltr"
              style={{ color: meta.highlight ? COLORS.gold : undefined }}
            >
              {formatValue(record.value, record.unit)}
              {record.sanadLevel && (
                <SanadBadge sanadLevel={record.sanadLevel} sourceUrl={record.sourceUrl} showLabel />
              )}
            </p>
            <p className="text-[0.6rem] text-muted-foreground/60 mb-3 font-mono">
              {record.unit} · {record.year ?? record.date.slice(0, 4)}
            </p>
            {chartData.length >= 2 && (
              <div className="h-[80px] -mx-2" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                    <defs>
                      <linearGradient id={`mkt-${meta.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={meta.highlight ? COLORS.gold : trendColor} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={meta.highlight ? COLORS.gold : trendColor} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke={meta.highlight ? COLORS.gold : trendColor}
                      strokeWidth={1.5}
                      fill={`url(#mkt-${meta.key})`}
                      dot={false}
                      animationDuration={1200}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        <a
          href={meta.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 text-[0.55rem] uppercase tracking-wider text-muted-foreground/35 hover:text-primary/50 transition-colors no-underline block"
        >
          {isAr ? meta.sourceAr : meta.sourceEn}
        </a>
      </CardContent>
    </Card>
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
              <p className="text-sm font-semibold text-foreground mb-2">
                {isAr ? latestReport.titleAr : latestReport.titleEn}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5 border-s-2 border-primary/30 ps-3">
                {isAr ? latestReport.summaryAr : latestReport.summaryEn}
              </p>
              <div className="space-y-4">
                {(() => {
                  const raw = isAr ? latestReport.contentAr : latestReport.contentEn;
                  // Split on numbered patterns: "الرؤية N" / "Insight N" / "N." / "N -" at start of line
                  const sections = raw
                    .split(/(?=(?:الرؤية|Insight)\s*\d)|(?<=\.)\s*(?=(?:الرؤية|Insight)\s*\d)/gi)
                    .flatMap((s) => s.split("\n"))
                    .map((s) => s.trim())
                    .filter((s) => s.length > 20);

                  return sections.slice(0, 6).map((section, idx) => {
                    // Extract title (before first colon or period) and body
                    const colonIdx = section.indexOf(":");
                    const hasTitle = colonIdx > 0 && colonIdx < 80;
                    const title = hasTitle ? section.slice(0, colonIdx).trim() : null;
                    const body = hasTitle ? section.slice(colonIdx + 1).trim() : section;

                    return (
                      <div key={idx} className="border-s-2 border-primary/20 ps-4 py-1">
                        {title && (
                          <p className="text-xs font-semibold text-foreground mb-1">
                            <span className="text-primary/50 font-mono me-2">{String(idx + 1).padStart(2, "0")}</span>
                            {title}
                          </p>
                        )}
                        <p className="text-[0.8rem] text-muted-foreground leading-relaxed">
                          {!title && (
                            <span className="text-primary/50 font-mono me-2">{String(idx + 1).padStart(2, "0")}</span>
                          )}
                          {body}
                        </p>
                      </div>
                    );
                  });
                })()}
              </div>
              <div className="mt-5 pt-4 border-t border-border/50 flex items-center gap-3 flex-wrap">
                <Badge variant="secondary" className="text-[0.6rem] font-mono">
                  {latestReport.agentModel}
                </Badge>
                <span className="text-[0.6rem] text-muted-foreground/50">
                  {isAr ? "المصادر المفحوصة:" : "Sources checked:"}{" "}
                  {latestReport.sourcesChecked.length}
                </span>
                {latestReport.discrepanciesFound > 0 && (
                  <Badge variant="outline" className="text-[0.6rem] border-amber-500/30 text-amber-400">
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

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({ en, ar, isAr, accentColor = "hsl(var(--primary))" }: {
  en: string;
  ar: string;
  isAr: boolean;
  accentColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5 mt-10">
      <div className="h-px flex-1 bg-gradient-to-r from-border/60 to-transparent" />
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: accentColor }}
        />
        <span className="text-[0.65rem] font-bold uppercase tracking-[0.15em] text-muted-foreground">
          {isAr ? ar : en}
        </span>
      </div>
      <div className="h-px flex-1 bg-gradient-to-l from-border/60 to-transparent" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const MONEY_FLOW_COLORS: Record<string, string> = {
  remittances: COLORS.teal,
  fdi_inflows: COLORS.purple,
  tourism_receipts: COLORS.orange,
  suez_revenue: COLORS.gold,
  current_account: COLORS.blue,
};

export default function EconomyPage() {
  const { lang, dir } = useLanguage();
  const isAr = lang === "ar";

  const allLatest = useQuery(api.economy.getAllLatest);
  const isLoading = allLatest === undefined;

  function getRecord(key: string): IndicatorRecord | null {
    if (!allLatest) return null;
    return (allLatest as Record<string, IndicatorRecord | null>)[key] ?? null;
  }

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page">

        {/* ── Hero Header ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 pt-2"
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="flex flex-col">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#C9A84C] mb-1">
                {isAr ? "المؤشرات الاقتصادية" : "Economic Indicators"}
              </p>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                {isAr ? "مصر في أرقام" : "Egypt at a Glance"}
              </h1>
            </div>
          </div>
          <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
            {isAr
              ? "مؤشرات اقتصادية رئيسية مرتبطة بمصادرها الرسمية — البنك الدولي، البنك المركزي، صندوق النقد الدولي"
              : "Key economic indicators with full source attribution — World Bank, CBE, IMF DataMapper"}
          </p>
        </motion.div>

        {/* ── AI Narrative ───────────────────────────────────────────────── */}
        <AiNarrativeSection isAr={isAr} />

        {/* ── Hero Metrics (4 cards) ──────────────────────────────────────── */}
        <SectionLabel
          en="Key Metrics"
          ar="المؤشرات الرئيسية"
          isAr={isAr}
          accentColor={COLORS.gold}
        />
        <Skeleton name="economy-key-metrics" loading={isLoading}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
            {KEY_METRICS.map((meta, i) => (
              <HeroCard
                key={meta.key}
                meta={meta}
                record={getRecord(meta.key)}
                isAr={isAr}
                index={i}
              />
            ))}
          </div>
        </Skeleton>

        {/* ── Interactive Time-Series Charts ──────────────────────────────── */}
        <SectionLabel
          en="Historical Trends"
          ar="الاتجاهات التاريخية"
          isAr={isAr}
          accentColor={COLORS.green}
        />

        <div className="space-y-2">
          <Card className="border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-5 pb-6">
              <GdpGrowthChart isAr={isAr} />
              <InflationExchangeChart isAr={isAr} />
              <MoneyFlowsChart isAr={isAr} />
            </CardContent>
          </Card>
        </div>

        {/* ── Money Flows Grid ─────────────────────────────────────────────── */}
        <SectionLabel
          en="Money Flows"
          ar="تدفقات المال"
          isAr={isAr}
          accentColor={COLORS.purple}
        />
        <Skeleton name="economy-money-flows" loading={isLoading}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-2">
            {MONEY_FLOWS.map((meta) => (
              <MoneyFlowCard
                key={meta.key}
                meta={meta}
                record={getRecord(meta.key)}
                isAr={isAr}
                accentColor={MONEY_FLOW_COLORS[meta.key] ?? COLORS.gold}
              />
            ))}
          </div>
        </Skeleton>

        {/* ── Markets ──────────────────────────────────────────────────────── */}
        <SectionLabel
          en="Markets"
          ar="الأسواق المالية"
          isAr={isAr}
          accentColor={COLORS.gold}
        />
        <Skeleton name="economy-markets" loading={isLoading}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
            {MARKETS.map((meta) => (
              <MarketCard
                key={meta.key}
                meta={meta}
                record={getRecord(meta.key)}
                isAr={isAr}
              />
            ))}
          </div>
        </Skeleton>

        {/* ── National Profile ─────────────────────────────────────────────── */}
        <SectionLabel
          en="National Profile"
          ar="الملف الوطني"
          isAr={isAr}
          accentColor={COLORS.blue}
        />
        <Skeleton name="economy-national-profile" loading={isLoading}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-2">
            {NATIONAL_PROFILE.map((meta) => (
              <NationalStat
                key={meta.key}
                meta={meta}
                record={getRecord(meta.key)}
                isAr={isAr}
              />
            ))}
          </div>
        </Skeleton>

        {/* ── Debt Burden ──────────────────────────────────────────────────── */}
        <SectionLabel
          en="Debt Burden"
          ar="عبء الدين"
          isAr={isAr}
          accentColor={COLORS.red}
        />
        <Skeleton name="economy-debt-burden" loading={isLoading}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
            {DEBT_BURDEN.map((meta) => (
              <MoneyFlowCard
                key={meta.key}
                meta={meta}
                record={getRecord(meta.key)}
                isAr={isAr}
                accentColor={COLORS.red}
              />
            ))}
            <Link href="/debt" className="no-underline">
              <Card className="border-border/40 bg-card/20 hover:border-[#C9A84C]/30 hover:bg-card/40 transition-all h-full group">
                <CardContent className="p-5 flex flex-col justify-between h-full min-h-[130px]">
                  <p className="text-xs text-muted-foreground font-medium">
                    {isAr ? "استكشاف تفاصيل الدين الوطني" : "Explore full debt breakdown"}
                  </p>
                  <div className="flex items-center gap-1.5 text-[#C9A84C]/70 group-hover:text-[#C9A84C] text-sm font-semibold mt-4 transition-colors">
                    {isAr ? "صفحة الدين" : "Debt Page"}
                    <ArrowRight size={14} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </Skeleton>

        {/* ── IMF Forecasts ─────────────────────────────────────────────────── */}
        <SectionLabel
          en="IMF Forecasts (through 2030)"
          ar="توقعات صندوق النقد الدولي (حتى 2030)"
          isAr={isAr}
          accentColor={COLORS.blue}
        />
        <Skeleton name="economy-imf" loading={isLoading}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
            {IMF_FORECASTS.map((meta) => (
              <ImfForecastChart
                key={meta.key}
                meta={meta}
                record={getRecord(meta.key)}
                isAr={isAr}
              />
            ))}
          </div>
        </Skeleton>

        {/* ── Sources Footer ───────────────────────────────────────────────── */}
        <div className="mt-10">
          <DataSourceFooter category="economy" />
        </div>
      </div>
    </div>
  );
}
