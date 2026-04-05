"use client";

import { useLanguage } from "@/components/providers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, TrendingUp, TrendingDown } from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Indicator {
  nameAr: string;
  nameEn: string;
  value: string;
  change: string;
  trend: "up" | "down";
  unit: string;
  data: number[];
  highlight?: boolean;
  sourceAr?: string;
  sourceEn?: string;
  sourceUrl?: string;
}

const indicators: Indicator[] = [
  {
    nameAr: "الناتج المحلي الإجمالي",
    nameEn: "GDP",
    value: "$476B",
    change: "+3.8%",
    trend: "up",
    unit: "USD",
    data: [305, 332, 363, 394, 404, 400, 420, 450, 476],
    sourceEn: "World Bank",
    sourceAr: "البنك الدولي",
    sourceUrl: "https://data.worldbank.org/country/egypt-arab-rep",
  },
  {
    nameAr: "معدل التضخم",
    nameEn: "Inflation Rate",
    value: "28.1%",
    change: "-5.2%",
    trend: "down",
    unit: "%",
    data: [5.3, 5.7, 6.2, 13.9, 21.9, 36.5, 38.2, 33.3, 28.1],
    sourceEn: "CAPMAS",
    sourceAr: "الجهاز المركزي للتعبئة",
    sourceUrl: "https://www.capmas.gov.eg",
  },
  {
    nameAr: "معدل البطالة",
    nameEn: "Unemployment",
    value: "7.1%",
    change: "-0.5%",
    trend: "down",
    unit: "%",
    data: [9.8, 11.9, 11.4, 10.5, 9.3, 7.4, 7.2, 7.6, 7.1],
    sourceEn: "CAPMAS",
    sourceAr: "الجهاز المركزي للتعبئة",
    sourceUrl: "https://www.capmas.gov.eg",
  },
  {
    nameAr: "سعر الدولار",
    nameEn: "USD/EGP Rate",
    value: "48.5",
    change: "+195%",
    trend: "up",
    unit: "EGP",
    data: [8.9, 15.7, 17.8, 18.1, 15.7, 19.2, 30.9, 30.9, 48.5],
    highlight: true,
    sourceEn: "Central Bank of Egypt",
    sourceAr: "البنك المركزي المصري",
    sourceUrl: "https://www.cbe.org.eg/en/economic-research/statistics",
  },
  {
    nameAr: "الاحتياطي الأجنبي",
    nameEn: "Foreign Reserves",
    value: "$46.4B",
    change: "+15%",
    trend: "up",
    unit: "USD",
    data: [36.1, 31.3, 38.2, 40.1, 40.3, 33.4, 34.2, 35.2, 46.4],
    sourceEn: "Central Bank of Egypt",
    sourceAr: "البنك المركزي المصري",
    sourceUrl: "https://www.cbe.org.eg/en/economic-research/statistics",
  },
  {
    nameAr: "إيرادات قناة السويس",
    nameEn: "Suez Canal Revenue",
    value: "$7.2B",
    change: "-23%",
    trend: "down",
    unit: "USD/yr",
    data: [5.3, 5.6, 5.7, 5.8, 5.6, 6.3, 8.0, 9.4, 7.2],
    sourceEn: "Suez Canal Authority",
    sourceUrl: "https://www.suezcanal.gov.eg",
    sourceAr: "هيئة قناة السويس",
  },
  {
    nameAr: "تحويلات المصريين بالخارج",
    nameEn: "Remittances",
    value: "$22.1B",
    change: "+8%",
    trend: "up",
    unit: "USD/yr",
    data: [19.6, 25.2, 28.9, 26.6, 29.6, 31.5, 22.1, 20.8, 22.1],
    sourceEn: "Central Bank of Egypt",
    sourceAr: "البنك المركزي المصري",
    sourceUrl: "https://www.cbe.org.eg/en/economic-research/statistics",
  },
  {
    nameAr: "السياحة",
    nameEn: "Tourism Revenue",
    value: "$14.4B",
    change: "+5%",
    trend: "up",
    unit: "USD/yr",
    data: [6.0, 3.8, 4.4, 7.6, 9.9, 11.6, 13.6, 13.7, 14.4],
    sourceEn: "Ministry of Tourism",
    sourceUrl: "https://www.tourism.gov.eg",
    sourceAr: "وزارة السياحة",
  },
];

