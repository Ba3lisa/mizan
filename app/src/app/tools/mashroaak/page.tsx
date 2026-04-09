"use client";

import { useState } from "react";
// usePersistedState removed — causes hydration mismatches with SSR
import { useQuery } from "convex/react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";
import { useLanguage } from "@/components/providers";
// All values in EGP — no currency conversion in this tool
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SanadBadge } from "@/components/sanad-badge";
import { DataSourceFooter } from "@/components/data-source";
import { DesktopNotice } from "@/components/desktop-notice";
import { AdjustableSlider } from "@/components/adjustable-slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Briefcase,
  MapPin,
  Maximize2,
  ArrowLeft,
  Search,
  Building2,
  Layers,
  Globe,
  Users,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Opportunity {
  _id: string;
  externalId: string;
  source: "ida" | "gafi";
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  sector: string;
  sectorAr?: string;
  sectorEn?: string;
  governorate?: string;
  governorateAr?: string;
  type: "industrial_unit" | "land_plot" | "major_opportunity" | "free_zone" | "investment_zone" | "sme_program";
  costEgp?: number;
  costUsd?: number;
  unitAreaSqm?: number;
  landAreaSqm?: number;
  pricePerSqmEgp?: number;
  status?: "available" | "under_development" | "reserved" | "unknown";
  sourceUrl: string;
  sanadLevel: number;
  lastScrapedAt: number;
}

interface OpportunityDetail extends Opportunity {
  detail?: {
    landCostEgp?: number;
    constructionCostEgp?: number;
    equipmentCostEgp?: number;
    laborCostEgp?: number;
    licensingFeesEgp?: number;
    workingCapitalEgp?: number;
    expectedRevenueEgp?: number;
    expectedProfitMarginPct?: number;
    paybackPeriodYears?: number;
    employeesNeeded?: number;
    incentivesAr?: string;
    incentivesEn?: string;
    licensingStepsAr?: string;
    licensingStepsEn?: string;
  };
}

