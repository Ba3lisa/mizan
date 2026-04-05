"use client";

import { useState } from "react";
import { useLanguage } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface Creditor {
  nameAr: string;
  nameEn: string;
  amount: number;
  interestRate: number;
  annualPayment: number;
  totalBorrowed: number;
  yearStarted: number;
  color: string;
}

interface RegionalCountry {
  nameAr: string;
  nameEn: string;
  debtToGDP: number;
  color: string;
  isEgypt?: boolean;
}

interface DebtServiceYear {
  year: string;
  revenue: number;
  debtService: number;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const timelineData: TimelineDataPoint[] = [
  { year: 2015, externalDebt: 48.1, debtToGDP: 15.2 },
  {
    year: 2016,
    externalDebt: 67.3,
    debtToGDP: 36.8,
    event: "EGP Float + First IMF Deal ($12B)",
    eventAr: "تعويم الجنيه + صفقة صندوق النقد الأولى (12 مليار دولار)",
  },
  { year: 2017, externalDebt: 79.0, debtToGDP: 37.1 },
  { year: 2018, externalDebt: 92.6, debtToGDP: 37.5 },
  { year: 2019, externalDebt: 108.7, debtToGDP: 36.1 },
  {
    year: 2020,
    externalDebt: 123.5,
    debtToGDP: 41.2,
    event: "COVID-19 impact",
    eventAr: "تداعيات كوفيد-19",
  },
  { year: 2021, externalDebt: 137.9, debtToGDP: 43.5 },
  {
    year: 2022,
    externalDebt: 162.9,
    debtToGDP: 51.8,
    event: "Second IMF Deal ($3B) + Currency Crisis",
    eventAr: "صفقة صندوق النقد الثانية (3 مليار) + أزمة العملة",
  },
  { year: 2023, externalDebt: 155.2, debtToGDP: 47.2 },
  {
    year: 2024,
    externalDebt: 149.8,
    debtToGDP: 43.5,
    event: "Ras el-Hekma deal + EGP float",
    eventAr: "صفقة رأس الحكمة + تعويم الجنيه",
  },
];

const creditors: Creditor[] = [
  {
    nameAr: "صندوق النقد الدولي",
    nameEn: "IMF",
    amount: 13200,
    interestRate: 5.5,
    annualPayment: 2800,
    totalBorrowed: 20000,
    yearStarted: 2016,
    color: "#6C8EEF",
  },
  {
    nameAr: "البنك الدولي",
    nameEn: "World Bank",
    amount: 8500,
    interestRate: 2.1,
    annualPayment: 950,
    totalBorrowed: 12000,
    yearStarted: 2010,
    color: "#2EC4B6",
  },
  {
    nameAr: "المملكة العربية السعودية",
    nameEn: "Saudi Arabia",
    amount: 15200,
    interestRate: 3.0,
    annualPayment: 1200,
    totalBorrowed: 18000,
    yearStarted: 2013,
    color: "#C9A84C",
  },
  {
    nameAr: "الإمارات العربية المتحدة",
    nameEn: "UAE",
    amount: 11800,
    interestRate: 2.8,
    annualPayment: 980,
    totalBorrowed: 14000,
    yearStarted: 2014,
    color: "#E76F51",
  },
  {
    nameAr: "الكويت",
    nameEn: "Kuwait",
    amount: 4200,
    interestRate: 2.5,
    annualPayment: 380,
    totalBorrowed: 5000,
    yearStarted: 2015,
    color: "#9B72CF",
  },
  {
    nameAr: "سندات دولية (يوروبوند)",
    nameEn: "Eurobonds",
    amount: 28000,
    interestRate: 7.5,
    annualPayment: 4500,
    totalBorrowed: 35000,
    yearStarted: 2010,
    color: "#E5484D",
  },
  {
    nameAr: "بنوك تجارية",
    nameEn: "Commercial Banks",
    amount: 18500,
    interestRate: 6.2,
    annualPayment: 3200,
    totalBorrowed: 22000,
    yearStarted: 2012,
    color: "#525C72",
  },
];

const regionalData: RegionalCountry[] = [
  { nameAr: "مصر", nameEn: "Egypt", debtToGDP: 47.2, color: "#C9A84C", isEgypt: true },
  { nameAr: "تركيا", nameEn: "Turkey", debtToGDP: 31.8, color: "#6C8EEF" },
  { nameAr: "المملكة العربية السعودية", nameEn: "Saudi Arabia", debtToGDP: 27.7, color: "#2EC4B6" },
  { nameAr: "المغرب", nameEn: "Morocco", debtToGDP: 62.4, color: "#E76F51" },
  { nameAr: "نيجيريا", nameEn: "Nigeria", debtToGDP: 37.5, color: "#9B72CF" },
  { nameAr: "تونس", nameEn: "Tunisia", debtToGDP: 88.6, color: "#7A8299" },
];

const debtServiceHistory: DebtServiceYear[] = [
  { year: "2019-2020", revenue: 906, debtService: 478 },
  { year: "2020-2021", revenue: 992, debtService: 540 },
  { year: "2021-2022", revenue: 1068, debtService: 620 },
  { year: "2022-2023", revenue: 1252, debtService: 750 },
  { year: "2023-2024", revenue: 1474, debtService: 870 },
];

// ─── Debt Timeline SVG ────────────────────────────────────────────────────────

function DebtTimeline() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);

  const svgW = 700;
  const svgH = 300;
  const padL = 55;
  const padR = 30;
  const padT = 30;
  const padB = 40;
  const innerW = svgW - padL - padR;
  const innerH = svgH - padT - padB;

  const maxDebt = Math.max(...timelineData.map((d) => d.externalDebt)) * 1.1;
  const minYear = timelineData[0].year;
  const maxYear = timelineData[timelineData.length - 1].year;
  const yearRange = maxYear - minYear;

  const xScale = (year: number) => padL + ((year - minYear) / yearRange) * innerW;
  const yScale = (val: number) => padT + (1 - val / maxDebt) * innerH;

  const linePath = timelineData
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(d.year)} ${yScale(d.externalDebt)}`)
    .join(" ");

  const areaPath = `${linePath} L ${xScale(maxYear)} ${padT + innerH} L ${xScale(minYear)} ${padT + innerH} Z`;

  const hovered = hoveredYear ? timelineData.find((d) => d.year === hoveredYear) : null;

  return (
    <div className="flex flex-col gap-3">
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
                  ${val}B
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaPath} fill="#C9A84C" opacity={0.05} />

          {/* Line */}
          <path d={linePath} fill="none" stroke="#C9A84C" strokeWidth={2} />

          {/* Event vertical lines */}
          {timelineData
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
          {timelineData.map((d) => {
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
          {timelineData.filter((_, i) => i % 2 === 0 || timelineData[i].event).map((d) => (
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
            const tx = Math.min(xScale(hovered.year) + 16, svgW - 170);
            const ty = Math.max(yScale(hovered.externalDebt) - 75, 4);
            const boxH = hovered.event ? 72 : 52;
            return (
              <g style={{ pointerEvents: "none" }}>
                <rect x={tx} y={ty} width={160} height={boxH} rx={6} fill="#1E2330" fillOpacity={0.95} stroke="#333A4A" strokeWidth={0.5} />
                <text x={tx + 10} y={ty + 16} fill="#C9A84C" fontSize={11} fontFamily="var(--font-mono)" fontWeight="600">
                  {hovered.year}
                </text>
                <text x={tx + 10} y={ty + 30} fill="#E8ECF4" fontSize={10} fontFamily="var(--font-mono)">
                  ${hovered.externalDebt}B {isAr ? "ديون خارجية" : "external debt"}
                </text>
                <text x={tx + 10} y={ty + 44} fill="#7A8299" fontSize={9} fontFamily="var(--font-mono)">
                  {hovered.debtToGDP}% {isAr ? "من الناتج المحلي" : "of GDP"}
                </text>
                {hovered.event && (
                  <text x={tx + 10} y={ty + 62} fill="#E76F51" fontSize={8} fontFamily="var(--font-sans)">
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
          {isAr ? "الدين الخارجي (مليار دولار)" : "External Debt (USD B)"}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" />
          {isAr ? "حدث رئيسي" : "Key event"}
        </span>
      </div>

      <a href="https://cbe.org.eg" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
        cbe.org.eg
      </a>
    </div>
  );
}

// ─── Creditor Breakdown ───────────────────────────────────────────────────────

function CreditorBreakdown() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const [sortBy, setSortBy] = useState<"amount" | "rate">("amount");

  const totalOwed = creditors.reduce((s, c) => s + c.amount, 0);

  const sorted = [...creditors].sort((a, b) =>
    sortBy === "amount" ? b.amount - a.amount : b.interestRate - a.interestRate
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Sort toggles */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {isAr ? "ترتيب حسب:" : "Sort by:"}
        </span>
        {(["amount", "rate"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={cn(
              "text-xs px-3 py-1 rounded-full border transition-colors",
              sortBy === s
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent text-muted-foreground border-border hover:border-primary/50"
            )}
          >
            {s === "amount"
              ? isAr ? "المبلغ" : "Amount"
              : isAr ? "معدل الفائدة" : "Interest Rate"}
          </button>
        ))}
      </div>

      {/* Visual bars */}
      <div className="flex flex-col gap-3">
        {sorted.map((creditor) => {
          const paidPct = Math.round(
            ((creditor.totalBorrowed - creditor.amount) / creditor.totalBorrowed) * 100
          );
          const remainPct = 100 - paidPct;
          const isHighRate = creditor.interestRate >= 6;

          return (
            <div key={creditor.nameEn} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">
                      {isAr ? creditor.nameAr : creditor.nameEn}
                    </span>
                    {isHighRate && (
                      <Badge variant="destructive" className="text-xs px-1.5 py-0">
                        {isAr ? "فائدة مرتفعة" : "High Rate"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isAr ? "منذ" : "Since"} {creditor.yearStarted}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-lg font-bold tabular-nums" style={{ color: creditor.color }}>
                    ${(creditor.amount / 1000).toFixed(1)}B
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {creditor.interestRate}% {isAr ? "سنوياً" : "p.a."}
                  </p>
                </div>
              </div>

              {/* Progress bar: paid vs remaining */}
              <div className="mb-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{isAr ? "تم السداد" : "Repaid"}: {paidPct}%</span>
                  <span>{isAr ? "متبقي" : "Remaining"}: {remainPct}%</span>
                </div>
                <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${paidPct}%`, background: creditor.color }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-2">
                <span>
                  {isAr ? "الدفع السنوي:" : "Annual payment:"}
                  {" "}
                  <span className="font-mono text-foreground">${(creditor.annualPayment / 1000).toFixed(1)}B</span>
                </span>
                <span>
                  {isAr ? "إجمالي الاقتراض:" : "Total borrowed:"}
                  {" "}
                  <span className="font-mono text-foreground">${(creditor.totalBorrowed / 1000).toFixed(1)}B</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {isAr ? "الدائن" : "Creditor"}
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                {isAr ? "المبلغ المتبقي" : "Outstanding"}
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                {isAr ? "الفائدة %" : "Rate %"}
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right hidden md:table-cell">
                {isAr ? "% من الإجمالي" : "% of total"}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((creditor) => {
              const pct = ((creditor.amount / totalOwed) * 100).toFixed(1);
              const isHighRate = creditor.interestRate >= 6;
              return (
                <TableRow key={creditor.nameEn} className={cn("hover:bg-muted/30 transition-colors", isHighRate && "bg-red-950/10")}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: creditor.color }} />
                      <span className="text-sm text-foreground">
                        {isAr ? creditor.nameAr : creditor.nameEn}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-mono tabular-nums text-sm text-foreground">
                      ${(creditor.amount / 1000).toFixed(1)}B
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn("font-mono tabular-nums text-sm", isHighRate ? "text-red-400 font-semibold" : "text-muted-foreground")}>
                      {creditor.interestRate}%
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
                <span className="text-sm font-semibold text-foreground">{isAr ? "الإجمالي" : "Total"}</span>
              </TableCell>
              <TableCell className="text-right">
                <span className="font-mono font-semibold tabular-nums text-sm text-foreground">
                  ${(totalOwed / 1000).toFixed(1)}B
                </span>
              </TableCell>
              <TableCell />
              <TableCell className="hidden md:table-cell" />
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="flex gap-4">
        <a href="https://cbe.org.eg" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">cbe.org.eg</a>
        <a href="https://worldbank.org" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">worldbank.org</a>
        <a href="https://imf.org" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">imf.org</a>
      </div>
    </div>
  );
}