const YEARS = ["2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024"];

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data, trend }: { data: number[]; trend: "up" | "down" }) {
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

  // Area fill
  const firstX = pad;
  const lastX = pad + innerW;
  const area = `${firstX},${h} ${polyline} ${lastX},${h}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polygon points={area} fill={color} fillOpacity={0.12} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      {/* Last point dot */}
      {(() => {
        const last = points[points.length - 1].split(",");
        return <circle cx={last[0]} cy={last[1]} r={2.5} fill={color} />;
      })()}
    </svg>
  );
}

// ─── Indicator Card ───────────────────────────────────────────────────────────

function IndicatorCard({ ind, isAr }: { ind: Indicator; isAr: boolean }) {
  const isPositive = ind.change.startsWith("+");
  const TrendIcon = ind.trend === "up" ? TrendingUp : TrendingDown;

  return (
    <Card
      className={`border-border/60 bg-card/60 backdrop-blur-sm hover:border-primary/30 transition-all ${
        ind.highlight ? "border-[#C9A84C]/50 bg-[#C9A84C]/5" : ""
      }`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium truncate">
              {isAr ? ind.nameAr : ind.nameEn}
            </p>
            {ind.highlight && (
              <Badge variant="outline" className="text-[0.6rem] mt-1 border-[#C9A84C]/50 text-[#C9A84C]">
                {isAr ? "أكبر تحول" : "Biggest shift"}
              </Badge>
            )}
          </div>
          <Badge
            variant="secondary"
            className={`text-xs font-mono flex-shrink-0 ms-2 ${
              isPositive
                ? "bg-green-500/10 text-green-400 border-green-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}
          >
            <TrendIcon size={10} className="inline me-0.5" />
            {ind.change}
          </Badge>
        </div>

        <p className="font-mono text-3xl font-black tracking-tight text-foreground mb-1" dir="ltr">
          {ind.value}
        </p>
        <p className="text-[0.625rem] text-muted-foreground mb-4">
          {ind.unit} · 2024
        </p>

        {/* Sparkline */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1">
            <Sparkline data={ind.data} trend={ind.trend} />
          </div>
          <div className="flex-shrink-0 text-end">
            <p className="text-[0.55rem] text-muted-foreground/60">2016 – 2024</p>
          </div>
        </div>

        {/* Years axis */}
        <div className="flex justify-between mt-1" dir="ltr">
          {[YEARS[0], YEARS[4], YEARS[8]].map((y) => (
            <span key={y} className="text-[0.55rem] text-muted-foreground/50 font-mono">{y}</span>
          ))}
        </div>

        {(ind.sourceEn || ind.sourceAr) && (
          ind.sourceUrl ? (
            <a href={ind.sourceUrl} target="_blank" rel="noopener noreferrer"
              className="text-[0.6rem] text-primary/50 hover:text-primary no-underline hover:underline mt-2 truncate block">
              {isAr ? ind.sourceAr : ind.sourceEn}
            </a>
          ) : (
            <p className="text-[0.6rem] text-muted-foreground/50 mt-2 truncate">
              {isAr ? ind.sourceAr : ind.sourceEn}
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EconomyPage() {
  const { lang, dir } = useLanguage();
  const isAr = lang === "ar";

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
              ? "مؤشرات اقتصادية رئيسية لمصر من ٢٠١٦ إلى ٢٠٢٤ — من البنك الدولي والبنك المركزي وجهاز التعبئة والإحصاء"
              : "Key Egyptian economic indicators from 2016 to 2024 — World Bank, CBE, CAPMAS"}
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {indicators.map((ind) => (
            <IndicatorCard key={ind.nameEn} ind={ind} isAr={isAr} />
          ))}
        </div>

        {/* Sources */}
        <div className="mt-10 pt-6 border-t border-border flex flex-wrap gap-4 text-[0.625rem] text-muted-foreground">
          {[
            { label: "World Bank", url: "https://data.worldbank.org/country/egypt-arab-rep" },
            { label: "Central Bank of Egypt", url: "https://www.cbe.org.eg/en/economic-research/statistics" },
            { label: "CAPMAS", url: "https://www.capmas.gov.eg" },
            { label: "Suez Canal Authority", url: "https://www.suezcanal.gov.eg" },
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
