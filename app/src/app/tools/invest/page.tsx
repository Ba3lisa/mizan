"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useLanguage } from "@/components/providers";
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
import { AlertTriangle, Info, BookOpen, ChevronDown } from "lucide-react";

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
  usdTotal: number;
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
  { key: "gold", nameEn: "Gold (EGP)", nameAr: "الذهب", color: "#F59E0B", defaultReturn: 20, volatility: 18, convexKey: "gold_annual_return" },
  { key: "sp500", nameEn: "S&P 500 (USD)", nameAr: "S&P 500", color: "#8B5CF6", defaultReturn: 10, volatility: 15, convexKey: "sp500_annual_return" },
  { key: "msciEm", nameEn: "MSCI EM", nameAr: "الأسواق الناشئة", color: "#EC4899", defaultReturn: 7.5, volatility: 20, convexKey: "msci_em_return" },
];

const CAPITAL_STEPS = [50_000, 100_000, 250_000, 500_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000];
const QUICK_CAPITALS = [100_000, 500_000, 1_000_000, 5_000_000];

const PRESETS: Record<string, Preset> = {
  conservative: {
    nameEn: "Conservative",
    nameAr: "آمن",
    allocation: { cds: 50, tbills: 25, gold: 15, realEstate: 10, egx30: 0, sp500: 0, msciEm: 0 },
  },
  balanced: {
    nameEn: "Balanced",
    nameAr: "متوازن",
    allocation: { egx30: 25, realEstate: 25, cds: 20, gold: 15, tbills: 10, sp500: 5, msciEm: 0 },
  },
  aggressive: {
    nameEn: "Aggressive",
    nameAr: "مغامر",
    allocation: { egx30: 40, realEstate: 20, sp500: 15, gold: 10, msciEm: 10, tbills: 5, cds: 0 },
  },
};

const DEFAULT_INFLATION = 25;
const DEFAULT_HORIZON = 10;
const DEFAULT_CAPITAL_INDEX = 4; // 1M
const DEFAULT_DEPRECIATION = 7;

const ASSET_TOOLTIPS: Record<string, { en: string; ar: string }> = {
  egx30: {
    en: "Egyptian stock market index. High returns but volatile. Best for long-term (5+ years).",
    ar: "مؤشر البورصة المصرية. عوائد عالية لكن متقلب. الأفضل للمدى الطويل.",
  },
  realEstate: {
    en: "Egyptian property appreciation. Illiquid — hard to sell quickly. Good inflation hedge.",
    ar: "ارتفاع قيمة العقارات. غير سائل — صعب البيع بسرعة. حماية جيدة من التضخم.",
  },
  cds: {
    en: "Fixed-rate certificates from Egyptian banks (Banque Misr, NBE). Guaranteed returns, very safe.",
    ar: "شهادات ادخار ثابتة من البنوك. عوائد مضمونة وآمنة جداً.",
  },
  tbills: {
    en: "Egyptian government treasury bills. Very safe, slightly higher yield than CDs, shorter terms.",
    ar: "أذون خزانة حكومية. آمنة جداً، عائد أعلى قليلاً من الشهادات.",
  },
  gold: {
    en: "Price in EGP includes both global gold movement and EGP depreciation. Good crisis hedge.",
    ar: "السعر بالجنيه يشمل حركة الذهب العالمية وانخفاض الجنيه. حماية جيدة في الأزمات.",
  },
  sp500: {
    en: "US stock market. Returns in USD — benefits from EGP depreciation but has currency risk if EGP strengthens.",
    ar: "السوق الأمريكي. العوائد بالدولار — يستفيد من انخفاض الجنيه.",
  },
  msciEm: {
    en: "Emerging markets index (includes Egypt, India, Brazil, etc.). Diversified but volatile.",
    ar: "مؤشر الأسواق الناشئة. متنوع لكن متقلب.",
  },
};

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
  inflation: number,
  exchangeRate: number,
  depreciationPct: number
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
    const usdTotal = total / (exchangeRate * Math.pow(1 + depreciationPct / 100, year));
    result.push({ year, total, real, usdTotal, byAsset });

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

