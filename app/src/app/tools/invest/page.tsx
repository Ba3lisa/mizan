"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useLanguage } from "@/components/providers";
import { useCurrency } from "@/components/providers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SanadBadge } from "@/components/sanad-badge";
import { DataSourceFooter } from "@/components/data-source";
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
  Legend,
} from "recharts";
import { TrendingUp, AlertTriangle, Info } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssetClass {
  key: string;
  nameEn: string;
  nameAr: string;
  color: string;
  defaultReturn: number;
  volatility: number;
  convexKey: string;
}

interface YearProjection {
  year: number;
  total: number;
  real: number;
  byAsset: Record<string, number>;
}

interface Preset {
  nameEn: string;
  nameAr: string;
  allocation: Record<string, number>;
}

type AllocationMap = Record<string, number>;

// ─── Constants ───────────────────────────────────────────────────────────────

const ASSETS: AssetClass[] = [
  { key: "egx30", nameEn: "EGX 30 Stocks", nameAr: "أسهم البورصة المصرية", color: "#C9A84C", defaultReturn: 18.5, volatility: 25, convexKey: "egx30_annual_return" },
  { key: "realEstate", nameEn: "Egyptian Real Estate", nameAr: "العقارات المصرية", color: "#2EC4B6", defaultReturn: 15, volatility: 12, convexKey: "egypt_real_estate_return" },
  { key: "cds", nameEn: "Bank CDs", nameAr: "شهادات بنكية", color: "#6C8EEF", defaultReturn: 19, volatility: 2, convexKey: "cbe_cd_rate" },
  { key: "tbills", nameEn: "Treasury Bills", nameAr: "أذون خزانة", color: "#3FC380", defaultReturn: 22.5, volatility: 3, convexKey: "egypt_tbill_rate" },
  { key: "gold", nameEn: "Gold (EGP)", nameAr: "الذهب", color: "#F59E0B", defaultReturn: 20, volatility: 18, convexKey: "gold_price_egp" },
  { key: "sp500", nameEn: "S&P 500 (USD)", nameAr: "S&P 500", color: "#8B5CF6", defaultReturn: 10, volatility: 15, convexKey: "sp500_annual_return" },
  { key: "msciEm", nameEn: "MSCI EM", nameAr: "الأسواق الناشئة", color: "#EC4899", defaultReturn: 7.5, volatility: 20, convexKey: "msci_em_return" },
];

const CAPITAL_STEPS = [50_000, 100_000, 250_000, 500_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000];
const QUICK_CAPITALS = [100_000, 500_000, 1_000_000, 5_000_000];

const PRESETS: Record<string, Preset> = {
  conservative: {
    nameEn: "Conservative",
    nameAr: "محافظ",
    allocation: { cds: 50, tbills: 25, gold: 15, realEstate: 10, egx30: 0, sp500: 0, msciEm: 0 },
  },
  balanced: {
    nameEn: "Balanced",
    nameAr: "متوازن",
    allocation: { egx30: 25, realEstate: 25, cds: 20, gold: 15, tbills: 10, sp500: 5, msciEm: 0 },
  },
  aggressive: {
    nameEn: "Aggressive",
    nameAr: "عدواني",
    allocation: { egx30: 40, realEstate: 20, sp500: 15, gold: 10, msciEm: 10, tbills: 5, cds: 0 },
  },
};