interface Stats {
  total: number;
  byType: Record<string, number>;
  bySector: Record<string, number>;
  byGovernorate: Record<string, number>;
  bySource: Record<string, number>;
  sectors: string[];
  governorates: string[];
  costRange: { min: number; max: number };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTOR_LABELS: Record<string, { en: string; ar: string }> = {
  food_processing: { en: "Food Processing", ar: "صناعات غذائية" },
  chemicals: { en: "Chemicals", ar: "كيماويات" },
  textiles: { en: "Textiles", ar: "منسوجات" },
  engineering: { en: "Engineering", ar: "هندسية" },
  building_materials: { en: "Building Materials", ar: "مواد بناء" },
  pharmaceuticals: { en: "Pharmaceuticals", ar: "أدوية" },
  metallurgy: { en: "Metallurgy", ar: "تعدين" },
  woodworking: { en: "Woodworking", ar: "أخشاب" },
  food: { en: "Food", ar: "غذائية" },
  small_industries: { en: "Small Industries", ar: "صناعات صغيرة" },
  plastics_industries: { en: "Plastics", ar: "بلاستيك" },
  mixed_industries: { en: "Mixed Industries", ar: "صناعات متنوعة" },
  other: { en: "Other", ar: "أخرى" },
};

const TYPE_LABELS: Record<string, { en: string; ar: string }> = {
  industrial_unit: { en: "Industrial Unit", ar: "وحدة صناعية" },
  land_plot: { en: "Land Plot", ar: "قطعة أرض" },
  major_opportunity: { en: "Major Opportunity", ar: "فرصة كبرى" },
  free_zone: { en: "Free Zone", ar: "منطقة حرة" },
  investment_zone: { en: "Investment Zone", ar: "منطقة استثمارية" },
  sme_program: { en: "SME Program", ar: "برنامج المشروعات الصغيرة" },
};

const SECTOR_COLORS: Record<string, string> = {
  food_processing: "#f97316",
  chemicals: "#8b5cf6",
  textiles: "#ec4899",
  engineering: "#3b82f6",
  building_materials: "#78716c",
  pharmaceuticals: "#10b981",
  metallurgy: "#64748b",
  woodworking: "#a16207",
  other: "#6b7280",
};

const COST_BREAKDOWN_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4"];

const CAPITAL_PRESETS = [
  { label: "500K", value: 500_000 },
  { label: "1M", value: 1_000_000 },
  { label: "5M", value: 5_000_000 },
  { label: "50M", value: 50_000_000 },
  { label: "500M", value: 500_000_000 },
  { label: "1B", value: 1_000_000_000 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatArea(sqm?: number): string {
  if (!sqm) return "—";
  if (sqm >= 10_000) return `${(sqm / 10_000).toFixed(1)} ha`;
  return `${sqm.toLocaleString()} m²`;
}

function getSectorLabel(sector: string, isAr: boolean): string {
  const entry = SECTOR_LABELS[sector];
  if (entry) return isAr ? entry.ar : entry.en;
  return sector;
}

function getTypeLabel(type: string, isAr: boolean): string {
  const entry = TYPE_LABELS[type];
  if (entry) return isAr ? entry.ar : entry.en;
  return type;
}

// ─── Card animations ──────────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

// ─── OpportunityCard ──────────────────────────────────────────────────────────

interface OpportunityCardProps {
  opp: Opportunity;
  isAr: boolean;
  onSelect: (id: string) => void;
  fmt: (v: number, opts?: { decimals?: number; compact?: boolean }) => string;
  fromEGP: (egp: number) => number;
  symbol: string;
}

function OpportunityCard({ opp, isAr, onSelect, fmt, fromEGP, symbol }: OpportunityCardProps) {
  const sectorColor = SECTOR_COLORS[opp.sector] ?? "#6b7280";
  const name = isAr ? opp.nameAr : opp.nameEn;
  const rawArea = opp.unitAreaSqm ?? opp.landAreaSqm;
  const area = rawArea && Number.isFinite(rawArea) ? rawArea : undefined;

  return (
    <motion.div variants={cardVariants}>
      <Card
        className="group cursor-pointer border border-border/50 hover:border-amber-500/40 hover:shadow-md hover:shadow-amber-500/5 transition-all duration-200 bg-card/60 hover:bg-card"
        onClick={() => onSelect(opp._id)}
      >
        <CardContent className="p-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <p className="text-sm font-medium leading-tight text-foreground line-clamp-2 flex-1">{name}</p>
            <div className="flex items-center gap-1 shrink-0">
              <SanadBadge sanadLevel={opp.sanadLevel} sourceUrl={opp.sourceUrl} />
            </div>
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <Badge
              variant="secondary"
              className="text-[0.6rem] px-1.5 py-0 font-normal"
              style={{ backgroundColor: sectorColor + "22", color: sectorColor, borderColor: sectorColor + "44" }}
            >
              {getSectorLabel(opp.sector, isAr)}
            </Badge>
            <Badge variant="outline" className="text-[0.6rem] px-1.5 py-0 font-normal text-muted-foreground">
              {getTypeLabel(opp.type, isAr)}
            </Badge>
            {opp.status && opp.status !== "unknown" && (
              <Badge
                variant="outline"
                className={
                  opp.status === "available"
                    ? "text-[0.6rem] px-1.5 py-0 font-normal border-emerald-500/40 text-emerald-500"
                    : opp.status === "under_development"
                    ? "text-[0.6rem] px-1.5 py-0 font-normal border-yellow-500/40 text-yellow-500"
                    : "text-[0.6rem] px-1.5 py-0 font-normal border-red-500/40 text-red-500"
                }
              >
                {opp.status === "available"
                  ? isAr ? "متاح" : "Available"
                  : opp.status === "under_development"
                  ? isAr ? "قيد التطوير" : "In Development"
                  : isAr ? "محجوز" : "Reserved"}
              </Badge>
            )}
          </div>

          {/* Info row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {opp.governorate && (
              <span className="flex items-center gap-1">
                <MapPin size={10} />
                {isAr ? (opp.governorateAr ?? opp.governorate) : opp.governorate}
              </span>
            )}
            {area && (
              <span className="flex items-center gap-1">
                <Maximize2 size={10} />
                {formatArea(area)}
              </span>
            )}
          </div>

          {/* Cost */}
          <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
            <div>
              {opp.costEgp ? (
                <p className="text-sm font-semibold text-amber-500">
                  {symbol} {fmt(fromEGP(opp.costEgp), { compact: true })}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">{isAr ? "السعر غير محدد" : "Price TBD"}</p>
              )}
            </div>
            <Badge
              className={
                opp.source === "ida"
                  ? "text-[0.6rem] px-1.5 py-0 bg-blue-500/10 text-blue-400 border-blue-500/20"
                  : "text-[0.6rem] px-1.5 py-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              }
              variant="outline"
            >
              {opp.source.toUpperCase()}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ isAr }: { isAr: boolean }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
      <Briefcase size={40} className="text-muted-foreground/30 mb-4" />
      <p className="text-sm text-muted-foreground">
        {isAr
          ? "لا توجد فرص استثمارية متاحة حالياً — سيتم تحديث البيانات تلقائياً."
          : "No investment opportunities yet — data will be updated automatically."}
      </p>
    </div>
  );
}

// ─── LoadingGrid ──────────────────────────────────────────────────────────────

function LoadingGrid() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-44 rounded-xl bg-muted/30 animate-pulse" />
      ))}
    </>
  );
}

