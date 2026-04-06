"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Users, ChevronDown, ChevronRight } from "lucide-react";
import { DataSourceFooter } from "@/components/data-source";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useLanguage } from "@/components/providers";
import { useCurrency } from "@/components/providers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ResponsiveSankey } from "@nivo/sankey";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BudgetSubItem {
  nameAr: string;
  nameEn: string;
  amount: number;
}

interface BudgetCategory {
  nameAr: string;
  nameEn: string;
  amount: number;
  subItems?: BudgetSubItem[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────
// TODO: Replace revenue/spending/chartData arrays with Convex queries once
// getBudgetBreakdown (requires fiscalYearId) and getBudgetSankeyData are wired up.
// The flat budgetItems schema needs restructuring to match BudgetCategory with subItems.

const revenue: BudgetCategory[] = [
  {
    nameAr: "الضرائب على الدخل",
    nameEn: "Income Tax",
    amount: 420,
    subItems: [
      { nameAr: "ضريبة الدخل الشخصي", nameEn: "Personal Income Tax", amount: 180 },
      { nameAr: "ضريبة أرباح الشركات", nameEn: "Corporate Tax", amount: 155 },
      { nameAr: "ضرائب أخرى على الدخل", nameEn: "Other Income Tax", amount: 85 },
    ],
  },
  {
    nameAr: "ضريبة القيمة المضافة",
    nameEn: "VAT",
    amount: 380,
    subItems: [
      { nameAr: "ضريبة القيمة المضافة المحلية", nameEn: "Domestic VAT", amount: 250 },
      { nameAr: "ضريبة القيمة المضافة على الواردات", nameEn: "Import VAT", amount: 130 },
    ],
  },
  {
    nameAr: "البترول والغاز",
    nameEn: "Petroleum & Gas",
    amount: 245,
    subItems: [
      { nameAr: "صادرات البترول", nameEn: "Oil Exports", amount: 145 },
      { nameAr: "الغاز الطبيعي", nameEn: "Natural Gas", amount: 100 },
    ],
  },
  { nameAr: "قناة السويس", nameEn: "Suez Canal", amount: 120 },
  { nameAr: "الجمارك والرسوم", nameEn: "Customs & Duties", amount: 95 },
  { nameAr: "منح وإيرادات أخرى", nameEn: "Grants & Other", amount: 214 },
];

const spending: BudgetCategory[] = [
  {
    nameAr: "خدمة الدين",
    nameEn: "Debt Service",
    amount: 580,
    subItems: [
      { nameAr: "فوائد الدين المحلي", nameEn: "Domestic Debt Interest", amount: 420 },
      { nameAr: "فوائد الدين الخارجي", nameEn: "External Debt Interest", amount: 95 },
      { nameAr: "أقساط الدين", nameEn: "Principal Repayments", amount: 65 },
    ],
  },
  {
    nameAr: "الأجور والرواتب",
    nameEn: "Wages & Salaries",
    amount: 470,
    subItems: [
      { nameAr: "الجهاز الإداري", nameEn: "Civil Service", amount: 280 },
      { nameAr: "الهيئات العامة", nameEn: "Public Authorities", amount: 120 },
      { nameAr: "الإدارة المحلية", nameEn: "Local Admin", amount: 70 },
    ],
  },
  {
    nameAr: "الدعم والمنح الاجتماعية",
    nameEn: "Subsidies & Social",
    amount: 350,
    subItems: [
      { nameAr: "دعم المواد البترولية", nameEn: "Fuel Subsidies", amount: 120 },
      { nameAr: "دعم الخبز والغذاء", nameEn: "Bread & Food", amount: 90 },
      { nameAr: "تكافل وكرامة", nameEn: "Takaful & Karama", amount: 40 },
      { nameAr: "دعم الكهرباء", nameEn: "Electricity Subsidy", amount: 55 },
      { nameAr: "منح اجتماعية أخرى", nameEn: "Other Social", amount: 45 },
    ],
  },
  {
    nameAr: "البنية التحتية والاستثمارات",
    nameEn: "Infrastructure",
    amount: 250,
    subItems: [
      { nameAr: "الطرق والنقل", nameEn: "Roads & Transport", amount: 95 },
      { nameAr: "العاصمة الإدارية", nameEn: "New Capital", amount: 65 },
      { nameAr: "المياه والصرف", nameEn: "Water & Sanitation", amount: 45 },
      { nameAr: "مشروعات أخرى", nameEn: "Other Projects", amount: 45 },
    ],
  },
  {
    nameAr: "التعليم",
    nameEn: "Education",
    amount: 180,
    subItems: [
      { nameAr: "التعليم الأساسي", nameEn: "Basic Education", amount: 110 },
      { nameAr: "التعليم العالي", nameEn: "Higher Education", amount: 50 },
      { nameAr: "الأزهر", nameEn: "Al-Azhar", amount: 20 },
    ],
  },
  { nameAr: "الصحة", nameEn: "Health", amount: 120 },
  { nameAr: "الدفاع والأمن", nameEn: "Defence & Security", amount: 95 },
  { nameAr: "أخرى", nameEn: "Other", amount: 520 },
];

const FISCAL_YEARS = ["2024-2025", "2023-2024", "2022-2023"] as const;
type FiscalYear = (typeof FISCAL_YEARS)[number];

const _FISCAL_YEAR_GDP: Record<FiscalYear, number> = {
  "2024-2025": 12100,
  "2023-2024": 10800,
  "2022-2023": 9100,
};

const FISCAL_YEAR_POPULATION: Record<FiscalYear, number> = {
  "2024-2025": 105_000_000,
  "2023-2024": 104_000_000,
  "2022-2023": 103_000_000,
};

// Historical data removed -- YearComparisonChart now reads from Convex fiscal years

// ─── Nivo Sankey Visualization ────────────────────────────────────────────────

const REVENUE_COLOR = "#1A6B5C";
const SPENDING_COLOR = "#8B3535";
const DEBT_SERVICE_COLOR = "#C94040";
const DEFICIT_COLOR = "#C9A84C";

function BudgetSankey({ revenueData, spendingData }: { revenueData: BudgetCategory[]; spendingData: BudgetCategory[] }) {
  const { lang } = useLanguage();
  const { symbol, fromEGP, fmt } = useCurrency();
  const isAr = lang === "ar";

  // Build nivo sankey data: revenue sources → "Revenue" node → "Spending" node → spending categories
  const nodes = [
    ...revenueData.flatMap(r => r.subItems?.map(s => ({ id: `rsub_${s.nameEn}`, label: isAr ? s.nameAr : s.nameEn, color: "#2D8A73" })) ?? []),
    ...revenueData.map(r => ({ id: `rev_${r.nameEn}`, label: isAr ? r.nameAr : r.nameEn, color: REVENUE_COLOR })),
    ...spendingData.map(s => ({ id: `sp_${s.nameEn}`, label: isAr ? s.nameAr : s.nameEn, color: s.nameEn === "Debt Service" ? DEBT_SERVICE_COLOR : SPENDING_COLOR })),
    ...spendingData.flatMap(s => s.subItems?.map(sub => ({ id: `ssub_${sub.nameEn}`, label: isAr ? sub.nameAr : sub.nameEn, color: s.nameEn === "Debt Service" ? "#D45555" : "#A04040" })) ?? []),
  ];

  const links = [
    ...revenueData.flatMap(r => r.subItems?.map(s => ({ source: `rsub_${s.nameEn}`, target: `rev_${r.nameEn}`, value: s.amount })) ?? []),
    ...revenueData.filter(r => !r.subItems?.length).map(r => ({ source: `rev_${r.nameEn}`, target: `rev_${r.nameEn}`, value: 0 })),
    ...(() => {
      const totalRev = revenueData.reduce((s, r) => s + r.amount, 0);
      const totalSp = spendingData.reduce((s, r) => s + r.amount, 0);
      const result: Array<{ source: string; target: string; value: number }> = [];
      for (const r of revenueData) {
        for (const s of spendingData) {
          const flow = Math.round((r.amount / totalRev) * (s.amount / totalSp) * Math.min(totalRev, totalSp));
          if (flow > 5) {
            result.push({ source: `rev_${r.nameEn}`, target: `sp_${s.nameEn}`, value: flow });
          }
        }
      }
      return result;
    })(),
    // Spending groups → spending sub-items
    ...spendingData.flatMap(s => s.subItems?.map(sub => ({ source: `sp_${s.nameEn}`, target: `ssub_${sub.nameEn}`, value: sub.amount })) ?? []),
  ];

  // Filter out self-links and zero values
  const validLinks = links.filter(l => l.source !== l.target && l.value > 0);

  const totalBudget = spendingData.reduce((s, r) => s + r.amount, 0);
  const fmtAmount = (v: number) => `${fmt(fromEGP(v * 1e9), { compact: true })} ${symbol}`;
  const _fmtPct = (v: number) => totalBudget > 0 ? `${((v / totalBudget) * 100).toFixed(1)}%` : "";

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (nodes.length === 0 || validLinks.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground text-sm">
        {isAr ? "لا توجد بيانات ميزانية متاحة بعد" : "No budget data available yet"}
      </div>
    );
  }

  return (
    <div className={isMobile ? "overflow-x-auto" : ""} dir="ltr">
      <div className={isMobile ? "min-w-[900px] h-[700px]" : "h-[700px]"}>
      <ResponsiveSankey
        data={{ nodes, links: validLinks }}
        margin={isMobile
          ? { top: 20, right: 160, bottom: 20, left: 160 }
          : { top: 20, right: 240, bottom: 20, left: 240 }
        }
        align="justify"
        sort="descending"
        label={(node) => {
          const n = node as unknown as { label?: string };
          return n.label ?? String(node.id);
        }}
        nodeOpacity={1}
        nodeHoverOthersOpacity={0.25}
        nodeThickness={isMobile ? 18 : 24}
        nodeSpacing={isMobile ? 2 : 4}
        nodeBorderWidth={0}
        nodeBorderColor={{ from: "color", modifiers: [["darker", 0.5]] }}
        nodeBorderRadius={3}
        linkOpacity={0.3}
        linkHoverOpacity={0.7}
        linkHoverOthersOpacity={0.05}
        linkContract={1}
        linkBlendMode="normal"
        enableLinkGradient
        labelPosition="outside"
        labelOrientation="horizontal"
        labelPadding={isMobile ? 6 : 12}
        labelTextColor={{ from: "color", modifiers: [["brighter", 1]] }}
        nodeTooltip={({ node }) => {
          const pct = totalBudget > 0 ? ((node.value / totalBudget) * 100).toFixed(1) : "0";
          return (
            <div className="bg-card border border-border rounded-lg px-3 py-2.5 shadow-lg min-w-[140px]">
              <p className="font-bold text-foreground text-sm mb-1">{node.label}</p>
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-mono text-sm font-bold text-primary">{fmtAmount(node.value)}</span>
                <span className="font-mono text-xs text-muted-foreground">{pct}%</span>
              </div>
            </div>
          );
        }}
        linkTooltip={({ link }) => {
          const pct = totalBudget > 0 ? ((link.value / totalBudget) * 100).toFixed(1) : "0";
          return (
            <div className="bg-card border border-border rounded-lg px-3 py-2.5 shadow-lg min-w-[160px]">
              <p className="text-foreground text-xs mb-1.5">{link.source.label} → {link.target.label}</p>
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-mono text-sm font-bold text-primary">{fmtAmount(link.value)}</span>
                <span className="font-mono text-xs text-muted-foreground">{pct}%</span>
              </div>
            </div>
          );
        }}
        colors={(node) => (node as { color?: string }).color ?? "#666"}
        theme={{
          text: { fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "var(--font-sans)" },
          tooltip: { container: { background: "var(--card)", color: "var(--foreground)", borderRadius: "8px", border: "1px solid var(--border)" } },
        }}
      />
      </div>
    </div>
  );
}

// ─── Year Comparison Chart ────────────────────────────────────────────────────

function YearComparisonChart() {
  const { lang } = useLanguage();
  const { fromEGP, fmt } = useCurrency();
  const isAr = lang === "ar";

  // Use Convex fiscal years for year comparison -- no hardcoded data
  const convexFYs = useQuery(api.budget.listFiscalYears);
  const chartData = convexFYs
    ? convexFYs.map((fy) => ({
        year: fy.year.replace("/", "-").slice(0, 4),
        revenue: fy.totalRevenue ?? 0,
        spending: fy.totalExpenditure ?? 0,
      }))
    : [];

  const svgW = 600;
  const svgH = 260;
  const padL = 60;
  const padR = 20;
  const padT = 28;
  const padB = 40;
  const innerW = svgW - padL - padR;
  const innerH = svgH - padT - padB;

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
        {isAr ? "لا توجد بيانات مقارنة متاحة" : "No comparison data available"}
      </div>
    );
  }

  const maxVal = Math.max(...chartData.map((y) => Math.max(y.revenue, y.spending)));
  const groupW = innerW / chartData.length;
  const barW = groupW * 0.28;
  const gap = groupW * 0.08;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {isAr ? "مقارنة سنة بعد سنة (مليار)" : "Year-over-Year Comparison (B)"}
        </p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-2" style={{ background: REVENUE_COLOR }} />
            {isAr ? "إيرادات" : "Revenue"}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-2" style={{ background: SPENDING_COLOR }} />
            {isAr ? "مصروفات" : "Spending"}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ minWidth: "340px", height: "260px" }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const y = padT + innerH * (1 - frac);
            const val = Math.round(maxVal * frac);
            const labelVal = fmt(fromEGP(val * 1e9), { compact: true, decimals: 0 });
            return (
              <g key={frac}>
                <line x1={padL} y1={y} x2={svgW - padR} y2={y} stroke="#252A36" strokeWidth={0.5} />
                <text x={padL - 8} y={y} textAnchor="end" dominantBaseline="middle" fill="#7A8299" fontSize={9} fontFamily="var(--font-mono)">
                  {labelVal}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {chartData.map((yr, i) => {
            const cx = padL + i * groupW + groupW / 2;
            const revH = (yr.revenue / maxVal) * innerH;
            const expH = (yr.spending / maxVal) * innerH;
            const revX = cx - barW - gap / 2;
            const expX = cx + gap / 2;
            const revLabel = fmt(fromEGP(yr.revenue * 1e9), { compact: true, decimals: 0 });
            const expLabel = fmt(fromEGP(yr.spending * 1e9), { compact: true, decimals: 0 });

            return (
              <g key={yr.year}>
                <rect x={revX} y={padT + innerH - revH} width={barW} height={revH} rx={2} fill={REVENUE_COLOR} opacity={0.85} />
                <text x={revX + barW / 2} y={padT + innerH - revH - 5} textAnchor="middle" fill="#4DCCB3" fontSize={8} fontFamily="var(--font-mono)">
                  {revLabel}
                </text>

                <rect x={expX} y={padT + innerH - expH} width={barW} height={expH} rx={2} fill={SPENDING_COLOR} opacity={0.85} />
                <text x={expX + barW / 2} y={padT + innerH - expH - 5} textAnchor="middle" fill="#E07070" fontSize={8} fontFamily="var(--font-mono)">
                  {expLabel}
                </text>

                <text x={cx} y={svgH - 8} textAnchor="middle" fill="#7A8299" fontSize={9} fontFamily="var(--font-mono)">
                  {yr.year.split("-")[0]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── Per Capita Section ───────────────────────────────────────────────────────

function PerCapitaSection({ year, spendingData, revenueData, populationOverride }: { year: FiscalYear; spendingData?: BudgetCategory[]; revenueData?: BudgetCategory[]; populationOverride?: number }) {
  const { lang } = useLanguage();
  const { symbol, fromEGP, fmt } = useCurrency();
  const isAr = lang === "ar";

  const normalizedYear = year.replace("/", "-") as FiscalYear;
  const pop = populationOverride ?? FISCAL_YEAR_POPULATION[normalizedYear] ?? 105_000_000;
  const activeSpending = spendingData ?? [];
  const activeRevenue = revenueData ?? [];
  const totalRevenue = activeRevenue.reduce((s, r) => s + r.amount, 0);
  const totalSpending = activeSpending.reduce((s, r) => s + r.amount, 0);
  const debtService = activeSpending.find((s) => s.nameEn === "Debt Service" || s.nameEn.includes("Debt"))?.amount ?? 0;
  const education = activeSpending.find((s) => s.nameEn === "Education" || s.nameEn.includes("Education"))?.amount ?? 0;

  const items = [
    {
      labelAr: "نصيبك من الإيرادات",
      labelEn: "Your share of revenue",
      amountEGP: (totalRevenue * 1e9) / pop,
      color: "#4DCCB3",
    },
    {
      labelAr: "نصيبك من الإنفاق",
      labelEn: "Your share of spending",
      amountEGP: (totalSpending * 1e9) / pop,
      color: "#E07070",
    },
    {
      labelAr: "نصيبك من خدمة الدين",
      labelEn: "Your share of debt service",
      amountEGP: (debtService * 1e9) / pop,
      color: DEBT_SERVICE_COLOR,
    },
    {
      labelAr: "نصيبك من التعليم",
      labelEn: "Your share of education",
      amountEGP: (education * 1e9) / pop,
      color: DEFICIT_COLOR,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item) => {
        const converted = fromEGP(item.amountEGP);
        const formatted = fmt(converted, { compact: converted >= 1000 });
        return (
          <Card key={item.labelEn} className="bg-card border-border">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground mb-1">
                {isAr ? item.labelAr : item.labelEn}
              </p>
              <p className="font-mono text-xl font-bold tabular-nums" style={{ color: item.color }}>
                {symbol}{formatted}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isAr ? "سنوياً لكل مواطن" : "per person / year"}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Breakdown Table ──────────────────────────────────────────────────────────

function BreakdownTable({
  items,
  total,
  gdp,
  labelHeader,
  accentColor,
}: {
  items: BudgetCategory[];
  total: number;
  gdp: number;
  labelHeader: string;
  accentColor: string;
}) {
  const { lang } = useLanguage();
  const { symbol, fromEGP, fmt } = useCurrency();
  const isAr = lang === "ar";
  const [expanded, setExpanded] = useState<string | null>(null);

  const sorted = [...items].sort((a, b) => b.amount - a.amount);

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {labelHeader}
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-end">
              {isAr ? "المبلغ" : "Amount"}
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-end">
              {isAr ? "% من الإجمالي" : "% of total"}
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-end hidden sm:table-cell">
              {isAr ? "% من الناتج" : "% of GDP"}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((item) => {
            const pct = ((item.amount / total) * 100).toFixed(1);
            const gdpPct = ((item.amount / gdp) * 100).toFixed(1);
            const isDebt = item.nameEn === "Debt Service";
            const isTop = sorted[0].nameEn === item.nameEn;
            const displayAmount = `${fmt(fromEGP(item.amount * 1e9), { compact: true })} ${symbol}`;
            const hasSubItems = (item.subItems?.length ?? 0) > 0;
            const isExpanded = expanded === item.nameEn;

            return [
              <TableRow
                key={item.nameEn}
                className={cn(
                  "hover:bg-muted/30 transition-colors",
                  isDebt && "bg-red-950/10",
                  hasSubItems && "cursor-pointer"
                )}
                onClick={() => {
                  if (hasSubItems) {
                    setExpanded((prev) => (prev === item.nameEn ? null : item.nameEn));
                  }
                }}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 shrink-0" style={{ background: isDebt ? DEBT_SERVICE_COLOR : accentColor }} />
                    <span className={cn("text-sm", isDebt ? "text-red-400 font-semibold" : "text-foreground")}>
                      {isAr ? item.nameAr : item.nameEn}
                    </span>
                    {isTop && isDebt && (
                      <Badge variant="destructive" className="text-xs px-1 py-0">
                        {isAr ? "الأكبر" : "Largest"}
                      </Badge>
                    )}
                    {hasSubItems && (
                      <span className="ms-auto text-muted-foreground">
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-end">
                  <span className={cn("font-mono tabular-nums text-sm", isDebt ? "text-red-400" : "text-foreground")}>
                    {displayAmount}
                  </span>
                </TableCell>
                <TableCell className="text-end">
                  <span className={cn("font-mono tabular-nums text-sm", isDebt ? "text-red-400" : "text-muted-foreground")}>
                    {pct}%
                  </span>
                </TableCell>
                <TableCell className="text-end hidden sm:table-cell">
                  <span className="font-mono tabular-nums text-sm text-muted-foreground">
                    {gdpPct}%
                  </span>
                </TableCell>
              </TableRow>,
              // Sub-item rows
              ...(isExpanded && item.subItems
                ? item.subItems.map((sub) => {
                    const subDisplay = `${fmt(fromEGP(sub.amount * 1e9), { compact: true })} ${symbol}`;
                    const subPct = ((sub.amount / total) * 100).toFixed(1);
                    const subGdpPct = ((sub.amount / gdp) * 100).toFixed(1);
                    return (
                      <TableRow key={`${item.nameEn}-${sub.nameEn}`} className="bg-muted/10">
                        <TableCell className="ps-8">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0 opacity-60" style={{ background: isDebt ? DEBT_SERVICE_COLOR : accentColor }} />
                            <span className="text-xs text-muted-foreground">
                              {isAr ? sub.nameAr : sub.nameEn}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-end">
                          <span className="font-mono tabular-nums text-xs text-muted-foreground">{subDisplay}</span>
                        </TableCell>
                        <TableCell className="text-end">
                          <span className="font-mono tabular-nums text-xs text-muted-foreground">{subPct}%</span>
                        </TableCell>
                        <TableCell className="text-end hidden sm:table-cell">
                          <span className="font-mono tabular-nums text-xs text-muted-foreground">{subGdpPct}%</span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                : []),
            ];
          })}
          {/* Totals row */}
          <TableRow className="bg-muted/30 border-t-2 border-border">
            <TableCell>
              <span className="text-sm font-semibold text-foreground">{isAr ? "الإجمالي" : "Total"}</span>
            </TableCell>
            <TableCell className="text-end">
              <span className="font-mono font-semibold tabular-nums text-sm text-foreground">
                {symbol}{fmt(fromEGP(total * 1e9), { compact: true })}
              </span>
            </TableCell>
            <TableCell className="text-end">
              <span className="font-mono tabular-nums text-sm text-foreground">100%</span>
            </TableCell>
            <TableCell className="text-end hidden sm:table-cell">
              <span className="font-mono tabular-nums text-sm text-foreground">
                {((total / gdp) * 100).toFixed(1)}%
              </span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BudgetPage() {
  const { t, lang, dir } = useLanguage();
  const { symbol, fromEGP, fmt } = useCurrency();
  const isAr = lang === "ar";

  const [selectedYearStr, setSelectedYearStr] = useState<string>("");

  // ─── Convex queries ───────────────────────────────────────────────────────
  const convexFiscalYears = useQuery(api.budget.listFiscalYears);
  const _isLoading = convexFiscalYears === undefined;

  // Sort newest first for dropdown
  const sortedFYs = convexFiscalYears
    ? [...convexFiscalYears].sort((a, b) => b.year.localeCompare(a.year))
    : [];

  // Default to latest fiscal year
  const effectiveYear = selectedYearStr || sortedFYs[0]?.year || "";

  // Find the selected fiscal year from Convex
  const selectedFY = sortedFYs.find((fy) => fy.year === effectiveYear);

  const yearOptions = sortedFYs.map((fy) => fy.year);

  // Get budget breakdown for selected fiscal year
  const convexBreakdown = useQuery(
    api.budget.getBudgetBreakdown,
    selectedFY ? { fiscalYearId: selectedFY._id, category: "expenditure" as const } : "skip"
  );
  const convexRevenue = useQuery(
    api.budget.getBudgetBreakdown,
    selectedFY ? { fiscalYearId: selectedFY._id, category: "revenue" as const } : "skip"
  );

  // All data from Convex -- no hardcoded fallbacks
  const totalRevenue = selectedFY?.totalRevenue ?? 0;
  const totalSpending = selectedFY?.totalExpenditure ?? 0;
  const deficit = selectedFY?.deficit ?? (totalSpending - totalRevenue);
  const gdp = selectedFY?.gdp ?? 0;
  const normalizedYear = selectedYearStr.replace("/", "-") as FiscalYear;
  const population = FISCAL_YEAR_POPULATION[normalizedYear] ?? 105_000_000;

  const _isBudgetLoading = convexBreakdown === undefined || convexRevenue === undefined;

  // Spending/revenue from Convex only
  const activeSpending: BudgetCategory[] = convexBreakdown
    ? convexBreakdown
        .filter((item) => !item.parentItemId)
        .map((item) => ({
          nameAr: item.sectorAr,
          nameEn: item.sectorEn,
          amount: item.amount,
        }))
    : [];

  const activeRevenue: BudgetCategory[] = convexRevenue
    ? convexRevenue
        .filter((item) => !item.parentItemId)
        .map((item) => ({
          nameAr: item.sectorAr,
          nameEn: item.sectorEn,
          amount: item.amount,
        }))
    : [];

  const debtServicePct = ((activeSpending.find((s) => s.nameEn === "Debt Service" || s.nameEn.includes("Debt"))?.amount ?? 0) / totalSpending * 100).toFixed(1);

  const revenueDisplay = `${symbol}${fmt(fromEGP(totalRevenue * 1e9), { compact: true })}`;
  const spendingDisplay = `${symbol}${fmt(fromEGP(totalSpending * 1e9), { compact: true })}`;
  const deficitDisplay = `${symbol}${fmt(fromEGP(Math.abs(deficit) * 1e9), { compact: true })}`;

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page flex flex-col gap-10">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {isAr ? "الموازنة العامة للدولة" : "General State Budget"}
            </p>
            <h1 className="text-3xl font-bold text-foreground mb-1">
              {isAr ? "الموازنة العامة" : "National Budget"}
            </h1>
            <p className="text-sm text-muted-foreground">{t.budgetDesc}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <span className="text-sm text-muted-foreground">{t.fiscalYear}</span>
            <Select value={effectiveYear} onValueChange={(v) => setSelectedYearStr(v)}>
              <SelectTrigger className="w-36 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(yearOptions.length > 0 ? yearOptions : FISCAL_YEARS).map((y) => (
                  <SelectItem key={y} value={y} className="text-sm font-mono">
                    {y.replace("/", "-")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Key Metrics ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Revenue */}
          <Card className="bg-card border-border">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp size={13} style={{ color: "#4DCCB3" }} />
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{t.totalRevenue}</p>
              </div>
              <p className="font-mono text-3xl font-bold tabular-nums" style={{ color: "#4DCCB3" }}>
                {revenueDisplay}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {((totalRevenue / gdp) * 100).toFixed(1)}% {isAr ? "من الناتج المحلي" : "of GDP"}
              </p>
            </CardContent>
          </Card>

          {/* Spending */}
          <Card className="bg-card border-border">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp size={13} style={{ color: "#E07070" }} />
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{t.totalExpenditure}</p>
              </div>
              <p className="font-mono text-3xl font-bold tabular-nums" style={{ color: "#E07070" }}>
                {spendingDisplay}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {((totalSpending / gdp) * 100).toFixed(1)}% {isAr ? "من الناتج المحلي" : "of GDP"}
              </p>
            </CardContent>
          </Card>

          {/* Deficit */}
          <Card className="bg-card border border-yellow-900/30">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingDown size={13} style={{ color: DEFICIT_COLOR }} />
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{t.deficit}</p>
              </div>
              <p className="font-mono text-3xl font-bold tabular-nums" style={{ color: DEFICIT_COLOR }}>
                -{deficitDisplay}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {((deficit / gdp) * 100).toFixed(1)}% {isAr ? "من الناتج المحلي" : "of GDP"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Debt Service Alert ── */}
        <div className="rounded-lg border border-border bg-card px-5 py-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isAr
              ? `خدمة الدين تمثل ${debtServicePct}% من إجمالي الإنفاق — وهي أكبر بند في الميزانية، وتتجاوز الإنفاق على التعليم والصحة والدفاع مجتمعة.`
              : `Debt service represents ${debtServicePct}% of total expenditure — the single largest budget item, exceeding education, health, and defence combined.`}
          </p>
          <DataSourceFooter category="budget" />
        </div>

        {/* ── CanadaSpends Visualization ── */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">
              {isAr ? "توزيع الموازنة — إيرادات ومصروفات" : "Budget Breakdown — Revenue & Spending"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {isAr
                ? "ارتفاع كل كتلة يعكس حجمها بالنسبة للإجمالي"
                : "Each block's height is proportional to its share of the total"}
            </p>
          </CardHeader>
          <CardContent>
            <BudgetSankey revenueData={activeRevenue} spendingData={activeSpending} />
          </CardContent>
        </Card>

        {/* ── Breakdown Tables ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {t.revenueBreakdown}
            </p>
            <BreakdownTable
              items={revenue}
              total={totalRevenue}
              gdp={gdp}
              labelHeader={isAr ? "المصدر" : "Source"}
              accentColor={REVENUE_COLOR}
            />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {t.expenditureBreakdown}
            </p>
            <BreakdownTable
              items={spending}
              total={totalSpending}
              gdp={gdp}
              labelHeader={isAr ? "البند" : "Item"}
              accentColor={SPENDING_COLOR}
            />
          </div>
        </div>

        {/* ── Year-over-Year Comparison ── */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground">
              {isAr ? "المقارنة السنوية" : "Year-over-Year Comparison"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <YearComparisonChart />
          </CardContent>
        </Card>

        {/* ── Per Capita ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-primary" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {isAr ? "حصة الفرد من الميزانية" : "Your Share of the Budget"}
            </p>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {isAr
              ? `بتقسيم الميزانية على ${(population / 1_000_000).toFixed(0)} مليون مواطن:`
              : `Dividing the budget across ${(population / 1_000_000).toFixed(0)}M citizens:`}
          </p>
          <PerCapitaSection year={selectedYearStr as FiscalYear} spendingData={activeSpending} revenueData={activeRevenue} populationOverride={population} />
        </div>

        <DataSourceFooter category="budget" />

      </div>
    </div>
  );
}