// ─── Input Tooltip ────────────────────────────────────────────────────────────

function InputTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const show = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, left: Math.max(8, rect.left - 100) });
    }
    setOpen(true);
  };

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => open ? setOpen(false) : show()}
        onMouseEnter={show}
        onMouseLeave={() => setOpen(false)}
        className="text-muted-foreground/40 hover:text-muted-foreground cursor-help"
      >
        <Info size={12} />
      </button>
      {open && createPortal(
        <div
          className="fixed w-64 p-3 rounded-lg bg-popover border border-border shadow-2xl text-[0.7rem] text-muted-foreground leading-relaxed"
          style={{ top: pos.top, left: pos.left, zIndex: 9999 }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          {text}
        </div>,
        document.body
      )}
    </>
  );
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
  // This tool always works in EGP — ignore global currency toggle
  const egpSymbol = isAr ? "ج.م" : "EGP";
  const fmtVal = (egpAmount: number) => `${fmtCompact(egpAmount)} ${egpSymbol}`;

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
  const [depreciationPct, setDepreciationPct] = useState(DEFAULT_DEPRECIATION);
  const [showMethodology, setShowMethodology] = useState(false);

  const capital = CAPITAL_STEPS[capitalIdx] ?? 1_000_000;

  // Build effective returns: prefer Convex, fallback to ASSETS defaults
  const effectiveReturns = useMemo<Record<string, number>>(() => {
    const r: Record<string, number> = {};
    for (const asset of ASSETS) {
      const convexRecord = asset.convexKey ? convexDefaults?.[asset.convexKey] : undefined;
      // Guard: values >100 are prices not rates (e.g., gold_price_egp = 4850)
      const convexValue = convexRecord?.value;
      r[asset.key] = (convexValue !== undefined && convexValue <= 100) ? convexValue : asset.defaultReturn;
    }
    return r;
  }, [convexDefaults]);

  const inflation = useMemo(() => {
    return convexDefaults?.["inflation"]?.value ?? DEFAULT_INFLATION;
  }, [convexDefaults]);

  const exchangeRate = useMemo(() => {
    return convexDefaults?.["exchange_rate"]?.value ?? 50;
  }, [convexDefaults]);

  // Projection data
  const projections = useMemo(() => {
    return projectPortfolio(capital, horizon, allocation, effectiveReturns, inflation, exchangeRate, depreciationPct);
  }, [capital, horizon, allocation, effectiveReturns, inflation, exchangeRate, depreciationPct]);

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
  const finalUsd = projections[projections.length - 1]?.usdTotal ?? capital / exchangeRate;
  const riskScore = calcWeightedVolatility(allocation);
  const cashFinalValue = capital / Math.pow(1 + inflation / 100, horizon);

  // Chart data
  const stackedData = projections.map((p) => {
    const point: Record<string, number> = { year: p.year };
    for (const asset of ASSETS) {
      const egpVal = p.byAsset[asset.key] ?? 0;
      const _usdDivisor = exchangeRate * Math.pow(1 + depreciationPct / 100, p.year);
      point[asset.key] = Math.round(egpVal);
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

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 xl:items-start">

          {/* ─── Config Column (1 col) — sticky on desktop ─────────────── */}
          <div className="xl:col-span-1 xl:sticky xl:top-16 xl:max-h-[calc(100vh-5rem)] xl:overflow-y-auto xl:scrollbar-thin space-y-5">

            {/* Capital */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    {isAr ? "رأس المال" : "Capital"}
                  </p>
                  <InputTooltip text={isAr ? "إجمالي المبلغ المتاح للاستثمار بالجنيه المصري." : "Your total available investment amount in Egyptian Pounds."} />
                </div>
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-1" dir="ltr">
                    <input
                      type="text"
                      inputMode="numeric"
                      defaultValue={fmtNumber(capital)}
                      key={capitalIdx}
                      onBlur={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, "");
                        const num = parseInt(raw) || 0;
                        const clamped = Math.max(50_000, Math.min(50_000_000, num));
                        let closest = 0;
                        for (let i = 0; i < CAPITAL_STEPS.length; i++) {
                          if (Math.abs(CAPITAL_STEPS[i] - clamped) < Math.abs(CAPITAL_STEPS[closest] - clamped)) closest = i;
                        }
                        setCapitalIdx(closest);
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      className="text-2xl font-black text-foreground font-mono bg-transparent border-none outline-none text-center w-44 hover:ring-1 hover:ring-primary/20 focus:ring-1 focus:ring-primary/40 rounded px-2 py-1 transition-all cursor-text"
                      placeholder="1,000,000"
                    />
                    <span className="text-sm text-muted-foreground">{egpSymbol}</span>
                  </div>
                  <p className="text-[0.6rem] text-muted-foreground/40 mt-1">
                    {isAr ? "اضغط للكتابة مباشرة" : "click to type directly"}
                  </p>
                </div>
                <input
                  dir="ltr"
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
                        {fmtCompact(v)}
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
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                      {isAr ? "المدى الزمني" : "Time Horizon"}
                    </p>
                    <InputTooltip text={isAr ? "المدة المخططة للاستثمار. فترات أطول تقلل المخاطر عادة." : "How long you plan to keep your investment. Longer horizons generally reduce risk."} />
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {horizon} {isAr ? "سنة" : "yr"}
                  </Badge>
                </div>
                <input
                  dir="ltr"
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
                    const tipTexts = ASSET_TOOLTIPS[asset.key];
                    return (
                      <div key={asset.key} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: asset.color }} />
                            <span className="text-[0.7rem] text-foreground truncate">
                              {isAr ? asset.nameAr : asset.nameEn}
                            </span>
                            {tipTexts && (
                              <InputTooltip text={isAr ? tipTexts.ar : tipTexts.en} />
                            )}
                            {convexRec && (
                              <SanadBadge
                                sanadLevel={convexRec.sanadLevel}
                                sourceUrl={convexRec.sourceUrl}
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[0.55rem] text-muted-foreground/60 font-mono" title={isAr ? "العائد المتوقع" : "Expected return"}>
                              {isAr ? "عائد" : "ret"} {rate.toFixed(1)}%
                            </span>
                            <Badge
                              className="text-[0.55rem] h-4 px-1.5 font-mono"
                              style={{ background: `${asset.color}22`, color: asset.color, border: `1px solid ${asset.color}44` }}
                              title={isAr ? "نسبة التوزيع" : "Allocation %"}
                            >
                              {pct}%
                            </Badge>
                          </div>
                        </div>
                        <input
                          dir="ltr"
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

            {/* EGP Depreciation */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                      {isAr ? "انخفاض الجنيه / سنة" : "EGP Depreciation / yr"}
                    </p>
                    <InputTooltip text={isAr ? "مقدار انخفاض الجنيه أمام الدولار سنوياً. تاريخياً: ~7-15% منذ 2022." : "How much EGP loses against USD annually. Historical: ~7-15%/year since 2022."} />
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {depreciationPct}%
                  </Badge>
                </div>
                <input
                  dir="ltr"
                  type="range"
                  min={0}
                  max={30}
                  step={1}
                  value={depreciationPct}
                  onChange={(e) => setDepreciationPct(parseInt(e.target.value))}
                  className="w-full accent-[#C9A84C] cursor-pointer"
                />
                <div className="flex justify-between text-[0.625rem] text-muted-foreground font-mono" dir="ltr">
                  <span>0%</span>
                  <span>30%</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─── Results Columns (3 cols) ───────────────────────────────── */}
          <div className="xl:col-span-3 space-y-6 min-w-0">

            {/* Hero Result — sticky on mobile so users see changes while adjusting controls */}
            <motion.div
              className="xl:static"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-card/80 to-card/60 backdrop-blur-sm overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                      {isAr ? "القيمة المتوقعة" : "Projected Value"}
                    </p>
                    <p className="text-xs text-muted-foreground ms-auto">
                      {isAr
                        ? `بعد ${horizon} سنة — من أصل ${fmtVal(capital)}`
                        : `in ${horizon} years — from ${fmtVal(capital)}`}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" dir="ltr">
                    {/* Nominal */}
                    <div className="text-start">
                      <div className="flex items-center gap-1 mb-1">
                        <p className="text-[0.65rem] text-muted-foreground uppercase tracking-wider">
                          {isAr ? "القيمة الاسمية" : "Nominal"}
                        </p>
                        <InputTooltip text={isAr
                          ? "المبلغ الذي ستراه في حسابك — قبل احتساب تأثير التضخم وارتفاع الأسعار."
                          : "The amount you'll see in your account — before accounting for inflation and rising prices."
                        } />
                      </div>
                      <motion.p
                        key={finalValue}
                        initial={{ opacity: 0.5, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="text-2xl font-black text-primary font-mono"
                      >
                        {fmtVal(finalValue)}
                      </motion.p>
                      <p className="text-[0.6rem] text-muted-foreground/60 mt-1">
                        {finalValue > 0
                          ? (isAr
                            ? `نمو ${(finalValue / capital).toFixed(1)} ضعف`
                            : `${(finalValue / capital).toFixed(1)}x growth`)
                          : "—"}
                      </p>
                    </div>

                    {/* Real (inflation-adjusted) */}
                    <div className="text-start">
                      <div className="flex items-center gap-1 mb-1">
                        <p className="text-[0.65rem] text-muted-foreground uppercase tracking-wider">
                          {isAr ? "القوة الشرائية" : "Purchasing Power"}
                        </p>
                        <InputTooltip text={isAr
                          ? "القيمة الحقيقية بعد خصم تأثير التضخم — كم يمكنك شراؤه فعلاً بهذا المبلغ مقارنة باليوم."
                          : "Value after removing inflation — how much you can actually buy compared to today."
                        } />
                      </div>
                      <p className="text-2xl font-black text-foreground font-mono">
                        {fmtVal(finalReal)}
                      </p>
                      <p className="text-[0.6rem] text-muted-foreground/60 mt-1">
                        {isAr ? "بجنيه اليوم" : "in today's EGP"}
                      </p>
                    </div>

                    {/* USD equivalent — always shown as comparison */}
                    {exchangeRate > 0 && (
                      <div className="text-start">
                        <div className="flex items-center gap-1 mb-1">
                          <p className="text-[0.65rem] text-muted-foreground uppercase tracking-wider">
                            {isAr ? "بالدولار" : "In USD"}
                          </p>
                          <InputTooltip text={isAr
                            ? `بافتراض انخفاض الجنيه ${depreciationPct}% سنوياً. حرّك شريط "انخفاض الجنيه" لتغيير هذا.`
                            : `Assuming ${depreciationPct}% EGP depreciation/year. Adjust the depreciation slider to change this.`
                          } />
                        </div>
                        <motion.p
                          key={`usd-${finalUsd}-${depreciationPct}`}
                          initial={{ opacity: 0.5 }}
                          animate={{ opacity: 1 }}
                          className="text-2xl font-black text-foreground font-mono"
                        >
                          ${fmtCompact(finalUsd)}
                        </motion.p>
                        <p className="text-[0.6rem] text-muted-foreground/60 mt-1">
                          {isAr ? "بسعر صرف متوقع" : "at projected rate"}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Stacked Area Chart */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    {isAr ? "نمو المحفظة عبر الزمن" : "Portfolio Growth Over Time"}
                  </p>
                </div>
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
                    ? `ماذا لو استثمرت ${fmtVal(capital)} في كل أصل بشكل منفرد؟`
                    : `What if you put ${fmtVal(capital)} 100% in each asset?`}
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
                            {pct > 0 ? fmtVal(finalAssetValue) : "—"}
                          </p>
                          <p className="text-[0.6rem] text-muted-foreground">
                            EGP / {horizon}{isAr ? "ي" : "y"}
                          </p>
                          {pct > 0 && (
                            <p className="text-[0.58rem] text-muted-foreground/60 font-mono" dir="ltr">
                              ≈ ${fmtCompact(finalAssetValue / (exchangeRate * Math.pow(1 + depreciationPct / 100, horizon)))} USD
                            </p>
                          )}
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
                        ? `بسبب معدل التضخم ${inflation.toFixed(1)}%، ستتقلص قيمة ${fmtVal(capital)} إلى ${fmtVal(cashFinalValue)} (بالقيمة الشرائية) خلال ${horizon} سنة — أي خسارة ${fmtVal(capital - cashFinalValue)}.`
                        : `At ${inflation.toFixed(1)}% inflation, ${fmtVal(capital)} in cash loses purchasing power, becoming equivalent to only ${fmtVal(cashFinalValue)} over ${horizon} years — a loss of ${fmtVal(capital - cashFinalValue)}.`}
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

            {/* Currency Warning */}
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground mb-1">
                      {isAr ? "ملاحظة العملة" : "Currency Note"}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {isAr
                        ? "عوائد S&P 500 وMSCI EM هي بالدولار الأمريكي أصلاً. عند تحويلها للجنيه، قد تبدو أعلى بسبب انخفاض الجنيه، لكن قوتك الشرائية الفعلية بالدولار قد تختلف."
                        : "S&P 500 and MSCI returns are in USD. When converted to EGP, they may appear higher due to EGP depreciation, but your actual purchasing power in USD terms may differ."}
                    </p>
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

            {/* Methodology Section */}
            <div className="mt-10 border-t border-border pt-8">
              <button
                onClick={() => setShowMethodology((v) => !v)}
                className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group"
              >
                <BookOpen size={14} />
                <span>{isAr ? "المنهجية والافتراضات" : "Methodology & Assumptions"}</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${showMethodology ? "rotate-180" : ""}`}
                />
              </button>

              {showMethodology && (
                <div className="mt-4 space-y-5 text-xs text-muted-foreground leading-relaxed">

                  <div>
                    <h4 className="font-semibold text-foreground mb-1">
                      {isAr ? "صيغة الحساب" : "Projection Formula"}
                    </h4>
                    <p className="font-mono text-[0.7rem] bg-muted/30 p-2 rounded">FV = PV × (1 + r)^n</p>
                    <p className="mt-1">{isAr ? "المحفظة = Σ(التوزيع × رأس المال × (1 + العائد)^سنة)" : "Portfolio = Σ(allocation_i × capital × (1 + return_i)^year)"}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-1">
                      {isAr ? "تعديل التضخم" : "Inflation Adjustment"}
                    </h4>
                    <p className="font-mono text-[0.7rem] bg-muted/30 p-2 rounded">Real value = Nominal / (1 + inflation)^year</p>
                    <p className="mt-1">{isAr ? "باستخدام أحدث بيانات CPI من CAPMAS / البنك الدولي." : "Using latest CPI data from CAPMAS / World Bank."}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-1">
                      {isAr ? "مؤشر المخاطر" : "Risk Score"}
                    </h4>
                    <p>{isAr ? "متوسط مرجح للتقلب التاريخي (الانحراف المعياري للعوائد السنوية)." : "Weighted average of historical volatility (standard deviation of annual returns)."}</p>
                    <p className="mt-1">{isAr ? "المقياس: 0% (شهادات فقط) إلى 100% (أسهم فقط)." : "Scale: 0% (all CDs) to 100% (all stocks)."}</p>
                    <p className="mt-1 font-mono text-[0.65rem] bg-muted/30 p-2 rounded leading-loose">
                      CDs 2% · T-bills 3% · Real Estate 12% · S&P 500 15% · Gold 18% · MSCI EM 20% · EGX 30 25%
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-1">
                      {isAr ? "ملاحظات العملة" : "Currency Considerations"}
                    </h4>
                    <p>{isAr ? "عوائد S&P 500 وMSCI EM هي بالدولار أصلاً. الذهب مسعّر بالدولار عالمياً." : "S&P 500 and MSCI EM returns are originally in USD. Gold is priced in USD globally."}</p>
                    <p className="mt-1">{isAr ? "العوائد المحسوبة بالجنيه لهذه الأصول تشمل أثر انخفاض الجنيه." : "EGP-denominated returns for these assets include the effect of EGP depreciation."}</p>
                    <p className="mt-1">{isAr ? "الشهادات البنكية وأذون الخزانة أدوات جنيه بحتة — لا تستفيد من تحركات العملة." : "Bank CDs and T-bills are pure EGP instruments — their returns do not benefit from currency movement."}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-1">
                      {isAr ? "مصادر معدلات العائد" : "Return Rate Sources"}
                    </h4>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>{isAr ? "EGX 30: البورصة المصرية (egx.com.eg) — عوائد المؤشر التاريخية" : "EGX 30: Egyptian Exchange (egx.com.eg) — historical index returns"}</li>
                      <li>{isAr ? "العقارات: تقديرات السوق من عقارماب وبيانات CAPMAS" : "Real Estate: Market estimates from Aqarmap and CAPMAS housing data"}</li>
                      <li>{isAr ? "الشهادات البنكية: سعر الفائدة البنكية للبنك المركزي المصري" : "Bank CDs: Central Bank of Egypt overnight deposit rate"}</li>
                      <li>{isAr ? "أذون الخزانة: نتائج مزاد أذون 91 يوم لدى البنك المركزي" : "T-bills: CBE 91-day T-bill auction results"}</li>
                      <li>{isAr ? "الذهب: سعر الذهب الدولي × سعر صرف الدولار/الجنيه" : "Gold: International gold price × USD/EGP exchange rate"}</li>
                      <li>{isAr ? "S&P 500: إجمالي العائد التاريخي (FRED)" : "S&P 500: Historical S&P 500 total return (FRED)"}</li>
                      <li>{isAr ? "MSCI EM: مؤشر MSCI للأسواق الناشئة (MSCI.com)" : "MSCI EM: MSCI Emerging Markets Index (MSCI.com)"}</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-1">
                      {isAr ? "الافتراضات الرئيسية" : "Key Assumptions"}
                    </h4>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>{isAr ? "العوائد مركّبة سنوياً، وليس شهرياً." : "Returns are compounded annually, not monthly."}</li>
                      <li>{isAr ? "لا تشمل تكاليف المعاملات أو الضرائب أو الرسوم." : "No transaction costs, taxes, or fees included."}</li>
                      <li>{isAr ? "الأداء السابق لا يضمن الأداء المستقبلي." : "Past performance does not guarantee future results."}</li>
                      <li>{isAr ? "لا يوجد إعادة توازن — يبقى التوزيع الأولي ثابتاً." : "No rebalancing — initial allocation stays fixed."}</li>
                      <li>{isAr ? "عوائد العقارات اسمية (قبل التضخم)." : "Real estate returns are nominal (before inflation)."}</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                    <h4 className="font-semibold text-foreground mb-1">
                      {isAr ? "إخلاء المسؤولية" : "Disclaimer"}
                    </h4>
                    <p>{isAr ? "هذا المحاكي للأغراض التعليمية فقط ولا يعتبر نصيحة استثمارية. العوائد الفعلية قد تختلف. استشر مستشاراً مالياً مرخصاً قبل اتخاذ قرارات استثمارية." : "This simulator is for educational purposes only. It does not constitute investment advice. Actual returns will vary. Consult a licensed financial advisor before making investment decisions."}</p>
                  </div>
                </div>
              )}
            </div>

            <DataSourceFooter category="economy" />
          </div>
        </div>
      </div>
    </div>
  );
}