// ─── ResultsGrid ──────────────────────────────────────────────────────────────

interface ResultsGridProps {
  opportunities: Opportunity[] | undefined;
  isAr: boolean;
  onSelect: (id: string) => void;
  fmt: (v: number, opts?: { decimals?: number; compact?: boolean }) => string;
  fromEGP: (egp: number) => number;
  symbol: string;
}

function ResultsGrid({ opportunities, isAr, onSelect, fmt, fromEGP, symbol }: ResultsGridProps) {
  if (opportunities === undefined) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <LoadingGrid />
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div className="grid grid-cols-1">
        <EmptyState isAr={isAr} />
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {opportunities.map((opp) => (
        <OpportunityCard
          key={opp._id}
          opp={opp}
          isAr={isAr}
          onSelect={onSelect}
          fmt={fmt}
          fromEGP={fromEGP}
          symbol={symbol}
        />
      ))}
    </motion.div>
  );
}

// ─── CapitalMatcherTab ────────────────────────────────────────────────────────

interface CapitalMatcherTabProps {
  isAr: boolean;
  onSelect: (id: string, fromTab: string) => void;
  fmt: (v: number, opts?: { decimals?: number; compact?: boolean }) => string;
  fromEGP: (egp: number) => number;
  symbol: string;
  stats: Stats | undefined;
  inferredContext?: string | null;
}