// ─── Debt Service vs Revenue Chart ───────────────────────────────────────────

function DebtServiceChart() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const svgW = 600;
  const svgH = 260;
  const padL = 55;
  const padR = 20;
  const padT = 20;
  const padB = 40;
  const innerW = svgW - padL - padR;
  const innerH = svgH - padT - padB;
  const maxVal = Math.max(...debtServiceHistory.map((d) => d.revenue));
  const groupW = innerW / debtServiceHistory.length;
  const barW = groupW * 0.32;
  const gap = groupW * 0.06;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm bg-emerald-500 opacity-80 inline-block" />
            {isAr ? "إجمالي الإيرادات" : "Total Revenue"}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm bg-red-500 opacity-80 inline-block" />
            {isAr ? "خدمة الدين" : "Debt Service"}
          </span>
        </div>
        <span className="text-xs text-muted-foreground font-mono">{isAr ? "مليار ج.م" : "B EGP"}</span>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ minWidth: "340px", height: "260px" }}>
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const y = padT + innerH * (1 - frac);
            const val = Math.round(maxVal * frac);
            return (
              <g key={frac}>
                <line x1={padL} y1={y} x2={svgW - padR} y2={y} stroke="#252A36" strokeWidth={0.5} />
                <text x={padL - 8} y={y} textAnchor="end" dominantBaseline="middle" fill="#7A8299" fontSize={9} fontFamily="var(--font-mono)">
                  {val}
                </text>
              </g>
            );
          })}

          {debtServiceHistory.map((d, i) => {
            const cx = padL + i * groupW + groupW / 2;
            const revH = (d.revenue / maxVal) * innerH;
            const dbtH = (d.debtService / maxVal) * innerH;
            const pct = Math.round((d.debtService / d.revenue) * 100);
            const revX = cx - barW - gap / 2;
            const dbtX = cx + gap / 2;

            return (
              <g key={d.year}>
                {/* Revenue */}
                <rect x={revX} y={padT + innerH - revH} width={barW} height={revH} rx={2} fill="#2EC4B6" opacity={0.7} />
                <text x={revX + barW / 2} y={padT + innerH - revH - 5} textAnchor="middle" fill="#2EC4B6" fontSize={8} fontFamily="var(--font-mono)">
                  {d.revenue}
                </text>

                {/* Debt service */}
                <rect x={dbtX} y={padT + innerH - dbtH} width={barW} height={dbtH} rx={2} fill="#E5484D" opacity={0.78} />
                <text x={dbtX + barW / 2} y={padT + innerH - dbtH - 5} textAnchor="middle" fill="#E5484D" fontSize={8} fontFamily="var(--font-mono)">
                  {d.debtService}
                </text>

                {/* % label */}
                <text x={cx} y={svgH - 22} textAnchor="middle" fill="#E5484D" fontSize={8} fontFamily="var(--font-mono)" fontWeight="600">
                  {pct}%
                </text>

                {/* Year */}
                <text x={cx} y={svgH - 10} textAnchor="middle" fill="#7A8299" fontSize={8} fontFamily="var(--font-mono)">
                  {d.year.split("-")[0]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="text-xs text-muted-foreground">
        {isAr
          ? "النسبة المئوية الحمراء = خدمة الدين كنسبة من إجمالي الإيرادات"
          : "Red % = debt service as share of total government revenue"}
      </p>

      <a href="https://mof.gov.eg" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
        mof.gov.eg
      </a>
    </div>
  );
}

// ─── Regional Comparison ──────────────────────────────────────────────────────

function RegionalComparison() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const maxGDP = Math.max(...regionalData.map((c) => c.debtToGDP));
  const sorted = [...regionalData].sort((a, b) => b.debtToGDP - a.debtToGDP);

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {isAr ? "المقارنة الإقليمية" : "Regional Comparison"}
        </span>
        <span className="text-xs text-muted-foreground font-mono">
          {isAr ? "نسبة الدين / الناتج المحلي %" : "Debt-to-GDP %"}
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
  const isAr = lang === "ar";
  const [activeTab, setActiveTab] = useState<"timeline" | "creditors" | "service" | "regional">("timeline");

  const latestData = timelineData[timelineData.length - 1];
  const baseData = timelineData[0];
  const increasePercent = Math.round(
    ((latestData.externalDebt - baseData.externalDebt) / baseData.externalDebt) * 100
  );
  const totalAnnualPayments = creditors.reduce((s, c) => s + c.annualPayment, 0);

  const tabs = [
    { id: "timeline" as const, labelAr: "مسار الدين", labelEn: "Timeline" },
    { id: "creditors" as const, labelAr: "الدائنون", labelEn: "Creditors" },
    { id: "service" as const, labelAr: "خدمة الدين", labelEn: "Debt Service" },
    { id: "regional" as const, labelAr: "مقارنة إقليمية", labelEn: "Regional" },
  ];

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page flex flex-col gap-10">

        {/* ── Header ── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {isAr ? "البيانات المالية الكلية" : "Macro-Financial Data"}
          </p>
          <h1 className="text-3xl font-bold text-foreground mb-1">
            {isAr ? "الدين العام" : "National Debt"}
          </h1>
          <p className="text-sm text-muted-foreground">{t.debtDesc}</p>
        </div>

        {/* ── Key Metrics ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="pt-5 pb-5">
              <p className="text-xs text-muted-foreground mb-1">
                {isAr ? "الدين الخارجي 2024" : "External Debt 2024"}
              </p>
              <p className="font-mono text-3xl font-bold tabular-nums text-amber-400">
                ${latestData.externalDebt}
                <span className="text-base font-normal text-muted-foreground">B</span>
              </p>
              <a href="https://cbe.org.eg" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">
                cbe.org.eg
              </a>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-5 pb-5">
              <p className="text-xs text-muted-foreground mb-1">
                {isAr ? "نسبة الدين / الناتج" : "Debt-to-GDP"}
              </p>
              <p className="font-mono text-3xl font-bold tabular-nums text-foreground">
                {latestData.debtToGDP}
                <span className="text-base font-normal text-muted-foreground">%</span>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-red-900/30 border">
            <CardContent className="pt-5 pb-5">
              <p className="text-xs text-muted-foreground mb-1">
                {isAr ? "الزيادة منذ 2015" : "Rise since 2015"}
              </p>
              <p className="font-mono text-3xl font-bold tabular-nums text-red-400">
                +{increasePercent}
                <span className="text-base font-normal text-muted-foreground">%</span>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-5 pb-5">
              <p className="text-xs text-muted-foreground mb-1">
                {isAr ? "إجمالي المدفوعات السنوية" : "Total Annual Payments"}
              </p>
              <p className="font-mono text-3xl font-bold tabular-nums text-foreground">
                ${(totalAnnualPayments / 1000).toFixed(1)}
                <span className="text-base font-normal text-muted-foreground">B</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Callout ── */}
        <div className="rounded-lg border border-border bg-muted/20 px-5 py-4 flex flex-col gap-1.5">
          <p className="text-sm text-foreground font-semibold">
            {isAr ? "ما يعنيه هذا" : "What this means"}
          </p>
          <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground list-disc list-inside">
            <li>
              {isAr
                ? "22.6% من الإنفاق الحكومي يذهب لسداد فوائد الديون"
                : "22.6% of government spending goes to debt interest payments"}
            </li>
            <li>
              {isAr
                ? "هذا يفوق الإنفاق على التعليم والصحة والدفاع مجتمعة"
                : "This is more than education, health, and defence combined"}
            </li>
            <li>
              {isAr
                ? "اليوروبوند يحمل أعلى فائدة (7.5%) ويمثل أكبر حصة في الديون التجارية"
                : "Eurobonds carry the highest rate (7.5%) and the largest commercial debt share"}
            </li>
          </ul>
          <a
            href="https://mof.gov.eg"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline mt-1"
          >
            mof.gov.eg
          </a>
        </div>

        {/* ── Tabs ── */}
        <div className="flex flex-col gap-6">
          {/* Tab bar */}
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

          {/* Tab content */}
          {activeTab === "timeline" && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-foreground">
                  {isAr ? "مسار الدين الخارجي 2015-2024" : "External Debt Timeline 2015–2024"}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {isAr
                    ? "مرر مؤشر الفأرة على النقاط لرؤية التفاصيل والأحداث الرئيسية"
                    : "Hover over data points to see details and key events"}
                </p>
              </CardHeader>
              <CardContent>
                <DebtTimeline />
              </CardContent>
            </Card>
          )}

          {activeTab === "creditors" && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                {isAr
                  ? "تفصيل الدين الخارجي حسب الدائن · 2024 · بالمليون دولار"
                  : "External debt breakdown by creditor · 2024 · USD Millions"}
              </p>
              <CreditorBreakdown />
            </div>
          )}

          {activeTab === "service" && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-foreground">
                  {isAr ? "خدمة الدين مقابل الإيرادات" : "Debt Service vs Revenue"}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {isAr
                    ? "ما نسبة الإيرادات الحكومية التي تذهب لخدمة الدين؟"
                    : "What share of government revenue goes to debt service?"}
                </p>
              </CardHeader>
              <CardContent>
                <DebtServiceChart />
              </CardContent>
            </Card>
          )}

          {activeTab === "regional" && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-foreground">
                  {isAr ? "نسبة الدين إلى الناتج المحلي — مقارنة إقليمية" : "Debt-to-GDP — Regional Comparison"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RegionalComparison />
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Sources ── */}
        <div className="border-t border-border pt-5 flex flex-wrap gap-4">
          <a href="https://cbe.org.eg" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">cbe.org.eg</a>
          <a href="https://mof.gov.eg" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">mof.gov.eg</a>
          <a href="https://imf.org" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">imf.org</a>
          <a href="https://worldbank.org" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">worldbank.org</a>
        </div>

      </div>
    </div>
  );
}
