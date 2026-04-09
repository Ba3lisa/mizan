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
import { SanadBadge } from "@/components/sanad-badge";
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

// ─── Data — all from Convex, no hardcoded values ──────────────────────────────

const FISCAL_YEARS = ["2024-2025", "2023-2024", "2022-2023"] as const;
type FiscalYear = (typeof FISCAL_YEARS)[number];

// Population fetched live from Convex economy indicators (World Bank)

// Historical data removed -- YearComparisonChart now reads from Convex fiscal years

// ─── Nivo Sankey Visualization ────────────────────────────────────────────────

const REVENUE_COLOR = "#1A6B5C";
const SPENDING_COLOR = "#8B3535";
const DEBT_SERVICE_COLOR = "#C94040";
const DEFICIT_COLOR = "#C9A84C";

// ─── Mobile Flow Diagram (interactive) ──────────────────────────────────────

function MobileBudgetFlow({
  revenueData, spendingData, isAr, fmtAmount,
}: {
  revenueData: BudgetCategory[];
  spendingData: BudgetCategory[];
  isAr: boolean;
  fmtAmount: (v: number) => string;
}) {
  // Which node is tapped/selected — null means nothing selected (show all)
  const [selected, setSelected] = useState<{ side: "rev" | "sp"; idx: number } | null>(null);

  const totalRev = revenueData.reduce((s, r) => s + r.amount, 0);
  const totalSp = spendingData.reduce((s, r) => s + r.amount, 0);
  const sortedRev = [...revenueData].sort((a, b) => b.amount - a.amount);
  const sortedSp = [...spendingData].sort((a, b) => b.amount - a.amount);

  // Layout
  const nodeW = 110;
  const gapX = 60;
  const svgW = nodeW * 2 + gapX;
  const rowH = 32;
  const pad = 4;
  const maxTotal = Math.max(totalRev, totalSp);
  const totalH = sortedRev.length * rowH * 1.5;
  const calcH = (amount: number) => Math.max(20, (amount / maxTotal) * totalH);

  const revBlocks = sortedRev.map((item, _i, _a) => ({ item, y: 0, h: calcH(item.amount) }));
  let yAcc = 0;
  for (const rb of revBlocks) { rb.y = yAcc; yAcc += rb.h + pad; }

  const spBlocks = sortedSp.map((item) => ({ item, y: 0, h: calcH(item.amount) }));
  yAcc = 0;
  for (const sb of spBlocks) { sb.y = yAcc; yAcc += sb.h + pad; }

  const svgH = Math.max(revBlocks.reduce((s, b) => s + b.h + pad, 0), spBlocks.reduce((s, b) => s + b.h + pad, 0));

  // Build flows
  interface Flow { revIdx: number; spIdx: number; value: number; srcY: number; srcH: number; tgtY: number; tgtH: number }
  const flows: Flow[] = [];
  for (let ri = 0; ri < revBlocks.length; ri++) {
    let srcOffset = 0;
    for (let si = 0; si < spBlocks.length; si++) {
      const flowVal = Math.round(
        (revBlocks[ri].item.amount / totalRev) *
        (spBlocks[si].item.amount / totalSp) *
        Math.min(totalRev, totalSp)
      );
      if (flowVal < 1) continue;
      const flowH_src = (flowVal / revBlocks[ri].item.amount) * revBlocks[ri].h;
      const flowH_tgt = (flowVal / spBlocks[si].item.amount) * spBlocks[si].h;
      const srcY = revBlocks[ri].y + srcOffset;
      srcOffset += flowH_src;
      flows.push({ revIdx: ri, spIdx: si, value: flowVal, srcY, srcH: flowH_src, tgtY: 0, tgtH: flowH_tgt });
    }
  }
  const spOffsets = new Array(spBlocks.length).fill(0) as number[];
  for (const f of flows) { f.tgtY = spBlocks[f.spIdx].y + spOffsets[f.spIdx]; spOffsets[f.spIdx] += f.tgtH; }

  const leftX = nodeW;
  const rightX = nodeW + gapX;

  // Interaction: check if a flow connects to the selected node
  const isFlowActive = (f: Flow) => {
    if (!selected) return true;
    return selected.side === "rev" ? f.revIdx === selected.idx : f.spIdx === selected.idx;
  };
  const isRevActive = (ri: number) => {
    if (!selected) return true;
    if (selected.side === "rev") return selected.idx === ri;
    return flows.some((f) => f.spIdx === selected.idx && f.revIdx === ri);
  };
  const isSpActive = (si: number) => {
    if (!selected) return true;
    if (selected.side === "sp") return selected.idx === si;
    return flows.some((f) => f.revIdx === selected.idx && f.spIdx === si);
  };

  const handleTap = (side: "rev" | "sp", idx: number) => {
    setSelected((prev) =>
      prev && prev.side === side && prev.idx === idx ? null : { side, idx }
    );
  };

  // Tooltip for selected node
  const selectedInfo = selected
    ? selected.side === "rev"
      ? revBlocks[selected.idx]
      : spBlocks[selected.idx]
    : null;
  const selectedTotal = selected?.side === "rev" ? totalRev : totalSp;

  return (
    <div className="flex flex-col gap-3" dir="ltr">
      {/* Header */}
      <div className="flex items-center justify-between px-1" dir={isAr ? "rtl" : "ltr"}>
        <div>
          <span className="text-xs font-bold" style={{ color: REVENUE_COLOR }}>{isAr ? "الإيرادات" : "Revenue"}</span>
          <span className="font-mono text-[0.65rem] text-emerald-500 ms-2">{fmtAmount(totalRev)}</span>
        </div>
        <div>
          <span className="text-xs font-bold" style={{ color: SPENDING_COLOR }}>{isAr ? "المصروفات" : "Spending"}</span>
          <span className="font-mono text-[0.65rem] text-red-400 ms-2">{fmtAmount(totalSp)}</span>
        </div>
      </div>

      {/* Tap hint */}
      <p className="text-[0.6rem] text-muted-foreground/50 text-center">
        {isAr ? "اضغط على أي عنصر لتتبع تدفق الأموال" : "Tap any item to trace money flow"}
      </p>

      {/* Selected node tooltip */}
      {selectedInfo && (
        <div
          className="mx-1 rounded-lg px-3 py-2 border text-center transition-all"
          style={{
            borderColor: selected?.side === "rev" ? REVENUE_COLOR : (selectedInfo.item.nameEn === "Debt Service" ? DEBT_SERVICE_COLOR : SPENDING_COLOR),
            background: selected?.side === "rev" ? `${REVENUE_COLOR}10` : `${SPENDING_COLOR}10`,
          }}
          dir={isAr ? "rtl" : "ltr"}
        >
          <span className="text-sm font-bold">{isAr ? selectedInfo.item.nameAr : selectedInfo.item.nameEn}</span>
          <span className="text-xs text-muted-foreground ms-2">
            {fmtAmount(selectedInfo.item.amount)} · {selectedTotal > 0 ? ((selectedInfo.item.amount / selectedTotal) * 100).toFixed(1) : 0}%
          </span>
        </div>
      )}

      {/* Flow diagram */}
      <div className="relative overflow-x-auto">
        <svg
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full"
          style={{ minWidth: 300 }}
          onClick={() => setSelected(null)}
        >
          {/* Flow paths */}
          {flows.map((f, i) => {
            const x1 = leftX;
            const x2 = rightX;
            const y1top = f.srcY;
            const y1bot = f.srcY + f.srcH;
            const y2top = f.tgtY;
            const y2bot = f.tgtY + f.tgtH;
            const cx = (x1 + x2) / 2;
            const isDebt = spBlocks[f.spIdx].item.nameEn === "Debt Service";
            const active = isFlowActive(f);

            return (
              <path
                key={i}
                d={`M${x1},${y1top} C${cx},${y1top} ${cx},${y2top} ${x2},${y2top} L${x2},${y2bot} C${cx},${y2bot} ${cx},${y1bot} ${x1},${y1bot} Z`}
                fill={isDebt ? DEBT_SERVICE_COLOR : REVENUE_COLOR}
                opacity={active ? (selected ? 0.45 : 0.18) : 0.04}
                style={{ transition: "opacity 0.25s ease" }}
              />
            );
          })}

          {/* Revenue blocks (left) */}
          {revBlocks.map((rb, i) => {
            const pct = totalRev > 0 ? ((rb.item.amount / totalRev) * 100).toFixed(0) : "0";
            const active = isRevActive(i);
            return (
              <g
                key={`rev-${i}`}
                onClick={(e) => { e.stopPropagation(); handleTap("rev", i); }}
                style={{ cursor: "pointer" }}
                opacity={active ? 1 : 0.2}
              >
                {/* Invisible hit area for easier tapping */}
                <rect x={0} y={rb.y} width={leftX} height={rb.h} fill="transparent" />
                <rect x={leftX - 10} y={rb.y} width={10} height={rb.h} rx={3} fill={REVENUE_COLOR} />
                <text
                  x={leftX - 16}
                  y={rb.y + rb.h / 2}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-foreground"
                  style={{ fontSize: 10, fontWeight: active && selected ? 600 : 400, transition: "opacity 0.25s" }}
                >
                  {isAr ? rb.item.nameAr : rb.item.nameEn}
                </text>
                <text
                  x={leftX - 16}
                  y={rb.y + rb.h / 2 + 12}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-muted-foreground"
                  style={{ fontSize: 8, fontFamily: "var(--font-mono)", transition: "opacity 0.25s" }}
                >
                  {pct}%
                </text>
              </g>
            );
          })}

          {/* Spending blocks (right) */}
          {spBlocks.map((sb, i) => {
            const pct = totalSp > 0 ? ((sb.item.amount / totalSp) * 100).toFixed(0) : "0";
            const isDebt = sb.item.nameEn === "Debt Service";
            const active = isSpActive(i);
            return (
              <g
                key={`sp-${i}`}
                onClick={(e) => { e.stopPropagation(); handleTap("sp", i); }}
                style={{ cursor: "pointer" }}
                opacity={active ? 1 : 0.2}
              >
                {/* Invisible hit area */}
                <rect x={rightX} y={sb.y} width={nodeW} height={sb.h} fill="transparent" />
                <rect x={rightX} y={sb.y} width={10} height={sb.h} rx={3} fill={isDebt ? DEBT_SERVICE_COLOR : SPENDING_COLOR} />
                <text
                  x={rightX + 16}
                  y={sb.y + sb.h / 2}
                  textAnchor="start"
                  dominantBaseline="middle"
                  className="fill-foreground"
                  style={{ fontSize: 10, fontWeight: active && selected ? 600 : 400, transition: "opacity 0.25s" }}
                >
                  {isAr ? sb.item.nameAr : sb.item.nameEn}
                </text>
                <text
                  x={rightX + 16}
                  y={sb.y + sb.h / 2 + 12}
                  textAnchor="start"
                  dominantBaseline="middle"
                  className="fill-muted-foreground"
                  style={{ fontSize: 8, fontFamily: "var(--font-mono)", transition: "opacity 0.25s" }}
                >
                  {fmtAmount(sb.item.amount)} · {pct}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Deficit */}
      {totalSp > totalRev && (
        <div className="border-t border-border pt-3 flex items-baseline justify-between px-1" dir={isAr ? "rtl" : "ltr"}>
          <span className="text-xs font-semibold" style={{ color: DEFICIT_COLOR }}>{isAr ? "العجز" : "Deficit"}</span>
          <span className="font-mono text-sm font-bold" style={{ color: DEFICIT_COLOR }}>{fmtAmount(totalSp - totalRev)}</span>
        </div>
      )}
    </div>
  );
}

// ─── Desktop Sankey Diagram ─────────────────────────────────────────────────

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

  // Mobile: interactive SVG flow diagram showing revenue → spending connections
  if (isMobile) {
    return (
      <MobileBudgetFlow
        revenueData={revenueData}
        spendingData={spendingData}
        isAr={isAr}
        fmtAmount={fmtAmount}
      />
    );
  }

  // Desktop: full Sankey diagram
  return (
    <div dir="ltr">
      <div className="h-[700px]">
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

function PerCapitaSection({ year: _year, spendingData, revenueData, populationOverride }: { year: FiscalYear; spendingData?: BudgetCategory[]; revenueData?: BudgetCategory[]; populationOverride?: number }) {
  const { lang } = useLanguage();
  const { symbol, fromEGP, fmt } = useCurrency();
  const isAr = lang === "ar";

  const pop = populationOverride ?? 0;
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
  const populationTimeline = useQuery(api.economy.getIndicatorTimeline, { indicator: "population" });
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
  // Population from Convex (World Bank, stored in millions) — match fiscal year
  const fiscalStartYear = effectiveYear.split(/[-/]/)[0]; // "2024-2025" → "2024"
  const matchedPop = populationTimeline?.find((p) => p.year === fiscalStartYear);
  const latestPop = matchedPop
    ? matchedPop.value * 1_000_000
    : populationTimeline && populationTimeline.length > 0
      ? populationTimeline[populationTimeline.length - 1].value * 1_000_000
      : 0;
  const population = latestPop > 0 ? Math.round(latestPop) : 0;

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
              <p className="font-mono text-3xl font-bold tabular-nums flex items-center gap-1.5" style={{ color: "#4DCCB3" }}>
                {revenueDisplay}
                {selectedFY?.sanadLevel && <SanadBadge sanadLevel={selectedFY.sanadLevel} sourceUrl={selectedFY?.sourceUrl} />}
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
              <p className="font-mono text-3xl font-bold tabular-nums flex items-center gap-1.5" style={{ color: "#E07070" }}>
                {spendingDisplay}
                {selectedFY?.sanadLevel && <SanadBadge sanadLevel={selectedFY.sanadLevel} sourceUrl={selectedFY?.sourceUrl} />}
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
              <p className="font-mono text-3xl font-bold tabular-nums flex items-center gap-1.5" style={{ color: DEFICIT_COLOR }}>
                -{deficitDisplay}
                {selectedFY?.sanadLevel && <SanadBadge sanadLevel={selectedFY.sanadLevel} sourceUrl={selectedFY?.sourceUrl} />}
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
              items={activeRevenue}
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
              items={activeSpending}
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
