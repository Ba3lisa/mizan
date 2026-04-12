"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useLanguage } from "@/components/providers";
import { fmtEGP, fmtUSD } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
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
import { SanadBadge } from "@/components/sanad-badge";

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

// Regional comparison countries -- fallback values, overridden by live WB data
const regionalData: RegionalCountry[] = [
  { nameAr: "\u0645\u0635\u0631", nameEn: "Egypt", debtToGDP: 0, color: "#C9A84C", isEgypt: true },
  { nameAr: "\u062a\u0631\u0643\u064a\u0627", nameEn: "Turkey", debtToGDP: 31.8, color: "#6C8EEF" },
  { nameAr: "\u0627\u0644\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0639\u0631\u0628\u064a\u0629 \u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629", nameEn: "Saudi Arabia", debtToGDP: 27.7, color: "#2EC4B6" },
  { nameAr: "\u0627\u0644\u0645\u063a\u0631\u0628", nameEn: "Morocco", debtToGDP: 62.4, color: "#E76F51" },
  { nameAr: "\u0646\u064a\u062c\u064a\u0631\u064a\u0627", nameEn: "Nigeria", debtToGDP: 37.5, color: "#9B72CF" },
  { nameAr: "\u062a\u0648\u0646\u0633", nameEn: "Tunisia", debtToGDP: 88.6, color: "#7A8299" },
];

// World Bank country codes for regional comparison
const _REGIONAL_WB_CODES: Record<string, string> = {
  "Egypt": "EGY",
  "Turkey": "TUR",
  "Saudi Arabia": "SAU",
  "Morocco": "MAR",
  "Nigeria": "NGA",
  "Tunisia": "TUN",
};

// ─── Debt Timeline SVG ────────────────────────────────────────────────────────

const EGP_PER_USD = 50.0;

