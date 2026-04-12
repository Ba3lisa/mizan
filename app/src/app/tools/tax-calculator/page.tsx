"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useLanguage } from "@/components/providers";
import { useWebMCPTool, mcpJSON } from "@/lib/webmcp";
import { DesktopNotice } from "@/components/desktop-notice";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Bracket {
  from: number;
  to: number | null;
  rate: number;
}

interface SpendingCategory {
  key: string;
  nameAr: string;
  nameEn: string;
  pct: number;
  color: string;
}

const SECTOR_COLORS: Record<string, string> = {
  "Debt Service": "#ef4444",
  "Wages & Compensation": "#f59e0b",
  "Wages": "#f59e0b",
  "Subsidies": "#8b5cf6",
  "Subsidies & Social Benefits": "#8b5cf6",
  "Infrastructure": "#06b6d4",
  "Investment": "#06b6d4",
  "Education": "#3b82f6",
  "Health": "#10b981",
  "Defence": "#64748b",
  "Defense": "#64748b",
};

// Fallback palette for sectors not in the map — distinct, high-contrast
const FALLBACK_COLORS = [
  "#f43f5e", "#a855f7", "#0ea5e9", "#14b8a6",
  "#eab308", "#f97316", "#6366f1", "#ec4899",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcTax(salary: number, brackets: Bracket[], exemption: number): number {
  const taxableIncome = Math.max(0, salary - exemption);
  let tax = 0;
  for (const bracket of brackets) {
    if (taxableIncome <= bracket.from - 1) break;
    const upper = bracket.to === null ? taxableIncome : Math.min(taxableIncome, bracket.to);
    const taxable = upper - bracket.from + 1;
    if (taxable > 0) tax += taxable * bracket.rate;
  }
  return Math.max(0, tax);
}

function fmtEGP(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

// ─── Pie Chart ───────────────────────────────────────────────────────────────

interface PiePayloadItem {
  name: string;
  value: number;
  payload: { color: string; pct: number; nameAr: string; nameEn: string };
}

function TaxPieTooltip({
  active,
  payload,
  isAr,
  ofYourTaxLabel,
}: {
  active?: boolean;
  payload?: readonly PiePayloadItem[];
  isAr: boolean;
  ofYourTaxLabel: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0];
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="font-semibold mb-0.5">{isAr ? p.payload.nameAr : p.payload.nameEn}</p>
      <p className="font-mono text-primary">{fmtEGP(p.value)} EGP</p>
      <p className="text-muted-foreground">{p.payload.pct}% {ofYourTaxLabel}</p>
    </div>
  );
}

function TaxPieChart({
  spending,
  taxPaid,
  isAr,
  ofYourTaxLabel,
}: {
  spending: SpendingCategory[];
  taxPaid: number;
  isAr: boolean;
  ofYourTaxLabel: string;
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const data = spending.map((cat) => ({
    name: isAr ? cat.nameAr : cat.nameEn,
    nameAr: cat.nameAr,
    nameEn: cat.nameEn,
    value: Math.round((taxPaid * cat.pct) / 100),
    color: cat.color,
    pct: cat.pct,
  }));

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      {/* Pie */}
      <div className="w-full md:w-1/2 max-w-[280px]" dir="ltr">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="45%"
              outerRadius="80%"
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              onMouseEnter={(_, idx) => setActiveIdx(idx)}
              onMouseLeave={() => setActiveIdx(null)}
              animationDuration={800}
            >
              {data.map((entry, idx) => (
                <Cell
                  key={entry.name}
                  fill={entry.color}
                  opacity={activeIdx === null || activeIdx === idx ? 1 : 0.3}
                  style={{ cursor: "pointer", transition: "opacity 0.2s" }}
                />
              ))}
            </Pie>
            <Tooltip
              content={(props) => (
                <TaxPieTooltip
                  active={props.active}
                  payload={props.payload as unknown as readonly PiePayloadItem[] | undefined}
                  isAr={isAr}
                  ofYourTaxLabel={ofYourTaxLabel}
                />
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex-1 w-full space-y-1.5">
        {data.map((entry, idx) => (
          <button
            key={entry.name}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-start transition-all ${
              activeIdx === idx ? "bg-muted/60 scale-[1.02]" : "hover:bg-muted/30"
            }`}
            onMouseEnter={() => setActiveIdx(idx)}
            onMouseLeave={() => setActiveIdx(null)}
          >
            <span
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ background: entry.color }}
            />
            <span className="flex-1 text-xs font-medium truncate">
              {isAr ? entry.nameAr : entry.nameEn}
            </span>
            <span className="text-xs font-mono font-bold text-muted-foreground">
              {entry.pct}%
            </span>
            <span className="text-xs font-mono font-bold" style={{ color: entry.color }}>
              {fmtEGP(entry.value)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const MIN_SALARY = 10_000;
const MAX_SALARY = 10_000_000;
const DEFAULT_SALARY = 120_000;

export default function TaxCalculatorPage() {
  const { t, lang, dir } = useLanguage();
  const isAr = lang === "ar";
  // Translation helper for keys not yet in translations.ts — will be added in a follow-up
  
  const [inputVal, setInputVal] = useState<string>(DEFAULT_SALARY.toLocaleString());
  const [salary, setSalary] = useState<number>(DEFAULT_SALARY);

  // Load tax brackets and spending data from Convex
  const convexBrackets = useQuery(api.budget.getTaxBrackets, { year: "2024" });
  const convexSpending = useQuery(api.budget.getExpenditureBreakdown);

  const _isLoading = convexBrackets === undefined || convexSpending === undefined;

  // All data from Convex -- no hardcoded fallbacks
  const TAX_BRACKETS: Bracket[] = useMemo(() =>
    convexBrackets
      ? convexBrackets.map((b) => ({
          from: b.fromAmount,
          to: b.toAmount ?? null,
          rate: b.rate,
        }))
      : [],
    [convexBrackets]
  );

  const personalExemption = convexBrackets?.[0]?.personalExemption ?? 0;

  const SPENDING: SpendingCategory[] = useMemo(() =>
    convexSpending?.items
      ? convexSpending.items.map((item, i) => ({
          key: `sector_${i}`,
          nameAr: item.sectorAr,
          nameEn: item.sectorEn,
          pct: item.percentageOfTotal,
          color: SECTOR_COLORS[item.sectorEn] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
        }))
      : [],
    [convexSpending]
  );

  const handleInput = useCallback((raw: string) => {
    setInputVal(raw);
    const n = parseInt(raw.replace(/,/g, ""), 10);
    if (!isNaN(n) && n >= 0) {
      setSalary(Math.min(n, MAX_SALARY));
    }
  }, []);

  const taxPaid = calcTax(salary, TAX_BRACKETS, personalExemption);
  const effectiveRate = salary > 0 ? (taxPaid / salary) * 100 : 0;
  const debtAmount = (taxPaid * 22.6) / 100;
  const eduAmount = (taxPaid * 7.0) / 100;
  const healthAmount = (taxPaid * 4.7) / 100;

  // ─── WebMCP: expose tax calculator to AI agents ────────────────────────────
  const inputSchema = useMemo(() => ({
    type: "object" as const,
    properties: {
      annualSalary: {
        type: "number",
        description: "Annual salary in Egyptian Pounds (EGP). Range: 10,000 to 10,000,000.",
        minimum: MIN_SALARY,
        maximum: MAX_SALARY,
      },
    },
    required: ["annualSalary"],
  }), []);

  useWebMCPTool({
    name: "calculate_egypt_tax",
    description: "Calculate Egyptian income tax for a given annual salary. Returns tax amount, effective rate, and a breakdown showing how the tax is distributed across government budget sectors (debt service, education, health, etc.).",
    title: "Egypt Tax Calculator",
    inputSchema,
    execute: useCallback((input: Record<string, unknown>) => {
      const sal = Number(input.annualSalary);
      if (!sal || sal < MIN_SALARY || sal > MAX_SALARY) {
        return mcpJSON({ error: `annualSalary must be between ${MIN_SALARY} and ${MAX_SALARY}` });
      }
      // Update UI state so the page visually reflects the agent's input
      setSalary(sal);
      setInputVal(sal.toLocaleString());

      const tax = calcTax(sal, TAX_BRACKETS, personalExemption);
      const rate = sal > 0 ? (tax / sal) * 100 : 0;

      return mcpJSON({
        annualSalary: sal,
        currency: "EGP",
        totalTaxPaid: Math.round(tax),
        effectiveRate: Number(rate.toFixed(1)),
        personalExemption,
        taxBrackets: TAX_BRACKETS.map((b) => ({
          from: b.from,
          to: b.to,
          rate: Number((b.rate * 100).toFixed(1)),
        })),
        budgetBreakdown: SPENDING.map((cat) => ({
          sector: cat.nameEn,
          sectorAr: cat.nameAr,
          percentage: cat.pct,
          amountEgp: Math.round((tax * cat.pct) / 100),
        })),
      });
    }, [TAX_BRACKETS, SPENDING, personalExemption, setSalary, setInputVal]),
  });

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page">
        <DesktopNotice />

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">
            {t.tax_sectionLabel}
          </p>
          <h1 className="text-3xl md:text-4xl font-black mb-2">
            {t.tax_title}
          </h1>
          <p className="text-muted-foreground text-sm max-w-lg">
            {t.tax_subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ─── Input Column ─────────────────────────────────────────────── */}
          <div className="lg:col-span-1 space-y-6">
            <Card data-guide="salary-input" className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-6 space-y-5">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-2">
                    {t.tax_annualSalaryLabel}
                  </label>
                  <div className="relative">
                    <span className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">ج.م</span>
                    <Input
                      name="salary"
                      value={inputVal}
                      onChange={(e) => handleInput(e.target.value)}
                      className="ps-10 font-mono text-lg font-bold"
                      placeholder="120,000"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Slider */}
                <div className="space-y-2">
                  <Slider
                    dir="ltr"
                    min={MIN_SALARY}
                    max={MAX_SALARY}
                    step={5000}
                    value={[Math.min(Math.max(salary, MIN_SALARY), MAX_SALARY)]}
                    onValueChange={([v]) => { setSalary(v); setInputVal(v.toLocaleString()); }}
                  />
                  <div className="flex justify-between text-[0.625rem] text-muted-foreground font-mono" dir="ltr">
                    <span>10K</span>
                    <span>10M</span>
                  </div>
                </div>

                {/* Quick picks */}
                <div className="flex flex-wrap gap-2">
                  {[60_000, 120_000, 300_000, 600_000].map((v) => (
                    <button
                      key={v}
                      onClick={() => { setSalary(v); setInputVal(v.toLocaleString()); }}
                      className="text-[0.625rem] font-mono px-2.5 py-1 rounded-full border border-border hover:border-primary/50 hover:text-primary text-muted-foreground transition-colors"
                    >
                      {v >= 1_000_000 ? `${v / 1_000_000}M` : `${v / 1_000}K`}
                    </button>
                  ))}
                </div>

                <Separator />

                {/* Tax summary */}
                <div data-guide="tax-summary" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{t.tax_annualSalary}</span>
                    <span className="font-mono text-sm font-bold">{salary.toLocaleString()} EGP</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{t.tax_totalTaxPaid}</span>
                    <span className="font-mono text-sm font-bold text-primary">{taxPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })} EGP</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{t.tax_effectiveRate}</span>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {effectiveRate.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tax bracket info */}
            <Card className="border-border/60 bg-card/60">
              <CardContent className="p-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                  {t.tax_bracketsTitle}
                </p>
                <div className="space-y-1.5" dir="ltr">
                  {TAX_BRACKETS.map((b, i) => {
                    const isActive = salary > b.from && (b.to === null || salary <= b.to);
                    return (
                      <div
                        key={i}
                        className={`flex items-center justify-between text-xs rounded px-2 py-1 transition-colors ${
                          isActive ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground"
                        }`}
                      >
                        <span>
                          {b.from.toLocaleString()}
                          {b.to ? ` – ${b.to.toLocaleString()}` : "+"}
                        </span>
                        <span className="font-mono">{(b.rate * 100).toFixed(1)}%</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[0.625rem] text-muted-foreground mt-2">
                  {t.tax_personalExemption} {personalExemption.toLocaleString()} EGP
                </p>
                <p className="text-[0.625rem] text-muted-foreground mt-1">
                  {t.tax_sourceLabel}
                  {" "}
                  <a href="https://taxsummaries.pwc.com/egypt/individual/taxes-on-personal-income" target="_blank" rel="noopener noreferrer" className="text-primary no-underline hover:underline">
                    {t.tax_referenceLink}
                  </a>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ─── Breakdown Column ─────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {taxPaid === 0 ? (
              <Card className="border-border/60 bg-card/60">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <p className="text-sm">
                    {t.tax_belowThreshold}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card data-guide="tax-chart" className="border-border/60 bg-card/60 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
                      {t.tax_distributionTitle}
                    </p>
                    <p className="text-[0.6rem] text-amber-500/70 mb-4">
                      {isAr
                        ? `بيانات الموازنة ${convexSpending?.fiscalYear?.year ?? ""}`
                        : `Budget ${convexSpending?.fiscalYear?.year ?? ""} data`}
                    </p>
                    <TaxPieChart spending={SPENDING} taxPaid={taxPaid} isAr={isAr} ofYourTaxLabel={t.tax_ofYourTax} />
                  </CardContent>
                </Card>

                {/* Highlight callout */}
                <Card className="border-[#E5484D]/30 bg-[#E5484D]/5">
                  <CardContent className="p-5 flex items-start gap-4">
                    <AlertTriangle size={18} className="text-[#E5484D] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-foreground mb-1">
                        {fmtEGP(debtAmount)} EGP {t.tax_debtCallout}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t.tax_moreThanCombined} ({fmtEGP(eduAmount)} EGP + {fmtEGP(healthAmount)} EGP)
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Category cards grid */}
                <div data-guide="tax-categories" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {SPENDING.map((cat) => {
                    const amount = (taxPaid * cat.pct) / 100;
                    return (
                      <Card key={cat.key} className="border-border/60 bg-card/60">
                        <CardContent className="p-4">
                          <div className="w-2 h-2 rounded-full mb-2" style={{ background: cat.color }} />
                          <p className="text-[0.625rem] text-muted-foreground mb-1 leading-tight">
                            {isAr ? cat.nameAr : cat.nameEn}
                          </p>
                          <p className="font-mono text-base font-bold text-foreground leading-tight">
                            {fmtEGP(amount)}
                          </p>
                          <p className="text-[0.625rem] text-muted-foreground">EGP / {t.common_yr}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <p className="text-[0.625rem] text-muted-foreground/60">
                  {t.tax_dataSource} {convexSpending?.fiscalYear?.year ?? "2024/2025"}
                  {convexSpending?.fiscalYear?.sourceUrl && (
                    <a href={convexSpending.fiscalYear.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary no-underline hover:underline ms-1">
                      {t.tax_sourceLink}
                    </a>
                  )}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
