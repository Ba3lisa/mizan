"use client";

import { useState } from "react";
import { Skeleton } from "boneyard-js/react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useLanguage, useCurrency } from "@/components/providers";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimelineDataPoint {
  year: number;
  externalDebt: number;
  debtToGDP: number;
  event?: string;
  eventAr?: string;
}

interface RegionalCountry {
  nameAr: string;
  nameEn: string;
  debtToGDP: number;
  color: string;
  isEgypt?: boolean;
}

// ─── Static reference data (regional comparison — no Convex equivalent) ──────

const regionalData: RegionalCountry[] = [
  { nameAr: "\u0645\u0635\u0631", nameEn: "Egypt", debtToGDP: 47.2, color: "#C9A84C", isEgypt: true },
  { nameAr: "\u062a\u0631\u0643\u064a\u0627", nameEn: "Turkey", debtToGDP: 31.8, color: "#6C8EEF" },
  { nameAr: "\u0627\u0644\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0639\u0631\u0628\u064a\u0629 \u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629", nameEn: "Saudi Arabia", debtToGDP: 27.7, color: "#2EC4B6" },
  { nameAr: "\u0627\u0644\u0645\u063a\u0631\u0628", nameEn: "Morocco", debtToGDP: 62.4, color: "#E76F51" },
  { nameAr: "\u0646\u064a\u062c\u064a\u0631\u064a\u0627", nameEn: "Nigeria", debtToGDP: 37.5, color: "#9B72CF" },
  { nameAr: "\u062a\u0648\u0646\u0633", nameEn: "Tunisia", debtToGDP: 88.6, color: "#7A8299" },
];

// ─── Debt Timeline SVG ────────────────────────────────────────────────────────