function CapitalMatcherTab({ isAr, onSelect, fmt, fromEGP, symbol, stats }: CapitalMatcherTabProps) {
  const [capital, setCapital] = useState(1_000_000);
  const [sector, setSector] = useState("");
  const [governorate, setGovernorate] = useState("");

  const opportunities = useQuery(api.industry.getByCapitalRange, {
    maxCost: capital,
    minCost: 0,
    ...(sector ? { sector } : {}),
    ...(governorate ? { governorate } : {}),
    limit: 30,
  });

  const selectClass =
    "text-xs rounded-md border border-border bg-background px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500/50 min-w-0";

  return (
    <div className="space-y-5">
      {/* Capital input */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {isAr ? "رأس المال المتاح" : "Available Capital"}
            </p>
            <p className="text-lg font-bold text-amber-500">
              EGP {fmt(capital, { compact: true })}
            </p>
          </div>
          <AdjustableSlider
            value={capital}
            onChange={setCapital}
            defaultMin={100_000}
            defaultMax={5_000_000_000}
            step={100_000}
            accentColor="#f59e0b"
            formatLabel={(v) => v >= 1_000_000_000 ? `${(v / 1_000_000_000).toFixed(1)}B` : `${(v / 1_000_000).toFixed(1)}M`}
          />
          {/* Quick presets */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {CAPITAL_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setCapital(p.value)}
                className={`text-[0.65rem] px-2 py-0.5 rounded border font-mono transition-all ${
                  capital === p.value
                    ? "border-amber-500 bg-amber-500/15 text-amber-500"
                    : "border-border text-muted-foreground hover:border-amber-500/40 hover:text-amber-500/80"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <p className="text-xs text-muted-foreground">
          {isAr ? "تصفية:" : "Filter:"}
        </p>
        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className={selectClass}
          dir={isAr ? "rtl" : "ltr"}
        >
          <option value="">{isAr ? "كل القطاعات" : "All Sectors"}</option>
          {(stats?.sectors ?? []).map((s) => (
            <option key={s} value={s}>{getSectorLabel(s, isAr)}</option>
          ))}
        </select>
        <select
          value={governorate}
          onChange={(e) => setGovernorate(e.target.value)}
          className={selectClass}
          dir={isAr ? "rtl" : "ltr"}
        >
          <option value="">{isAr ? "كل المحافظات" : "All Governorates"}</option>
          {(stats?.governorates ?? []).map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      {opportunities !== undefined && opportunities.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {isAr
            ? `${opportunities.length} فرصة استثمارية بحد أقصى EGP ${fmt(capital, { compact: true })}`
            : `${opportunities.length} opportunities within EGP ${fmt(capital, { compact: true })}`}
        </p>
      )}

      {/* Results */}
      <ResultsGrid
        opportunities={opportunities as Opportunity[] | undefined}
        isAr={isAr}
        onSelect={(id) => onSelect(id, "matcher")}
        fmt={fmt}
        fromEGP={fromEGP}
        symbol={symbol}
      />
    </div>
  );
}

// ─── ProjectExplorerTab ───────────────────────────────────────────────────────

interface ProjectExplorerTabProps {
  isAr: boolean;
  onSelect: (id: string, fromTab: string) => void;
  fmt: (v: number, opts?: { decimals?: number; compact?: boolean }) => string;
  fromEGP: (egp: number) => number;
  symbol: string;
  stats: Stats | undefined;
}

function ProjectExplorerTab({ isAr, onSelect, fmt, fromEGP, symbol, stats }: ProjectExplorerTabProps) {
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [type, setType] = useState("");
  const [source, setSource] = useState("");

  const searchResults = useQuery(
    api.industry.searchOpportunities,
    search.trim().length >= 2
      ? {
          searchQuery: search.trim(),
          ...(sector ? { sector } : {}),
          ...(governorate ? { governorate } : {}),
          ...(type ? { type } : {}),
          limit: 30,
        }
      : "skip"
  );

  const filterResults = useQuery(
    api.industry.getByFilters,
    search.trim().length < 2
      ? {
          ...(sector ? { sector } : {}),
          ...(governorate ? { governorate } : {}),
          ...(type ? { type } : {}),
          ...(source === "ida" || source === "gafi" ? { source } : {}),
          limit: 30,
        }
      : "skip"
  );

  const opportunities = search.trim().length >= 2 ? searchResults : filterResults;

  const selectClass =
    "text-xs rounded-md border border-border bg-background px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500/50 min-w-0";

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isAr ? "ابحث عن مشروع..." : "Search projects..."}
          className="pl-8 text-sm bg-background/60"
          dir={isAr ? "rtl" : "ltr"}
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className={selectClass}
          dir={isAr ? "rtl" : "ltr"}
        >
          <option value="">{isAr ? "كل القطاعات" : "All Sectors"}</option>
          {(stats?.sectors ?? []).map((s) => (
            <option key={s} value={s}>{getSectorLabel(s, isAr)}</option>
          ))}
        </select>
        <select
          value={governorate}
          onChange={(e) => setGovernorate(e.target.value)}
          className={selectClass}
          dir={isAr ? "rtl" : "ltr"}
        >
          <option value="">{isAr ? "كل المحافظات" : "All Governorates"}</option>
          {(stats?.governorates ?? []).map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={selectClass}
          dir={isAr ? "rtl" : "ltr"}
        >
          <option value="">{isAr ? "كل الأنواع" : "All Types"}</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{isAr ? v.ar : v.en}</option>
          ))}
        </select>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className={selectClass}
          dir={isAr ? "rtl" : "ltr"}
        >
          <option value="">{isAr ? "كل المصادر" : "All Sources"}</option>
          <option value="ida">IDA</option>
          <option value="gafi">GAFI</option>
        </select>
      </div>

      {/* Results */}
      <ResultsGrid
        opportunities={opportunities as Opportunity[] | undefined}
        isAr={isAr}
        onSelect={(id) => onSelect(id, "explorer")}
        fmt={fmt}
        fromEGP={fromEGP}
        symbol={symbol}
      />
    </div>
  );
}

// ─── CostBreakdownChart ───────────────────────────────────────────────────────

interface CostEntry {
  name: string;
  value: number;
}

interface CostBreakdownChartProps {
  data: CostEntry[];
  isAr: boolean;
  fmt: (v: number, opts?: { decimals?: number; compact?: boolean }) => string;
  fromEGP: (egp: number) => number;
  symbol: string;
}

function CostBreakdownChart({ data, isAr, fmt, fromEGP, symbol }: CostBreakdownChartProps) {
  const chartData = data.filter((d) => d.value > 0);
  if (chartData.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {isAr ? "تفاصيل التكاليف" : "Cost Breakdown"}
      </p>
      <div className="flex gap-4 items-center">
        <ResponsiveContainer width={120} height={120}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={30}
              outerRadius={55}
              strokeWidth={1}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={COST_BREAKDOWN_COLORS[i % COST_BREAKDOWN_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [`${symbol} ${fmt(fromEGP(Number(value)), { compact: true })}`, ""]}
              contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-1.5 flex-1">
          {chartData.map((d, i) => (
            <div key={d.name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: COST_BREAKDOWN_COLORS[i % COST_BREAKDOWN_COLORS.length] }}
                />
                <span className="text-[0.65rem] text-muted-foreground">{d.name}</span>
              </div>
              <span className="text-[0.65rem] font-mono text-foreground">
                {symbol} {fmt(fromEGP(d.value), { compact: true })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ProjectDetailTab ─────────────────────────────────────────────────────────

interface ProjectDetailTabProps {
  projectId: string;
  isAr: boolean;
  onBack: () => void;
  fmt: (v: number, opts?: { decimals?: number; compact?: boolean }) => string;
  fromEGP: (egp: number) => number;
  symbol: string;
}

function ProjectDetailTab({ projectId, isAr, onBack, fmt, fromEGP, symbol }: ProjectDetailTabProps) {
  // Cast string to Convex Id — the value is always a valid Id from the query results
  const result = useQuery(api.industry.getProjectDetail, {
    opportunityId: projectId as Id<"investmentOpportunities">,
  });

  if (result === undefined) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-muted/40 rounded w-1/2" />
        <div className="h-32 bg-muted/30 rounded" />
        <div className="h-48 bg-muted/30 rounded" />
      </div>
    );
  }

  if (result === null) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">
          {isAr ? "المشروع غير موجود." : "Project not found."}
        </p>
        <button onClick={onBack} className="mt-4 text-xs text-amber-500 hover:underline">
          {isAr ? "رجوع" : "Go back"}
        </button>
      </div>
    );
  }

  const opp = result as OpportunityDetail;
  const detail = opp.detail;
  const name = isAr ? opp.nameAr : opp.nameEn;
  const sectorColor = SECTOR_COLORS[opp.sector] ?? "#6b7280";

  const costEntries: CostEntry[] = [
    { name: isAr ? "تكلفة الأرض" : "Land", value: detail?.landCostEgp ?? 0 },
    { name: isAr ? "الإنشاءات" : "Construction", value: detail?.constructionCostEgp ?? 0 },
    { name: isAr ? "المعدات" : "Equipment", value: detail?.equipmentCostEgp ?? 0 },
    { name: isAr ? "العمالة" : "Labor", value: detail?.laborCostEgp ?? 0 },
    { name: isAr ? "رسوم الترخيص" : "Licensing", value: detail?.licensingFeesEgp ?? 0 },
    { name: isAr ? "رأس المال العامل" : "Working Capital", value: detail?.workingCapitalEgp ?? 0 },
  ];

  return (
    <motion.div
      className="space-y-5"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-amber-500 transition-colors"
      >
        <ArrowLeft size={12} />
        {isAr ? "رجوع إلى النتائج" : "Back to results"}
      </button>

      {/* Project header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="secondary"
            className="text-[0.6rem] px-1.5 py-0"
            style={{ backgroundColor: sectorColor + "22", color: sectorColor, borderColor: sectorColor + "44" }}
          >
            {getSectorLabel(opp.sector, isAr)}
          </Badge>
          <Badge
            className={
              opp.source === "ida"
                ? "text-[0.6rem] px-1.5 py-0 bg-blue-500/10 text-blue-400 border-blue-500/20"
                : "text-[0.6rem] px-1.5 py-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            }
            variant="outline"
          >
            {opp.source.toUpperCase()}
          </Badge>
          <SanadBadge sanadLevel={opp.sanadLevel} sourceUrl={opp.sourceUrl} showLabel />
        </div>
        <h2 className="text-lg font-semibold text-foreground">{name}</h2>
        {opp.governorate && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin size={11} />
            {isAr ? (opp.governorateAr ?? opp.governorate) : opp.governorate}
          </p>
        )}
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {opp.costEgp != null && opp.costEgp > 0 && (
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-3">
              <p className="text-[0.6rem] text-muted-foreground uppercase tracking-wide mb-1">
                {isAr ? "التكلفة الإجمالية" : "Total Cost"}
              </p>
              <p className="text-sm font-bold text-amber-500">
                {symbol} {fmt(fromEGP(opp.costEgp), { compact: true })}
              </p>
            </CardContent>
          </Card>
        )}
        {(opp.unitAreaSqm ?? opp.landAreaSqm) != null && (opp.unitAreaSqm ?? opp.landAreaSqm)! > 0 && (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-3">
              <p className="text-[0.6rem] text-muted-foreground uppercase tracking-wide mb-1">
                {isAr ? "المساحة" : "Area"}
              </p>
              <p className="text-sm font-bold text-foreground">
                {formatArea(opp.unitAreaSqm ?? opp.landAreaSqm)}
              </p>
            </CardContent>
          </Card>
        )}
        {detail?.employeesNeeded && (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-3">
              <p className="text-[0.6rem] text-muted-foreground uppercase tracking-wide mb-1">
                {isAr ? "العمالة" : "Employees"}
              </p>
              <p className="text-sm font-bold text-foreground flex items-center gap-1">
                <Users size={12} className="text-muted-foreground" />
                {detail.employeesNeeded.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        )}
        {detail?.paybackPeriodYears && (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-3">
              <p className="text-[0.6rem] text-muted-foreground uppercase tracking-wide mb-1">
                {isAr ? "فترة الاسترداد" : "Payback Period"}
              </p>
              <p className="text-sm font-bold text-foreground">
                {detail.paybackPeriodYears} {isAr ? "سنوات" : "yrs"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Cost breakdown */}
      {detail && costEntries.some((e) => e.value > 0) && (
        <Card className="border-border/50">
          <CardContent className="p-4">
            <CostBreakdownChart
              data={costEntries}
              isAr={isAr}
              fmt={fmt}
              fromEGP={fromEGP}
              symbol={symbol}
            />
            {detail.expectedProfitMarginPct && (
              <div className="mt-3 pt-3 border-t border-border/40 flex flex-wrap gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">{isAr ? "هامش الربح المتوقع: " : "Expected Margin: "}</span>
                  <span className="font-semibold text-emerald-500">{detail.expectedProfitMarginPct}%</span>
                </div>
                {detail.expectedRevenueEgp && (
                  <div>
                    <span className="text-muted-foreground">{isAr ? "الإيرادات المتوقعة: " : "Expected Revenue: "}</span>
                    <span className="font-semibold">{symbol} {fmt(fromEGP(detail.expectedRevenueEgp), { compact: true })}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Incentives */}
      {detail && (detail.incentivesEn ?? detail.incentivesAr) && (
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-1">
            {(() => {
              // Always use English incentives — Arabic pipeline output mixes languages badly
              const text = detail.incentivesEn ?? detail.incentivesAr ?? "";
              const isMethodology = text.toLowerCase().includes("estimation methodology") || text.includes("منهجية التقدير");
              return (
                <>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {isMethodology
                      ? (isAr ? "منهجية تقدير التكلفة" : "Cost Estimation Methodology")
                      : (isAr ? "الحوافز الاستثمارية" : "Investment Incentives")}
                  </p>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                    {text.replace(/^(Estimation methodology:|منهجية التقدير:)\s*/i, "")}
                  </p>
                  {isMethodology && (
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      {isAr ? "* تقدير ذكاء اصطناعي — ليس سعرًا رسميًا" : "* AI estimate — not an official price"}
                    </p>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Licensing steps */}
      {detail && (detail.licensingStepsEn ?? detail.licensingStepsAr) && (() => {
        // Prefer English licensing data — Arabic has same JSON structure with Arabic titleAr fields inside
        const raw = detail.licensingStepsEn ?? detail.licensingStepsAr ?? "";
        let steps: Array<{ step?: number; titleEn?: string; titleAr?: string; description?: string; estimatedDays?: number; estimatedFeeEgp?: number }> = [];
        try { steps = JSON.parse(raw); } catch { /* not JSON, show as text */ }

        return (
          <Card className="border-border/50">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {isAr ? "خطوات الترخيص" : "Licensing Steps"}
              </p>
              {steps.length > 0 ? (
                <div className="space-y-2">
                  {steps.map((s, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold shrink-0 mt-0.5">
                        {s.step ?? i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {isAr ? (s.titleAr ?? s.titleEn) : (s.titleEn ?? s.titleAr)}
                        </p>
                        {s.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                        )}
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          {s.estimatedDays != null && (
                            <span>{isAr ? `~${s.estimatedDays} يوم` : `~${s.estimatedDays} days`}</span>
                          )}
                          {s.estimatedFeeEgp != null && s.estimatedFeeEgp > 0 && (
                            <span>EGP {fmt(s.estimatedFeeEgp, { compact: true })}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{raw}</p>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Source link */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Globe size={11} />
        <a
          href={opp.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-amber-500 transition-colors hover:underline"
        >
          {isAr ? "عرض المصدر الرسمي" : "View official source"}
        </a>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MashroaakPage() {
  const { lang } = useLanguage();
  const fmtEgp = (value: number, opts?: { decimals?: number; compact?: boolean }) => {
    const d = opts?.decimals ?? (value >= 100 ? 0 : 1);
    if (opts?.compact && Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(d)}B`;
    if (opts?.compact && Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(d)}M`;
    if (opts?.compact && Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(d)}K`;
    return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: d });
  };
  const fmt = fmtEgp;
  const fromEGP = (v: number) => v;
  const symbol = "EGP";
  const isAr = lang === "ar";

  const [activeTab, setActiveTab] = useState("matcher");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [previousTab, setPreviousTab] = useState("matcher");

  const stats = useQuery(api.industry.getStats, {});

  // Unique sectors/governorates from stats
  const statsData = stats as Stats | undefined;

  function handleSelectProject(id: string, fromTab: string) {
    setPreviousTab(fromTab);
    setSelectedProjectId(id);
    setActiveTab("detail");
  }

  function handleBack() {
    setSelectedProjectId(null);
    setActiveTab(previousTab);
  }

  const tabTriggerClass = "text-xs data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-500";

  return (
    <div className="page-content">
    <div className="container-page space-y-6">
      <DesktopNotice />

      {/* Page header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 shrink-0">
            <Briefcase size={20} className="text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2 flex-wrap">
              {isAr ? "مشروعك" : "Mashrou'ak"}
              <span className="text-base font-normal text-muted-foreground">
                {isAr ? "— فرصتك الاستثمارية في مصر" : "— Your Investment Opportunity in Egypt"}
              </span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isAr
                ? "استكشف الفرص الصناعية والاستثمارية من هيئة التنمية الصناعية (IDA) وهيئة الاستثمار (GAFI)"
                : "Explore industrial and investment opportunities from IDA and GAFI"}
            </p>
          </div>
        </div>

        {/* Stats row */}
        {statsData && (
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-1.5">
              <Building2 size={12} className="text-amber-500" />
              <span className="font-semibold text-foreground">{statsData.total.toLocaleString()}</span>
              <span>{isAr ? "فرصة استثمارية" : "opportunities"}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-1.5">
              <Layers size={12} className="text-amber-500" />
              <span className="font-semibold text-foreground">{statsData.sectors.length}</span>
              <span>{isAr ? "قطاع" : "sectors"}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-1.5">
              <MapPin size={12} className="text-amber-500" />
              <span className="font-semibold text-foreground">{statsData.governorates.length}</span>
              <span>{isAr ? "محافظة" : "governorates"}</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          if (v !== "detail") setSelectedProjectId(null);
          setActiveTab(v);
        }}
      >
        <TabsList className="h-auto flex flex-wrap gap-1 bg-muted/40 p-1">
          <TabsTrigger value="matcher" className={tabTriggerClass}>
            {isAr ? "المطابقة برأس المال" : "Capital Matcher"}
          </TabsTrigger>
          <TabsTrigger value="explorer" className={tabTriggerClass}>
            {isAr ? "استكشاف المشاريع" : "Project Explorer"}
          </TabsTrigger>
          {selectedProjectId && (
            <TabsTrigger value="detail" className={tabTriggerClass}>
              {isAr ? "تفاصيل المشروع" : "Project Detail"}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="matcher" className="mt-5">
          <CapitalMatcherTab
            isAr={isAr}
            onSelect={handleSelectProject}
            fmt={fmt}
            fromEGP={fromEGP}
            symbol={symbol}
            stats={statsData}
          />
        </TabsContent>

        <TabsContent value="explorer" className="mt-5">
          <ProjectExplorerTab
            isAr={isAr}
            onSelect={handleSelectProject}
            fmt={fmt}
            fromEGP={fromEGP}
            symbol={symbol}
            stats={statsData}
          />
        </TabsContent>

        {selectedProjectId && (
          <TabsContent value="detail" className="mt-5">
            <ProjectDetailTab
              projectId={selectedProjectId}
              isAr={isAr}
              onBack={handleBack}
              fmt={fmt}
              fromEGP={fromEGP}
              symbol={symbol}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Disclaimer */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-muted-foreground space-y-1">
        <p className="font-medium text-foreground text-xs uppercase tracking-wide">
          {isAr ? "إخلاء مسؤولية" : "Disclaimer"}
        </p>
        <p className="text-xs leading-relaxed">
          {isAr
            ? "هذه الأداة تعتمد على بحث آلي بالذكاء الاصطناعي وتقديرات مبنية على بيانات السوق المتاحة. التكاليف والحوافز المعروضة قد لا تعكس الأسعار الفعلية أو الشروط الحالية. يُرجى دائمًا استشارة متخصص والتواصل مباشرة مع هيئة التنمية الصناعية أو هيئة الاستثمار قبل اتخاذ أي قرار استثماري."
            : "This tool relies on AI-powered research and estimates based on available market data. Costs and incentives shown may not reflect actual prices or current terms. Always consult a professional and contact IDA or GAFI directly before making any investment decision."}
        </p>
        <p className="text-xs leading-relaxed">
          {isAr
            ? "البيانات المشار إليها بـ \"تقدير ذكاء اصطناعي\" هي تقديرات تقريبية وليست أسعارًا رسمية."
            : "Data marked as AI-estimated are approximate projections, not official prices."}
        </p>
      </div>

      <DataSourceFooter category="industry" />
    </div>
    </div>
  );
}