const DEFAULT_INFLATION = 25;
const DEFAULT_HORIZON = 10;
const DEFAULT_CAPITAL_INDEX = 4; // 1M

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCompact(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

function fmtNumber(n: number): string {
  return new Intl.NumberFormat("en-EG").format(Math.round(n));
}

function projectPortfolio(
  capital: number,
  horizon: number,
  allocation: AllocationMap,
  returns: Record<string, number>,
  inflation: number
): YearProjection[] {
  const result: YearProjection[] = [];
  const assetValues: Record<string, number> = {};

  for (const [key, pct] of Object.entries(allocation)) {
    assetValues[key] = capital * (pct / 100);
  }

  for (let year = 0; year <= horizon; year++) {
    const byAsset = { ...assetValues };
    const total = Object.values(byAsset).reduce((s, v) => s + v, 0);
    const real = total / Math.pow(1 + inflation / 100, year);
    result.push({ year, total, real, byAsset });

    for (const key of Object.keys(assetValues)) {
      const rate = returns[key] ?? 0;
      assetValues[key] *= 1 + rate / 100;
    }
  }
  return result;
}

function calcWeightedVolatility(allocation: AllocationMap): number {
  let weighted = 0;
  let total = 0;
  for (const asset of ASSETS) {
    const pct = allocation[asset.key] ?? 0;
    weighted += pct * asset.volatility;
    total += pct;
  }
  return total > 0 ? weighted / total : 0;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  name?: string;
  value?: number;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: readonly TooltipPayloadItem[];
  label?: string | number;
  isAr: boolean;
}

function DarkTooltip({ active, payload, label, isAr }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
  return (
    <div className="bg-[#1a1d27] border border-border/60 rounded-lg p-3 shadow-xl text-xs min-w-[200px]">
      <p className="text-muted-foreground mb-2 font-semibold">
        {isAr ? `السنة ${label}` : `Year ${label}`}
      </p>
      {payload.map((p, idx) => (
        <div key={`${p.name ?? ""}-${idx}`} className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </div>
          <span className="font-mono font-bold text-foreground">{fmtCompact(p.value ?? 0)}</span>
        </div>
      ))}
      <Separator className="my-2" />
      <div className="flex justify-between font-bold">
        <span className="text-muted-foreground">{isAr ? "المجموع" : "Total"}</span>
        <span className="font-mono text-primary">{fmtCompact(total)}</span>
      </div>
    </div>
  );
}

interface RaceTipProps {
  active?: boolean;
  payload?: readonly TooltipPayloadItem[];
  label?: string | number;
  isAr: boolean;
}

function RaceTooltip({ active, payload, label, isAr }: RaceTipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const sorted = [...payload].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  return (
    <div className="bg-[#1a1d27] border border-border/60 rounded-lg p-3 shadow-xl text-xs min-w-[200px]">
      <p className="text-muted-foreground mb-2 font-semibold">
        {isAr ? `السنة ${label}` : `Year ${label}`}
      </p>
      {sorted.map((p, idx) => (
        <div key={`${p.name ?? ""}-${idx}`} className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </div>
          <span className="font-mono font-bold text-foreground">{fmtCompact(p.value ?? 0)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvestPage() {
  const { lang, dir } = useLanguage();
  const isAr = lang === "ar";
  const { symbol, fromEGP, fmt } = useCurrency();

  // Convex data
  const convexDefaults = useQuery(api.tools.getInvestmentDefaults);

  // State
  const [capitalIdx, setCapitalIdx] = useState(DEFAULT_CAPITAL_INDEX);
  const [horizon, setHorizon] = useState(DEFAULT_HORIZON);
  const [allocation, setAllocation] = useState<AllocationMap>(() => {
    const m: AllocationMap = {};
    for (const a of ASSETS) m[a.key] = 0;
    return { ...PRESETS.balanced.allocation };
  });
  const [activePreset, setActivePreset] = useState<string>("balanced");

  const capital = CAPITAL_STEPS[capitalIdx] ?? 1_000_000;

  // Build effective returns: prefer Convex, fallback to ASSETS defaults
  const effectiveReturns = useMemo<Record<string, number>>(() => {
    const r: Record<string, number> = {};
    for (const asset of ASSETS) {
      const convexRecord = convexDefaults?.[asset.convexKey];
      r[asset.key] = convexRecord?.value ?? asset.defaultReturn;
    }
    return r;
  }, [convexDefaults]);

  const inflation = useMemo(() => {
    return convexDefaults?.["inflation"]?.value ?? DEFAULT_INFLATION;
  }, [convexDefaults]);

  // Projection data
  const projections = useMemo(() => {
    return projectPortfolio(capital, horizon, allocation, effectiveReturns, inflation);
  }, [capital, horizon, allocation, effectiveReturns, inflation]);

  // Asset race data (100% each asset)
  const raceData = useMemo(() => {
    const years = Array.from({ length: horizon + 1 }, (_, i) => i);
    return years.map((year) => {
      const point: Record<string, number> = { year };
      for (const asset of ASSETS) {
        const rate = effectiveReturns[asset.key] ?? 0;
        point[asset.key] = capital * Math.pow(1 + rate / 100, year);
      }
      return point;
    });
  }, [capital, horizon, effectiveReturns]);

  // Totals
  const totalAllocation = Object.values(allocation).reduce((s, v) => s + v, 0);
  const isValid = Math.abs(totalAllocation - 100) < 0.5;
  const finalValue = projections[projections.length - 1]?.total ?? capital;
  const finalReal = projections[projections.length - 1]?.real ?? capital;
  const riskScore = calcWeightedVolatility(allocation);
  const cashFinalValue = capital / Math.pow(1 + inflation / 100, horizon);

  // Chart data
  const stackedData = projections.map((p) => {
    const point: Record<string, number> = { year: p.year };
    for (const asset of ASSETS) {
      point[asset.key] = Math.round(p.byAsset[asset.key] ?? 0);
    }
    point.real = Math.round(p.real);
    return point;
  });

  // Handlers
  const handleAllocationChange = useCallback((key: string, value: number) => {
    setAllocation((prev) => ({ ...prev, [key]: value }));
    setActivePreset("");
  }, []);

  const applyPreset = useCallback((presetKey: string) => {
    const preset = PRESETS[presetKey];
    if (!preset) return;
    const full: AllocationMap = {};
    for (const a of ASSETS) full[a.key] = 0;
    const merged = { ...full, ...preset.allocation };
    setAllocation(merged);
    setActivePreset(presetKey);
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page">

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">
            {isAr ? "أدوات الاستثمار" : "Investment Tools"}
          </p>
          <h1 className="text-3xl md:text-4xl font-black mb-2">
            {isAr ? "محاكي الاستثمار" : "Investment Simulator"}
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            {isAr
              ? "قارن أداء فئات الأصول المصرية المختلفة على المدى الطويل. معدلات العائد مأخوذة من بيانات السوق الفعلية."
              : "Compare Egyptian and global asset classes over time. Return rates are sourced from live market data."}
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

          {/* ─── Config Column (1 col) ──────────────────────────────────── */}
          <div className="xl:col-span-1 space-y-5">

            {/* Capital */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-5 space-y-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  {isAr ? "رأس المال" : "Capital"}
                </p>
                <div className="text-center">
                  <p className="text-2xl font-black text-foreground font-mono" dir="ltr">
                    {fmtNumber(capital)}
                    <span className="text-sm text-muted-foreground ms-1">{symbol}</span>
                  </p>
                  {fromEGP(capital) !== capital && (
                    <p className="text-xs text-muted-foreground font-mono" dir="ltr">
                      ≈ {fmt(fromEGP(capital), { compact: true })}
                    </p>
                  )}
                </div>
                <input
                  type="range"
                  min={0}
                  max={CAPITAL_STEPS.length - 1}
                  step={1}
                  value={capitalIdx}
                  onChange={(e) => setCapitalIdx(parseInt(e.target.value))}
                  className="w-full accent-[#C9A84C] cursor-pointer"
                />
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {QUICK_CAPITALS.map((v) => {
                    const idx = CAPITAL_STEPS.indexOf(v);
                    return (
                      <button
                        key={v}
                        onClick={() => setCapitalIdx(idx)}
                        className={`text-[0.625rem] font-mono px-2.5 py-1 rounded-full border transition-colors ${
                          capitalIdx === idx
                            ? "border-primary text-primary"
                            : "border-border hover:border-primary/50 hover:text-primary text-muted-foreground"
                        }`}
                      >
                        {v >= 1_000_000 ? `${v / 1_000_000}M` : `${v / 1_000}K`}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Horizon */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    {isAr ? "المدى الزمني" : "Time Horizon"}
                  </p>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {horizon} {isAr ? "سنة" : "yr"}
                  </Badge>
                </div>
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={horizon}
                  onChange={(e) => setHorizon(parseInt(e.target.value))}
                  className="w-full accent-[#C9A84C] cursor-pointer"
                />
                <div className="flex justify-between text-[0.625rem] text-muted-foreground font-mono" dir="ltr">
                  <span>1y</span>
                  <span>30y</span>
                </div>
              </CardContent>
            </Card>

            {/* Presets */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-5 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  {isAr ? "استراتيجيات جاهزة" : "Quick Presets"}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => applyPreset(key)}
                      className={`text-[0.65rem] font-semibold px-2 py-2 rounded-lg border transition-all ${
                        activePreset === key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {isAr ? preset.nameAr : preset.nameEn}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Allocation sliders */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    {isAr ? "توزيع المحفظة" : "Allocation"}
                  </p>
                  {!isValid ? (
                    <Badge className="text-[0.6rem] bg-red-500/20 text-red-400 border-red-500/30">
                      {totalAllocation}% / 100%
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[0.6rem] text-green-400">
                      100% ✓
                    </Badge>
                  )}
                </div>

                <div className="space-y-3">
                  {ASSETS.map((asset) => {
                    const pct = allocation[asset.key] ?? 0;
                    const convexRec = convexDefaults?.[asset.convexKey];
                    const rate = convexRec?.value ?? asset.defaultReturn;
                    return (
                      <div key={asset.key} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: asset.color }} />
                            <span className="text-[0.7rem] text-foreground truncate">
                              {isAr ? asset.nameAr : asset.nameEn}
                            </span>
                            {convexRec && (
                              <SanadBadge
                                sanadLevel={convexRec.sanadLevel}
                                sourceUrl={convexRec.sourceUrl}
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-[0.6rem] text-muted-foreground font-mono">
                              {rate.toFixed(1)}%
                            </span>
                            <Badge
                              className="text-[0.55rem] h-4 px-1 font-mono"
                              style={{ background: `${asset.color}22`, color: asset.color, border: `1px solid ${asset.color}44` }}
                            >
                              {pct}%
                            </Badge>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={pct}
                          onChange={(e) => handleAllocationChange(asset.key, parseInt(e.target.value))}
                          className="w-full h-1.5 cursor-pointer rounded-full appearance-none"
                          style={{ accentColor: asset.color }}
                        />
                      </div>
                    );
                  })}
                </div>

                {!isValid && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />
                    <p className="text-[0.65rem] text-red-400">
                      {isAr
                        ? `المجموع ${totalAllocation}% — يجب أن يساوي 100%`
                        : `Total is ${totalAllocation}% — must equal 100%`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Risk Meter */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-5 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  {isAr ? "مستوى المخاطرة" : "Risk Level"}
                </p>
                <div>
                  <div className="h-3 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 relative">
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-foreground shadow-lg transition-all duration-500"
                      style={{ left: `${Math.min(riskScore * 4, 96)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[0.6rem] text-muted-foreground mt-1">
                    <span>{isAr ? "آمن" : "Safe"}</span>
                    <span>{isAr ? "عالي المخاطر" : "High Risk"}</span>
                  </div>
                </div>
                <p className="text-[0.65rem] text-muted-foreground text-center">
                  {isAr ? "التقلب المرجح:" : "Weighted volatility:"}{" "}
                  <span className="font-mono text-foreground">{riskScore.toFixed(1)}%</span>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ─── Results Columns (3 cols) ───────────────────────────────── */}
          <div className="xl:col-span-3 space-y-6">

            {/* Hero Result */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-card/80 to-card/60 backdrop-blur-sm overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
                        {isAr ? "القيمة المتوقعة" : "Projected Value"}
                      </p>
                      <motion.p
                        key={finalValue}
                        initial={{ opacity: 0.5, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="text-3xl sm:text-4xl font-black text-primary font-mono" dir="ltr"
                      >
                        {fmtCompact(finalValue)}{" "}
                        <span className="text-lg text-muted-foreground">{symbol}</span>
                      </motion.p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isAr
                          ? `بعد ${horizon} سنة — من أصل ${fmtCompact(capital)} ${symbol}`
                          : `in ${horizon} years — from ${fmtCompact(capital)} ${symbol}`}
                      </p>
                    </div>
                    <div className="sm:text-end">
                      <div className="flex items-center gap-1.5 mb-1 sm:justify-end">
                        <Info size={12} className="text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          {isAr ? "معدّل بالتضخم" : "Inflation-adjusted"}
                        </p>
                      </div>
                      <p className="text-xl font-bold text-foreground font-mono" dir="ltr">
                        {fmtCompact(finalReal)}{" "}
                        <span className="text-sm text-muted-foreground">{symbol}</span>
                      </p>
                      <div className="flex items-center gap-1 mt-1 sm:justify-end">
                        <TrendingUp size={12} className="text-green-400" />
                        <span className="text-xs text-green-400 font-mono">
                          {finalValue > 0 ? `×${(finalValue / capital).toFixed(2)}` : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Stacked Area Chart */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                  {isAr ? "نمو المحفظة عبر الزمن" : "Portfolio Growth Over Time"}
                </p>
                <div dir="ltr">
                  <ResponsiveContainer width="100%" height={380}>
                    <AreaChart data={stackedData} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                      <defs>
                        {ASSETS.map((asset) => (
                          <linearGradient key={asset.key} id={`grad-${asset.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={asset.color} stopOpacity={0.6} />
                            <stop offset="95%" stopColor={asset.color} stopOpacity={0.05} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="year"
                        tick={{ fontSize: 10, fill: "#888" }}
                        tickFormatter={(v: number) => `Y${v}`}
                        stroke="rgba(255,255,255,0.1)"
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#888" }}
                        tickFormatter={(v: number) => fmtCompact(v)}
                        stroke="rgba(255,255,255,0.1)"
                        width={60}
                      />
                      <Tooltip
                        content={(props) => (
                          <DarkTooltip
                            active={props.active}
                            payload={props.payload as unknown as readonly TooltipPayloadItem[] | undefined}
                            label={props.label as string | undefined}
                            isAr={isAr}
                          />
                        )}
                      />
                      {ASSETS.map((asset) => {
                        const pct = allocation[asset.key] ?? 0;
                        if (pct === 0) return null;
                        return (
                          <Area
                            key={asset.key}
                            type="monotone"
                            dataKey={asset.key}
                            name={isAr ? asset.nameAr : asset.nameEn}
                            stackId="portfolio"
                            stroke={asset.color}
                            fill={`url(#grad-${asset.key})`}
                            strokeWidth={1.5}
                            animationDuration={2000}
                          />
                        );
                      })}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Asset Race Chart */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
                  {isAr ? "سباق الأصول" : "Asset Race"}
                </p>
                <p className="text-[0.7rem] text-muted-foreground mb-4">
                  {isAr
                    ? `ماذا لو استثمرت ${fmtCompact(capital)} ${symbol} في كل أصل بشكل منفرد؟`
                    : `What if you put ${fmtCompact(capital)} ${symbol} 100% in each asset?`}
                </p>
                <div dir="ltr">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={raceData} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="year"
                        tick={{ fontSize: 10, fill: "#888" }}
                        tickFormatter={(v: number) => `Y${v}`}
                        stroke="rgba(255,255,255,0.1)"
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#888" }}
                        tickFormatter={(v: number) => fmtCompact(v)}
                        stroke="rgba(255,255,255,0.1)"
                        width={60}
                      />
                      <Tooltip
                        content={(props) => (
                          <RaceTooltip
                            active={props.active}
                            payload={props.payload as unknown as readonly TooltipPayloadItem[] | undefined}
                            label={props.label as string | undefined}
                            isAr={isAr}
                          />
                        )}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 10, color: "#888" }}
                        formatter={(value: string) => <span style={{ color: "#888", fontSize: 10 }}>{value}</span>}
                      />
                      {ASSETS.map((asset) => (
                        <Line
                          key={asset.key}
                          type="monotone"
                          dataKey={asset.key}
                          name={isAr ? asset.nameAr : asset.nameEn}
                          stroke={asset.color}
                          strokeWidth={2}
                          dot={false}
                          animationDuration={1500}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Comparison Cards */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                {isAr ? "تفاصيل الأصول" : "Asset Breakdown"}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {ASSETS.map((asset, i) => {
                  const pct = allocation[asset.key] ?? 0;
                  const rate = effectiveReturns[asset.key] ?? asset.defaultReturn;
                  const finalAssetValue = projections[projections.length - 1]?.byAsset[asset.key] ?? 0;
                  const convexRec = convexDefaults?.[asset.convexKey];
                  return (
                    <motion.div
                      key={asset.key}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08, duration: 0.4 }}
                    >
                      <Card
                        className={`border-border/60 bg-card/60 transition-all duration-300 ${
                          pct > 0 ? "border-opacity-100" : "opacity-50"
                        }`}
                        style={pct > 0 ? { borderColor: `${asset.color}33` } : {}}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: asset.color }} />
                            <span className="text-[0.65rem] text-muted-foreground leading-tight truncate">
                              {isAr ? asset.nameAr : asset.nameEn}
                            </span>
                            {convexRec && (
                              <SanadBadge
                                sanadLevel={convexRec.sanadLevel}
                                sourceUrl={convexRec.sourceUrl}
                              />
                            )}
                          </div>
                          <p
                            className="text-lg font-black font-mono leading-tight"
                            style={{ color: pct > 0 ? asset.color : undefined }}
                          >
                            {pct > 0 ? fmtCompact(finalAssetValue) : "—"}
                          </p>
                          <p className="text-[0.6rem] text-muted-foreground">
                            {symbol} / {horizon}{isAr ? "ي" : "y"}
                          </p>
                          <Separator className="my-2" />
                          <div className="flex justify-between text-[0.6rem]">
                            <span className="text-muted-foreground">{isAr ? "التوزيع" : "Alloc."}</span>
                            <span className="font-mono text-foreground">{pct}%</span>
                          </div>
                          <div className="flex justify-between text-[0.6rem]">
                            <span className="text-muted-foreground">{isAr ? "العائد" : "Return"}</span>
                            <span className="font-mono" style={{ color: asset.color }}>{rate.toFixed(1)}%</span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Inflation Warning */}
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={16} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground mb-1">
                      {isAr
                        ? `إذا احتفظت بأموالك في النقد...`
                        : `If you keep your money in cash...`}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {isAr
                        ? `بسبب معدل التضخم ${inflation.toFixed(1)}%، ستتقلص قيمة ${fmtCompact(capital)} ${symbol} إلى ${fmtCompact(cashFinalValue)} ${symbol} (بالقيمة الشرائية) خلال ${horizon} سنة — أي خسارة ${fmtCompact(capital - cashFinalValue)} ${symbol}.`
                        : `At ${inflation.toFixed(1)}% inflation, ${fmtCompact(capital)} ${symbol} in cash loses purchasing power, becoming equivalent to only ${fmtCompact(cashFinalValue)} ${symbol} over ${horizon} years — a loss of ${fmtCompact(capital - cashFinalValue)} ${symbol}.`}
                    </p>
                    <div className="mt-3 flex items-center gap-3" dir="ltr">
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-yellow-400/70 rounded-full transition-all duration-700"
                          style={{ width: `${(cashFinalValue / capital) * 100}%` }}
                        />
                      </div>
                      <span className="text-[0.65rem] font-mono text-yellow-400 whitespace-nowrap">
                        {((cashFinalValue / capital) * 100).toFixed(1)}% {isAr ? "يبقى" : "remains"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Disclaimer */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border/40">
              <Info size={12} className="text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-[0.65rem] text-muted-foreground leading-relaxed">
                {isAr
                  ? "هذه المحاكاة للأغراض التعليمية فقط. الأداء السابق لا يضمن الأداء المستقبلي. معدلات العائد المستخدمة هي متوسطات تاريخية. استشر مستشارًا ماليًا قبل اتخاذ قرارات الاستثمار."
                  : "This simulation is for educational purposes only. Past performance does not guarantee future results. Return rates are historical averages. Consult a financial advisor before making investment decisions."}
              </p>
            </div>

            <DataSourceFooter category="economy" />
          </div>
        </div>
      </div>
    </div>
  );
}