function DebtTimeline() {
  const { lang } = useLanguage();
  const { symbol, fromEGP, fmt } = useCurrency();
  const isAr = lang === "ar";
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const fmtB = (v: number) => `${fmt(fromEGP(v * 1e9), { compact: true })} ${symbol}`;

  const convexTimeline = useQuery(api.debt.getDebtTimeline);
  const isLoading = convexTimeline === undefined;

  // Deduplicate by year -- keep the latest record per year (e.g., 2024-12-31 over 2024-06-30)
  const activeTimelineData: TimelineDataPoint[] = (() => {
    if (isLoading || convexTimeline.length === 0) return [];
    const byYear = new Map<number, { date: string; ext: number; ratio: number }>();
    for (const r of convexTimeline) {
      const year = new Date(r.date).getFullYear();
      const prev = byYear.get(year);
      if (!prev || r.date > prev.date) {
        byYear.set(year, { date: r.date, ext: r.totalExternalDebt ?? 0, ratio: r.debtToGdpRatio ?? 0 });
      }
    }
    return Array.from(byYear.entries())
      .map(([year, v]) => ({ year, externalDebt: v.ext, debtToGDP: v.ratio }))
      .sort((a, b) => a.year - b.year);
  })();

  const svgW = 700;
  const svgH = 300;
  const padL = 55;
  const padR = 30;
  const padT = 30;
  const padB = 40;
  const innerW = svgW - padL - padR;
  const innerH = svgH - padT - padB;

  const maxDebt = activeTimelineData.length > 0
    ? Math.max(...activeTimelineData.map((d) => d.externalDebt)) * 1.1
    : 200;
  const minYear = activeTimelineData[0]?.year ?? 2015;
  const maxYear = activeTimelineData[activeTimelineData.length - 1]?.year ?? 2024;
  const yearRange = maxYear - minYear || 1;

  const xScale = (year: number) => padL + ((year - minYear) / yearRange) * innerW;
  const yScale = (val: number) => padT + (1 - val / maxDebt) * innerH;

  const linePath = activeTimelineData
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(d.year)} ${yScale(d.externalDebt)}`)
    .join(" ");

  const areaPath = activeTimelineData.length > 0
    ? `${linePath} L ${xScale(maxYear)} ${padT + innerH} L ${xScale(minYear)} ${padT + innerH} Z`
    : "";

  const hovered = hoveredYear ? activeTimelineData.find((d) => d.year === hoveredYear) : null;

  return (
    <Skeleton name="debt-timeline" loading={isLoading}>
    <div className="flex flex-col gap-3">
      {!isLoading && activeTimelineData.length === 0 ? (
        <p className="text-center text-muted-foreground py-20">{isAr ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0645\u062a\u0627\u062d\u0629" : "No data available"}</p>
      ) : (
        <>
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="w-full"
            style={{ minWidth: "360px", height: "300px" }}
            onMouseLeave={() => setHoveredYear(null)}
          >
            {/* Grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
              const y = padT + (1 - frac) * innerH;
              const val = Math.round((maxDebt * frac) / 10) * 10;
              return (
                <g key={frac}>
                  <line x1={padL} y1={y} x2={svgW - padR} y2={y} stroke="#252A36" strokeWidth={0.5} />
                  <text x={padL - 8} y={y} textAnchor="end" dominantBaseline="middle" fill="#7A8299" fontSize={9} fontFamily="var(--font-mono)">
                    {fmtB(val)}
                  </text>
                </g>
              );
            })}

            {/* Area fill */}
            {areaPath && <path d={areaPath} fill="#C9A84C" opacity={0.05} />}

            {/* Line */}
            {linePath && <path d={linePath} fill="none" stroke="#C9A84C" strokeWidth={2} />}

            {/* Event vertical lines */}
            {activeTimelineData
              .filter((d) => d.event)
              .map((d) => (
                <line
                  key={d.year}
                  x1={xScale(d.year)}
                  y1={yScale(d.externalDebt) - 8}
                  x2={xScale(d.year)}
                  y2={padT + 4}
                  stroke="#E76F51"
                  strokeWidth={0.8}
                  strokeDasharray="3 3"
                  opacity={0.6}
                />
              ))}

            {/* Data points */}
            {activeTimelineData.map((d) => {
              const isHov = hoveredYear === d.year;
              return (
                <circle
                  key={d.year}
                  cx={xScale(d.year)}
                  cy={yScale(d.externalDebt)}
                  r={isHov ? 5 : d.event ? 4 : 3}
                  fill={d.event ? "#E76F51" : "#C9A84C"}
                  stroke="#0F1117"
                  strokeWidth={1.5}
                  className="cursor-pointer transition-all duration-100"
                  onMouseEnter={() => setHoveredYear(d.year)}
                />
              );
            })}

            {/* Year labels */}
            {activeTimelineData.filter((_, i) => i % 2 === 0 || activeTimelineData[i].event).map((d) => (
              <text
                key={d.year}
                x={xScale(d.year)}
                y={svgH - 8}
                textAnchor="middle"
                fill="#7A8299"
                fontSize={9}
                fontFamily="var(--font-mono)"
              >
                {d.year}
              </text>
            ))}

            {/* Tooltip */}
            {hovered && (() => {
              const hx = xScale(hovered.year);
              const hy = yScale(hovered.externalDebt);
              const boxW = 160;
              const boxH = hovered.event ? 62 : 46;
              const tx = Math.min(Math.max(hx - boxW / 2, 4), svgW - boxW - 4);
              const ty = Math.max(hy - boxH - 14, 4);
              return (
                <g style={{ pointerEvents: "none" }}>
                  <rect x={tx} y={ty} width={boxW} height={boxH} rx={6} fill="#1E2330" fillOpacity={0.92} stroke="#333A4A" strokeWidth={0.5} />
                  <text x={tx + 8} y={ty + 14} fill="#C9A84C" fontSize={10} fontFamily="var(--font-mono)" fontWeight="600">
                    {hovered.year}
                  </text>
                  <text x={tx + 8} y={ty + 27} fill="#E8ECF4" fontSize={9} fontFamily="var(--font-mono)">
                    {fmtB(hovered.externalDebt)} \u00b7 {hovered.debtToGDP}% GDP
                  </text>
                  {hovered.event && (
                    <text x={tx + 8} y={ty + 40} fill="#E76F51" fontSize={7} fontFamily="var(--font-sans)">
                      {isAr ? hovered.eventAr : hovered.event}
                    </text>
                  )}
                </g>
              );
            })()}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 rounded bg-amber-400 inline-block" />
            {isAr ? "\u0627\u0644\u062f\u064a\u0646 \u0627\u0644\u062e\u0627\u0631\u062c\u064a (\u0645\u0644\u064a\u0627\u0631 \u062f\u0648\u0644\u0627\u0631)" : `External Debt (${symbol} B)`}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" />
            {isAr ? "\u062d\u062f\u062b \u0631\u0626\u064a\u0633\u064a" : "Key event"}
          </span>
        </div>
        </>
      )}

      <a href="https://cbe.org.eg" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
        cbe.org.eg
      </a>
    </div>
    </Skeleton>
  );
}

// ─── Creditor Breakdown ───────────────────────────────────────────────────────

function CreditorBreakdown() {
  const { lang } = useLanguage();
  const { symbol, fromEGP, fmt } = useCurrency();
  const isAr = lang === "ar";
  const [sortBy, setSortBy] = useState<"amount">("amount");

  const convexLatest = useQuery(api.debt.getLatestDebtRecord);
  const isCreditorLoading = convexLatest === undefined;
  const CREDITOR_COLORS = ["#6C8EEF", "#2EC4B6", "#C9A84C", "#E76F51", "#9B72CF", "#E5484D", "#525C72"];

  const fmtB = (v: number) => `${fmt(fromEGP(v * 1e6), { compact: true })} ${symbol}`;

  // Map creditors from Convex latest record
  interface ConvexCreditor {
    creditorName: string;
    creditorNameAr?: string;
    amountMillions: number;
  }
  const rawCreditors: ConvexCreditor[] = (convexLatest?.creditors as unknown as ConvexCreditor[] | undefined) ?? [];
  const sorted = [...rawCreditors]
    .map((c, i) => ({ ...c, color: CREDITOR_COLORS[i % CREDITOR_COLORS.length] }))
    .sort((a, b) => b.amountMillions - a.amountMillions);
  const totalOwed = sorted.reduce((s, c) => s + c.amountMillions, 0);

  return (
    <Skeleton name="debt-creditors" loading={isCreditorLoading}>
    <div className="flex flex-col gap-6">
      {!isCreditorLoading && sorted.length === 0 ? (
        <p className="text-center text-muted-foreground py-20">{isAr ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0645\u062a\u0627\u062d\u0629" : "No data available"}</p>
      ) : (
        <>
        {/* Sort label */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {isAr ? "\u062a\u0631\u062a\u064a\u0628 \u062d\u0633\u0628:" : "Sort by:"}
          </span>
          <button
            onClick={() => setSortBy("amount")}
            className={cn(
              "text-xs px-3 py-1 rounded-full border transition-colors",
              sortBy === "amount"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent text-muted-foreground border-border hover:border-primary/50"
            )}
          >
            {isAr ? "\u0627\u0644\u0645\u0628\u0644\u063a" : "Amount"}
          </button>
        </div>

        {/* Visual bars */}
        <div className="flex flex-col gap-3">
          {sorted.map((creditor) => (
            <div key={creditor.creditorName} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
                <div>
                  <span className="text-sm font-semibold text-foreground">
                    {isAr ? (creditor.creditorNameAr ?? creditor.creditorName) : creditor.creditorName}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-lg font-bold tabular-nums" style={{ color: creditor.color }}>
                    {fmtB(creditor.amountMillions)}
                  </p>
                </div>
              </div>
              {/* Share bar */}
              <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: totalOwed > 0 ? `${(creditor.amountMillions / totalOwed) * 100}%` : "0%", background: creditor.color }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Summary table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {isAr ? "\u0627\u0644\u062f\u0627\u0626\u0646" : "Creditor"}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  {isAr ? "\u0627\u0644\u0645\u0628\u0644\u063a \u0627\u0644\u0645\u062a\u0628\u0642\u064a" : "Outstanding"}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right hidden md:table-cell">
                  {isAr ? "% \u0645\u0646 \u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a" : "% of total"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((creditor) => {
                const pct = totalOwed > 0 ? ((creditor.amountMillions / totalOwed) * 100).toFixed(1) : "0.0";
                return (
                  <TableRow key={creditor.creditorName} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: creditor.color }} />
                        <span className="text-sm text-foreground">
                          {isAr ? (creditor.creditorNameAr ?? creditor.creditorName) : creditor.creditorName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono tabular-nums text-sm text-foreground">
                        {fmtB(creditor.amountMillions)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell">
                      <span className="font-mono tabular-nums text-sm text-muted-foreground">{pct}%</span>
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/30 border-t-2 border-border">
                <TableCell>
                  <span className="text-sm font-semibold text-foreground">{isAr ? "\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a" : "Total"}</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-mono font-semibold tabular-nums text-sm text-foreground">
                    {fmtB(totalOwed)}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell" />
              </TableRow>
            </TableBody>
          </Table>
        </div>
        </>
      )}

      <div className="flex gap-4">
        <a href="https://cbe.org.eg" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">cbe.org.eg</a>
        <a href="https://worldbank.org" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">worldbank.org</a>
        <a href="https://imf.org" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">imf.org</a>
      </div>
    </div>
    </Skeleton>
  );
}

// ─── Regional Comparison (static reference data — no Convex equivalent) ───────

function RegionalComparison() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const maxGDP = Math.max(...regionalData.map((c) => c.debtToGDP));
  const sorted = [...regionalData].sort((a, b) => b.debtToGDP - a.debtToGDP);

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {isAr ? "\u0627\u0644\u0645\u0642\u0627\u0631\u0646\u0629 \u0627\u0644\u0625\u0642\u0644\u064a\u0645\u064a\u0629" : "Regional Comparison"}
        </span>
        <span className="text-xs text-muted-foreground font-mono">
          {isAr ? "\u0646\u0633\u0628\u0629 \u0627\u0644\u062f\u064a\u0646 / \u0627\u0644\u0646\u0627\u062a\u062c \u0627\u0644\u0645\u062d\u0644\u064a %" : "Debt-to-GDP %"}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {sorted.map((country) => {
          const pct = (country.debtToGDP / maxGDP) * 100;
          return (
            <div key={country.nameEn} className="flex items-center gap-3">
              <span
                className={cn(
                  "text-sm shrink-0",
                  country.isEgypt ? "font-bold text-foreground w-36" : "text-muted-foreground w-36"
                )}
              >
                {isAr ? country.nameAr : country.nameEn}
                {country.isEgypt && (
                  <span className="ms-1 text-xs text-primary">&#x25C4;</span>
                )}
              </span>
              <div className="flex-1 h-5 bg-muted/20 rounded-sm overflow-hidden">
                <div
                  className="h-full rounded-sm transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: country.color,
                    opacity: country.isEgypt ? 0.95 : 0.55,
                  }}
                />
              </div>
              <span
                className={cn(
                  "font-mono text-sm shrink-0 w-12 text-right tabular-nums",
                  country.isEgypt ? "font-bold text-foreground" : "text-muted-foreground"
                )}
              >
                {country.debtToGDP}%
              </span>
            </div>
          );
        })}
      </div>

      <a href="https://worldbank.org" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
        worldbank.org
      </a>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DebtPage() {
  const { t, lang, dir } = useLanguage();
  const { symbol, fromEGP, fmt } = useCurrency();
  const isAr = lang === "ar";
  const [activeTab, setActiveTab] = useState<"timeline" | "creditors" | "regional">("timeline");

  // Wire to Convex
  const convexTimeline = useQuery(api.debt.getDebtTimeline);
  const convexLatest = useQuery(api.debt.getLatestDebtRecord);

  const isPageLoading = convexTimeline === undefined || convexLatest === undefined;

  const latestRecord = convexLatest
    ? {
        externalDebt: convexLatest.totalExternalDebt ?? 0,
        debtToGDP: convexLatest.debtToGdpRatio ?? 0,
        year: new Date(convexLatest.date).getFullYear(),
      }
    : null;

  const earliestRecord =
    !isPageLoading && convexTimeline.length > 0
      ? {
          externalDebt: convexTimeline[0].totalExternalDebt ?? 0,
          year: new Date(convexTimeline[0].date).getFullYear(),
        }
      : null;

  const increasePercent =
    latestRecord && earliestRecord && earliestRecord.externalDebt > 0
      ? Math.round(((latestRecord.externalDebt - earliestRecord.externalDebt) / earliestRecord.externalDebt) * 100)
      : null;

  const fmtDebt = (v: number) => `${fmt(fromEGP(v * 1e9), { compact: true })} ${symbol}`;

  const tabs = [
    { id: "timeline" as const, labelAr: "\u0645\u0633\u0627\u0631 \u0627\u0644\u062f\u064a\u0646", labelEn: "Timeline" },
    { id: "creditors" as const, labelAr: "\u0627\u0644\u062f\u0627\u0626\u0646\u0648\u0646", labelEn: "Creditors" },
    { id: "regional" as const, labelAr: "\u0645\u0642\u0627\u0631\u0646\u0629 \u0625\u0642\u0644\u064a\u0645\u064a\u0629", labelEn: "Regional" },
  ];

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page flex flex-col gap-10">

        {/* Header */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {isAr ? "\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0627\u0644\u064a\u0629 \u0627\u0644\u0643\u0644\u064a\u0629" : "Macro-Financial Data"}
          </p>
          <h1 className="text-3xl font-bold text-foreground mb-1">
            {isAr ? "\u0627\u0644\u062f\u064a\u0646 \u0627\u0644\u0639\u0627\u0645" : "National Debt"}
          </h1>
          <p className="text-sm text-muted-foreground">{t.debtDesc}</p>
        </div>

        {/* Key Metrics */}
        <Skeleton name="debt-key-metrics" loading={isPageLoading}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="pt-5 pb-5">
              <p className="text-xs text-muted-foreground mb-1">
                {isAr ? "\u0627\u0644\u062f\u064a\u0646 \u0627\u0644\u062e\u0627\u0631\u062c\u064a" : "External Debt"}
                {latestRecord && ` ${latestRecord.year}`}
              </p>
              <p className="font-mono text-3xl font-bold tabular-nums text-amber-400">
                {latestRecord ? fmtDebt(latestRecord.externalDebt) : "\u2014"}
              </p>
              <a href="https://cbe.org.eg" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">
                cbe.org.eg
              </a>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-5 pb-5">
              <p className="text-xs text-muted-foreground mb-1">
                {isAr ? "\u0646\u0633\u0628\u0629 \u0627\u0644\u062f\u064a\u0646 / \u0627\u0644\u0646\u0627\u062a\u062c" : "Debt-to-GDP"}
              </p>
              <p className="font-mono text-3xl font-bold tabular-nums text-foreground" dir="ltr">
                {latestRecord ? `${latestRecord.debtToGDP}%` : "\u2014"}
              </p>
            </CardContent>
          </Card>

          {increasePercent !== null && earliestRecord && (
            <Card className="bg-card border-red-900/30 border">
              <CardContent className="pt-5 pb-5">
                <p className="text-xs text-muted-foreground mb-1">
                  {isAr ? `\u0627\u0644\u0632\u064a\u0627\u062f\u0629 \u0645\u0646\u0630 ${earliestRecord.year}` : `Rise since ${earliestRecord.year}`}
                </p>
                <p className="font-mono text-3xl font-bold tabular-nums text-red-400" dir="ltr">
                  +{increasePercent}%
                </p>
              </CardContent>
            </Card>
          )}
        </div>
        </Skeleton>

        {/* Tabs */}
        <div className="flex flex-col gap-6">
          <div className="flex gap-1 border-b border-border overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "text-sm px-4 py-2.5 shrink-0 border-b-2 transition-colors font-medium",
                  activeTab === tab.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                {isAr ? tab.labelAr : tab.labelEn}
              </button>
            ))}
          </div>

          {activeTab === "timeline" && <DebtTimeline />}
          {activeTab === "creditors" && <CreditorBreakdown />}
          {activeTab === "regional" && <RegionalComparison />}
        </div>

      </div>
    </div>
  );
}
