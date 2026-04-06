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
  domesticDebt: number;
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
  const { symbol, fromUSD, fromEGP, fmt } = useCurrency();
  const isAr = lang === "ar";
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);

  // External debt in USD billions, domestic in EGP billions — both converted to user's currency
  const fmtExtB = (v: number) => `${fmt(fromUSD(v), { compact: true })}B ${symbol}`;
  const fmtDomB = (v: number) => `${fmt(fromEGP(v), { compact: true })}B ${symbol}`;
  const fmtTotalB = (ext: number, dom: number) =>
    `${fmt(fromUSD(ext) + fromEGP(dom), { compact: true })}B ${symbol}`;

  const convexTimeline = useQuery(api.debt.getDebtTimeline);
  const isLoading = convexTimeline === undefined;

  // Deduplicate by year -- keep the latest record per year (e.g., 2024-12-31 over 2024-06-30)
  const activeTimelineData: TimelineDataPoint[] = (() => {
    if (isLoading || convexTimeline.length === 0) return [];
    const byYear = new Map<number, { date: string; ext: number; dom: number; ratio: number }>();
    for (const r of convexTimeline) {
      const year = new Date(r.date).getFullYear();
      const prev = byYear.get(year);
      if (!prev || r.date > prev.date) {
        byYear.set(year, {
          date: r.date,
          ext: r.totalExternalDebt ?? 0,
          dom: r.totalDomesticDebt ?? 0,
          ratio: r.debtToGdpRatio ?? 0,
        });
      }
    }
    return Array.from(byYear.entries())
      .map(([year, v]) => ({ year, externalDebt: v.ext, domesticDebt: v.dom, debtToGDP: v.ratio }))
      .sort((a, b) => a.year - b.year);
  })();

  const svgW = 700;
  const svgH = 300;
  const padL = 60;
  const padR = 30;
  const padT = 30;
  const padB = 40;
  const innerW = svgW - padL - padR;
  const innerH = svgH - padT - padB;

  // Convert both series to user's selected currency for comparable stacking
  const convertedData = activeTimelineData.map((d) => ({
    ...d,
    extConverted: fromUSD(d.externalDebt),
    domConverted: fromEGP(d.domesticDebt),
    totalConverted: fromUSD(d.externalDebt) + fromEGP(d.domesticDebt),
  }));

  const maxTotal =
    convertedData.length > 0
      ? Math.max(...convertedData.map((d) => d.totalConverted)) * 1.15
      : 200;

  const minYear = activeTimelineData[0]?.year ?? 2015;
  const maxYear = activeTimelineData[activeTimelineData.length - 1]?.year ?? 2024;
  const yearRange = maxYear - minYear || 1;

  const xScale = (year: number) => padL + ((year - minYear) / yearRange) * innerW;
  // yScale operates on already-converted values
  const yScale = (val: number) => padT + (1 - val / maxTotal) * innerH;
  const baseline = padT + innerH;

  // Stacked area: external (bottom layer) from 0 → extConverted
  const extAreaPath =
    convertedData.length > 0
      ? [
          ...convertedData.map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(d.year)} ${yScale(d.extConverted)}`),
          `L ${xScale(maxYear)} ${baseline}`,
          `L ${xScale(minYear)} ${baseline}`,
          "Z",
        ].join(" ")
      : "";

  // Domestic (top layer) from extConverted → totalConverted
  const domAreaPath =
    convertedData.length > 0
      ? [
          ...convertedData.map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(d.year)} ${yScale(d.totalConverted)}`),
          // trace back along the top of the external area
          ...[...convertedData].reverse().map((d) => `L ${xScale(d.year)} ${yScale(d.extConverted)}`),
          "Z",
        ].join(" ")
      : "";

  // Total line path
  const totalLinePath =
    convertedData.length > 0
      ? convertedData.map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(d.year)} ${yScale(d.totalConverted)}`).join(" ")
      : "";

  // External boundary line
  const extLinePath =
    convertedData.length > 0
      ? convertedData.map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(d.year)} ${yScale(d.extConverted)}`).join(" ")
      : "";

  const hovered = hoveredYear != null ? convertedData.find((d) => d.year === hoveredYear) : null;

  // Y-axis labels using converted max
  const fmtAxisVal = (v: number) => fmt(v, { compact: true });

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
              const val = maxTotal * frac;
              return (
                <g key={frac}>
                  <line x1={padL} y1={y} x2={svgW - padR} y2={y} stroke="#252A36" strokeWidth={0.5} />
                  <text x={padL - 6} y={y} textAnchor="end" dominantBaseline="middle" fill="#7A8299" fontSize={9} fontFamily="var(--font-mono)">
                    {fmtAxisVal(val)}
                  </text>
                </g>
              );
            })}

            {/* Stacked area — external (gold, bottom) */}
            {extAreaPath && <path d={extAreaPath} fill="#C9A84C" opacity={0.35} />}

            {/* Stacked area — domestic (blue, top) */}
            {domAreaPath && <path d={domAreaPath} fill="#6C8EEF" opacity={0.35} />}

            {/* External boundary line */}
            {extLinePath && <path d={extLinePath} fill="none" stroke="#C9A84C" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.7} />}

            {/* Total line */}
            {totalLinePath && <path d={totalLinePath} fill="none" stroke="#E8ECF4" strokeWidth={2} opacity={0.9} />}

            {/* Hover hit-area circles (invisible, full height for easy hover) */}
            {convertedData.map((d) => (
              <rect
                key={d.year}
                x={xScale(d.year) - (innerW / (2 * (convertedData.length || 1)))}
                y={padT}
                width={innerW / (convertedData.length || 1)}
                height={innerH}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredYear(d.year)}
              />
            ))}

            {/* Data point dots on total line */}
            {convertedData.map((d) => {
              const isHov = hoveredYear === d.year;
              return (
                <circle
                  key={d.year}
                  cx={xScale(d.year)}
                  cy={yScale(d.totalConverted)}
                  r={isHov ? 5 : 3}
                  fill="#E8ECF4"
                  stroke="#0F1117"
                  strokeWidth={1.5}
                  style={{ pointerEvents: "none" }}
                />
              );
            })}

            {/* Hovered year vertical line */}
            {hovered && (
              <line
                x1={xScale(hovered.year)}
                y1={padT}
                x2={xScale(hovered.year)}
                y2={baseline}
                stroke="#7A8299"
                strokeWidth={0.8}
                strokeDasharray="3 3"
                opacity={0.5}
                style={{ pointerEvents: "none" }}
              />
            )}

            {/* Year labels */}
            {convertedData.filter((_, i) => i % 2 === 0).map((d) => (
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
              const hy = yScale(hovered.totalConverted);
              const boxW = isAr ? 220 : 190;
              const boxH = 78;
              const tx = Math.min(Math.max(hx - boxW / 2, 4), svgW - boxW - 4);
              const ty = Math.max(hy - boxH - 14, 4);
              return (
                <g style={{ pointerEvents: "none" }}>
                  <rect x={tx} y={ty} width={boxW} height={boxH} rx={6} fill="#1E2330" fillOpacity={0.96} stroke="#333A4A" strokeWidth={0.5} />
                  <text x={tx + 10} y={ty + 16} fill="#E8ECF4" fontSize={11} fontFamily="var(--font-mono)" fontWeight="700">
                    {hovered.year}
                    {"  "}
                    <tspan fill="#7A8299" fontSize={9} fontWeight="400">{hovered.debtToGDP}% GDP</tspan>
                  </text>
                  {/* External row */}
                  <rect x={tx + 10} y={ty + 26} width={6} height={6} rx={1} fill="#C9A84C" />
                  <text x={tx + 20} y={ty + 32} fill="#C9A84C" fontSize={9} fontFamily={isAr ? "var(--font-sans)" : "var(--font-mono)"}>
                    {isAr ? "\u062e\u0627\u0631\u062c\u064a" : "External"}
                  </text>
                  <text x={tx + boxW - 10} y={ty + 32} fill="#C9A84C" fontSize={9} fontFamily="var(--font-mono)" textAnchor="end">
                    {fmtExtB(hovered.externalDebt)}
                  </text>
                  {/* Domestic row */}
                  <rect x={tx + 10} y={ty + 42} width={6} height={6} rx={1} fill="#6C8EEF" />
                  <text x={tx + 20} y={ty + 48} fill="#6C8EEF" fontSize={9} fontFamily={isAr ? "var(--font-sans)" : "var(--font-mono)"}>
                    {isAr ? "\u0645\u062d\u0644\u064a" : "Domestic"}
                  </text>
                  <text x={tx + boxW - 10} y={ty + 48} fill="#6C8EEF" fontSize={9} fontFamily="var(--font-mono)" textAnchor="end">
                    {fmtDomB(hovered.domesticDebt)}
                  </text>
                  {/* Total row */}
                  <line x1={tx + 10} y1={ty + 56} x2={tx + boxW - 10} y2={ty + 56} stroke="#333A4A" strokeWidth={0.5} />
                  <text x={tx + 10} y={ty + 68} fill="#E8ECF4" fontSize={9} fontFamily={isAr ? "var(--font-sans)" : "var(--font-mono)"} fontWeight="600">
                    {isAr ? "\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a" : "Total"}
                  </text>
                  <text x={tx + boxW - 10} y={ty + 68} fill="#E8ECF4" fontSize={9} fontFamily="var(--font-mono)" fontWeight="600" textAnchor="end">
                    {fmtTotalB(hovered.externalDebt, hovered.domesticDebt)}
                  </text>
                </g>
              );
            })()}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#C9A84C", opacity: 0.85 }} />
            {isAr ? "\u0627\u0644\u062f\u064a\u0646 \u0627\u0644\u062e\u0627\u0631\u062c\u064a (\u0628\u0627\u0644\u062f\u0648\u0644\u0627\u0631)" : `External Debt (USD)`}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#6C8EEF", opacity: 0.85 }} />
            {isAr ? "\u0627\u0644\u062f\u064a\u0646 \u0627\u0644\u0645\u062d\u0644\u064a (\u0628\u0627\u0644\u062c\u0646\u064a\u0647)" : `Domestic Debt (EGP)`}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 rounded inline-block" style={{ background: "#E8ECF4" }} />
            {isAr ? "\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a" : `Total (${symbol})`}
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
  const { symbol, fromUSD, fmt } = useCurrency();
  const isAr = lang === "ar";
  const [sortBy, setSortBy] = useState<"amount">("amount");

  const convexLatest = useQuery(api.debt.getLatestDebtRecord);
  const isCreditorLoading = convexLatest === undefined;
  const CREDITOR_COLORS = ["#6C8EEF", "#2EC4B6", "#C9A84C", "#E76F51", "#9B72CF", "#E5484D", "#525C72"];

  // Creditor amounts are in billions USD (same unit as debt records)
  const fmtCreditor = (v: number) => `${fmt(fromUSD(v ?? 0), { decimals: 1 })}B ${symbol}`;

  // Map creditors from Convex latest record
  const rawCreditors = convexLatest?.creditors ?? [];
  const sorted = [...rawCreditors]
    .map((c, i) => ({
      creditorName: c.creditorEn,
      creditorNameAr: c.creditorAr,
      amount: c.amount ?? 0,
      creditorType: c.creditorType,
      percentageOfTotal: c.percentageOfTotal,
      color: CREDITOR_COLORS[i % CREDITOR_COLORS.length],
    }))
    .sort((a, b) => b.amount - a.amount);
  const totalOwed = sorted.reduce((s, c) => s + c.amount, 0);

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
                    {fmtCreditor(creditor.amount)}
                  </p>
                </div>
              </div>
              {/* Share bar */}
              <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: totalOwed > 0 ? `${(creditor.amount / totalOwed) * 100}%` : "0%", background: creditor.color }}
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
                const pct = totalOwed > 0 ? ((creditor.amount / totalOwed) * 100).toFixed(1) : "0.0";
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
                        {fmtCreditor(creditor.amount)}
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
                    {fmtCreditor(totalOwed)}
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
  const { symbol, fromUSD, fromEGP, fmt } = useCurrency();
  const isAr = lang === "ar";
  const [activeTab, setActiveTab] = useState<"timeline" | "creditors" | "regional">("timeline");

  // Wire to Convex
  const convexTimeline = useQuery(api.debt.getDebtTimeline);
  const convexLatest = useQuery(api.debt.getLatestDebtRecord);

  const isPageLoading = convexTimeline === undefined || convexLatest === undefined;

  // Build stat card data from the best available across recent records.
  // The WB API record (2024-12-31) only has external debt.
  // The CBE record (2024-06-30) has domestic debt + GDP ratio.
  // Use the most recent non-null value for each field.
  const latestRecord = (() => {
    if (!convexTimeline || convexTimeline.length === 0) return null;
    const sorted = [...convexTimeline].sort((a, b) => b.date.localeCompare(a.date));
    const extRecord = sorted.find((r) => r.totalExternalDebt != null && r.totalExternalDebt > 0);
    const domRecord = sorted.find((r) => r.totalDomesticDebt != null && r.totalDomesticDebt > 0);
    const gdpRecord = sorted.find((r) => r.debtToGdpRatio != null && r.debtToGdpRatio > 0);
    return {
      externalDebt: extRecord?.totalExternalDebt ?? 0,
      domesticDebt: domRecord?.totalDomesticDebt ?? 0,
      debtToGDP: gdpRecord?.debtToGdpRatio ?? 0,
      year: new Date(sorted[0].date).getFullYear(),
    };
  })();

  // Values in DB are in billions (ext in USD B, dom in EGP B)
  const fmtExtDebt = (v: number) => `${fmt(fromUSD(v), { decimals: 1 })}B ${symbol}`;
  const fmtDomDebt = (v: number) => `${fmt(fromEGP(v), { compact: true })}B ${symbol}`;
  const fmtTotalDebt = (ext: number, dom: number) =>
    `${fmt(fromUSD(ext) + fromEGP(dom), { compact: true })}B ${symbol}`;

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total debt */}
          <Card className="bg-card border-border md:col-span-1">
            <CardContent className="pt-5 pb-5">
              <p className="text-xs text-muted-foreground mb-1">
                {isAr ? "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062f\u064a\u0646" : "Total Debt"}
                {latestRecord && ` ${latestRecord.year}`}
              </p>
              <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
                {latestRecord
                  ? fmtTotalDebt(latestRecord.externalDebt, latestRecord.domesticDebt)
                  : "\u2014"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isAr ? "\u062e\u0627\u0631\u062c\u064a + \u0645\u062d\u0644\u064a" : "External + Domestic"}
              </p>
            </CardContent>
          </Card>

          {/* External debt */}
          <Card className="bg-card border-border">
            <CardContent className="pt-5 pb-5">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm inline-block" style={{ background: "#C9A84C" }} />
                {isAr ? "\u0627\u0644\u062f\u064a\u0646 \u0627\u0644\u062e\u0627\u0631\u062c\u064a" : "External Debt"}
              </p>
              <p className="font-mono text-2xl font-bold tabular-nums text-amber-400">
                {latestRecord ? fmtExtDebt(latestRecord.externalDebt) : "\u2014"}
              </p>
              <a href="https://cbe.org.eg" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">
                cbe.org.eg
              </a>
            </CardContent>
          </Card>

          {/* Domestic debt */}
          <Card className="bg-card border-border">
            <CardContent className="pt-5 pb-5">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm inline-block" style={{ background: "#6C8EEF" }} />
                {isAr ? "\u0627\u0644\u062f\u064a\u0646 \u0627\u0644\u0645\u062d\u0644\u064a" : "Domestic Debt"}
              </p>
              <p className="font-mono text-2xl font-bold tabular-nums" style={{ color: "#6C8EEF" }}>
                {latestRecord ? fmtDomDebt(latestRecord.domesticDebt) : "\u2014"}
              </p>
              <a href="https://mof.gov.eg" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">
                mof.gov.eg
              </a>
            </CardContent>
          </Card>

          {/* Debt-to-GDP */}
          <Card className="bg-card border-border">
            <CardContent className="pt-5 pb-5">
              <p className="text-xs text-muted-foreground mb-1">
                {isAr ? "\u0646\u0633\u0628\u0629 \u0627\u0644\u062f\u064a\u0646 / \u0627\u0644\u0646\u0627\u062a\u062c" : "Debt-to-GDP"}
              </p>
              <p className="font-mono text-2xl font-bold tabular-nums text-foreground" dir="ltr">
                {latestRecord ? `${latestRecord.debtToGDP}%` : "\u2014"}
              </p>
              <a href="https://worldbank.org" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">
                worldbank.org
              </a>
            </CardContent>
          </Card>
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