function DebtTimeline() {
  const { t, lang } = useLanguage();
  const isAr = lang === "ar";
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);

  // External debt in USD billions, domestic in EGP billions
  const fmtExtB = (v: number) => fmtUSD(v * 1e9, { decimals: 1, compact: true });
  const fmtDomB = (v: number) => fmtEGP(v * 1e9, { compact: true });
  const fmtTotalB = (ext: number, dom: number) =>
    `${fmtUSD(ext * 1e9 + (dom * 1e9) / EGP_PER_USD, { compact: true })} (approx.)`;

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

  // Convert both series to USD billions for comparable stacking
  const convertedData = activeTimelineData.map((d) => ({
    ...d,
    extConverted: d.externalDebt,
    domConverted: d.domesticDebt / EGP_PER_USD,
    totalConverted: d.externalDebt + d.domesticDebt / EGP_PER_USD,
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

  // Y-axis labels -- values are in USD billions
  const fmtAxisVal = (v: number) => `$${Math.round(v)}B`;

  return (
    <Skeleton name="debt-timeline" loading={isLoading}>
    <div className="flex flex-col gap-3">
      {!isLoading && activeTimelineData.length === 0 ? (
        <p className="text-center text-muted-foreground py-20">{t.common_noData}</p>
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

            {/* Vertical hairline for hovered year */}
            {hovered && (
              <line x1={xScale(hovered.year)} y1={padT} x2={xScale(hovered.year)} y2={svgH - padB} stroke="#555" strokeWidth={0.5} strokeDasharray="3,3" />
            )}
          </svg>
        </div>

        {/* HTML tooltip -- renders outside SVG for proper RTL support */}
        {hovered && (
          <div
            className="absolute z-20 pointer-events-none bg-[#1E2330]/95 border border-[#333A4A] rounded-lg shadow-xl px-3 py-2.5 w-[220px]"
            dir={isAr ? "rtl" : "ltr"}
            style={{
              left: `clamp(0%, ${((xScale(hovered.year) - 100) / 400) * 100}%, calc(100% - 230px))`,
              top: `${Math.max(0, ((yScale(hovered.totalConverted) - 80) / 240) * 100)}%`,
              transform: "translate(0, calc(-100% - 16px))",
            }}
          >
            <div className="flex items-baseline justify-between gap-4 mb-1.5">
              <span className="font-mono text-xs font-bold text-[#E8ECF4]">{hovered.year}</span>
              <span className="text-[0.6rem] text-[#7A8299]">{hovered.debtToGDP}% GDP</span>
            </div>
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="flex items-center gap-1.5 text-[0.65rem] text-[#C9A84C]">
                <span className="w-1.5 h-1.5 rounded-sm bg-[#C9A84C] shrink-0" />
                {t.debt_external}
              </span>
              <span className="font-mono text-[0.65rem] text-[#C9A84C]">{fmtExtB(hovered.externalDebt)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <span className="flex items-center gap-1.5 text-[0.65rem] text-[#6C8EEF]">
                <span className="w-1.5 h-1.5 rounded-sm bg-[#6C8EEF] shrink-0" />
                {t.debt_domestic}
              </span>
              <span className="font-mono text-[0.65rem] text-[#6C8EEF]">{fmtDomB(hovered.domesticDebt)}</span>
            </div>
            <div className="border-t border-[#333A4A] pt-1 flex items-center justify-between gap-3">
              <span className="text-[0.65rem] font-semibold text-[#E8ECF4]">{t.common_total}</span>
              <span className="font-mono text-[0.65rem] font-semibold text-[#E8ECF4]">{fmtTotalB(hovered.externalDebt, hovered.domesticDebt)}</span>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#C9A84C", opacity: 0.85 }} />
            {t.debt_externalUSD}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#6C8EEF", opacity: 0.85 }} />
            {t.debt_domesticEGP}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 rounded inline-block" style={{ background: "#E8ECF4" }} />
            {t.debt_totalUSD}
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
  const { t, lang } = useLanguage();
  const isAr = lang === "ar";
  const [sortBy, setSortBy] = useState<"amount">("amount");

  const convexLatest = useQuery(api.debt.getLatestDebtRecord);
  const isCreditorLoading = convexLatest === undefined;
  const CREDITOR_COLORS = ["#6C8EEF", "#2EC4B6", "#C9A84C", "#E76F51", "#9B72CF", "#E5484D", "#525C72"];

  // Creditor amounts are in billions USD (same unit as debt records)
  const fmtCreditor = (v: number) => fmtUSD((v ?? 0) * 1e9, { decimals: 1, compact: true });

  // Map creditors from Convex latest record
  const rawCreditors = convexLatest?.creditors ?? [];
  const sorted = [...rawCreditors]
    .map((c, i) => ({
      creditorName: c.creditorEn,
      creditorNameAr: c.creditorAr,
      amount: c.amount ?? 0,
      creditorType: c.creditorType,
      percentageOfTotal: c.percentageOfTotal,
      interestRate: c.interestRate as number | undefined,
      annualDebtService: c.annualDebtService as number | undefined,
      maturityYears: c.maturityYears as number | undefined,
      termsNoteEn: c.termsNoteEn as string | undefined,
      termsNoteAr: c.termsNoteAr as string | undefined,
      color: CREDITOR_COLORS[i % CREDITOR_COLORS.length],
    }))
    .sort((a, b) => b.amount - a.amount);
  const totalOwed = sorted.reduce((s, c) => s + c.amount, 0);
  const totalAnnualInterest = sorted.reduce((s, c) => s + (c.annualDebtService ?? 0), 0);

  return (
    <Skeleton name="debt-creditors" loading={isCreditorLoading}>
    <div className="flex flex-col gap-6">
      {!isCreditorLoading && sorted.length === 0 ? (
        <p className="text-center text-muted-foreground py-20">{t.common_noData}</p>
      ) : (
        <>
        {/* Sort label */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {t.debt_sortBy}
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
            {t.debt_amount}
          </button>
        </div>

        {/* Debt type legend */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {[
            { type: "multilateral", labelKey: "debt_multilateral" as const, descKey: "debt_multilateralDesc" as const },
            { type: "bilateral", labelKey: "debt_bilateral" as const, descKey: "debt_bilateralDesc" as const },
            { type: "commercial", labelKey: "debt_commercial" as const, descKey: "debt_commercialDesc" as const },
          ].map((dt) => (
            <div key={dt.type} className="flex items-start gap-1.5 bg-muted/30 rounded-md px-2.5 py-1.5">
              <Badge variant="outline" className="text-[0.55rem] py-0 px-1.5 shrink-0 mt-0.5">{t[dt.labelKey]}</Badge>
              <span>{t[dt.descKey]}</span>
            </div>
          ))}
        </div>

        {/* Visual bars */}
        <div className="flex flex-col gap-3">
          {sorted.map((creditor) => (
            <div key={creditor.creditorName} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between mb-2 gap-3 flex-wrap">
                <div>
                  <span className="text-sm font-semibold text-foreground">
                    {isAr ? (creditor.creditorNameAr ?? creditor.creditorName) : creditor.creditorName}
                  </span>
                  <Badge variant="outline" className="text-[0.55rem] ms-2 py-0 px-1.5">
                    {{ multilateral: t.debt_multilateral, bilateral: t.debt_bilateral, commercial: t.debt_commercial, other: t.debt_other }[creditor.creditorType] ?? creditor.creditorType}
                  </Badge>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-lg font-bold tabular-nums" style={{ color: creditor.color }}>
                    {fmtCreditor(creditor.amount)}
                  </p>
                </div>
              </div>
              {/* Interest rate + annual cost + maturity */}
              {creditor.interestRate != null && (
                <div className="flex flex-wrap gap-4 mb-2 text-xs text-muted-foreground">
                  <span>
                    <span className="font-semibold text-foreground">{creditor.interestRate}%</span>
                    {" "}{t.debt_interest}
                  </span>
                  {creditor.annualDebtService != null && (
                    <span>
                      <span className="font-semibold text-red-400">{fmtCreditor(creditor.annualDebtService)}</span>
                      {" "}{t.debt_annualInterest}
                    </span>
                  )}
                  {creditor.maturityYears != null && (
                    <span>
                      <span className="font-semibold text-foreground">{creditor.maturityYears}</span>
                      {" "}{t.debt_yrMaturity}
                    </span>
                  )}
                </div>
              )}
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

        {/* Annual interest cost callout */}
        {totalAnnualInterest > 0 && (
          <Card className="border-red-900/30 bg-red-500/5">
            <CardContent className="pt-4 pb-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {t.debt_estAnnualInterest}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.debt_estAnnualInterestDesc}
                </p>
              </div>
              <p className="font-mono text-2xl font-bold text-red-400">
                {fmtCreditor(totalAnnualInterest)}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Summary table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.debt_creditor}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  {t.debt_outstanding}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right hidden md:table-cell">
                  {t.debt_pctOfTotal}
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
                  <span className="text-sm font-semibold text-foreground">{t.common_total}</span>
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
  const { t, lang } = useLanguage();
  const isAr = lang === "ar";

  // Use live Egypt debt-to-GDP from Convex instead of hardcoded value
  const convexTimeline = useQuery(api.debt.getDebtTimeline);
  const liveEgyptRatio = (() => {
    if (!convexTimeline || convexTimeline.length === 0) return 89.5;
    const sorted = [...convexTimeline].sort((a, b) => b.date.localeCompare(a.date));
    const withRatio = sorted.find((r) => r.debtToGdpRatio != null && r.debtToGdpRatio > 0);
    return withRatio?.debtToGdpRatio ?? 89.5;
  })();

  const liveRegionalData = regionalData.map((c) =>
    c.isEgypt ? { ...c, debtToGDP: liveEgyptRatio } : c
  );
  const maxGDP = Math.max(...liveRegionalData.map((c) => c.debtToGDP));
  const sorted = [...liveRegionalData].sort((a, b) => b.debtToGDP - a.debtToGDP);

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t.debt_regionalComparison}
        </span>
        <span className="text-xs text-muted-foreground font-mono">
          {t.debt_debtToGDPPct}
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
  const { t, dir } = useLanguage();
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
  const fmtExtDebt = (v: number) => fmtUSD(v * 1e9, { decimals: 1, compact: true });
  const fmtDomDebt = (v: number) => fmtEGP(v * 1e9, { compact: true });
  const fmtTotalDebt = (ext: number, dom: number) =>
    `${fmtUSD(ext * 1e9 + (dom * 1e9) / EGP_PER_USD, { compact: true })} (approx.)`;

  const tabs = [
    { id: "timeline" as const, labelKey: "debt_tabTimeline" as const },
    { id: "creditors" as const, labelKey: "debt_tabCreditors" as const },
    { id: "regional" as const, labelKey: "debt_tabRegional" as const },
  ];

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page flex flex-col gap-10">

        {/* Header */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t.debt_subtitle}
          </p>
          <h1 className="text-3xl font-bold text-foreground mb-1">
            {t.debt_title}
          </h1>
          <p className="text-sm text-muted-foreground">{t.debtDesc}</p>
        </div>

        {/* Key Metrics */}
        <Skeleton name="debt-key-metrics" loading={isPageLoading}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total debt */}
          <Card data-guide="debt-total" className="bg-card border-border md:col-span-1">
            <CardContent className="pt-5 pb-5">
              <p className="text-xs text-muted-foreground mb-1">
                {t.debt_totalDebt}
                {latestRecord && ` ${latestRecord.year}`}
              </p>
              <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
                {latestRecord
                  ? fmtTotalDebt(latestRecord.externalDebt, latestRecord.domesticDebt)
                  : "\u2014"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t.debt_extPlusDom}
              </p>
            </CardContent>
          </Card>

          {/* External debt */}
          <Card className="bg-card border-border">
            <CardContent className="pt-5 pb-5">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm inline-block" style={{ background: "#C9A84C" }} />
                {t.debt_externalDebt}
              </p>
              <p className="font-mono text-2xl font-bold tabular-nums text-amber-400 flex items-center gap-1.5">
                {latestRecord ? fmtExtDebt(latestRecord.externalDebt) : "\u2014"}
                {convexLatest?.sanadLevel && <SanadBadge sanadLevel={convexLatest.sanadLevel} sourceUrl={convexLatest?.sourceUrl} />}
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
                {t.debt_domesticDebt}
              </p>
              <p className="font-mono text-2xl font-bold tabular-nums flex items-center gap-1.5" style={{ color: "#6C8EEF" }}>
                {latestRecord ? fmtDomDebt(latestRecord.domesticDebt) : "\u2014"}
                {convexLatest?.sanadLevel && <SanadBadge sanadLevel={convexLatest.sanadLevel} sourceUrl={convexLatest?.sourceUrl} />}
              </p>
              <a href="https://mof.gov.eg" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">
                mof.gov.eg
              </a>
            </CardContent>
          </Card>

          {/* Debt-to-GDP */}
          <Card data-guide="debt-gdp-ratio" className="bg-card border-border">
            <CardContent className="pt-5 pb-5">
              <p className="text-xs text-muted-foreground mb-1">
                {t.debtToGDP}
              </p>
              <p className="font-mono text-2xl font-bold tabular-nums text-foreground flex items-center gap-1.5" dir="ltr">
                {latestRecord ? `${latestRecord.debtToGDP}%` : "\u2014"}
                {convexLatest?.sanadLevel && <SanadBadge sanadLevel={convexLatest.sanadLevel} sourceUrl={convexLatest?.sourceUrl} />}
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
                {t[tab.labelKey]}
              </button>
            ))}
          </div>

          {activeTab === "timeline" && <div data-guide="debt-chart"><DebtTimeline /></div>}
          {activeTab === "creditors" && <div data-guide="debt-creditors"><CreditorBreakdown /></div>}
          {activeTab === "regional" && <RegionalComparison />}
        </div>

      </div>
    </div>
  );
}
