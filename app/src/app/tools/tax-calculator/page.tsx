"use client";

import { useState, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useLanguage } from "@/components/providers";
import { DesktopNotice } from "@/components/desktop-notice";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle } from "lucide-react";

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
  "Debt Service": "#E5484D",
  "Wages & Compensation": "#C9A84C",
  "Wages": "#C9A84C",
  "Subsidies": "#F76B15",
  "Subsidies & Social Benefits": "#F76B15",
  "Infrastructure": "#2EC4B6",
  "Investment": "#2EC4B6",
  "Education": "#6C8EEF",
  "Health": "#3FC380",
  "Defence": "#8E8E93",
  "Defense": "#8E8E93",
};

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function SpendingBar({
  category,
  taxPaid,
  isAr,
}: {
  category: SpendingCategory;
  taxPaid: number;
  isAr: boolean;
}) {
  const amount = (taxPaid * category.pct) / 100;
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 flex-shrink-0 text-right" dir="ltr">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {isAr ? category.nameAr : category.nameEn}
        </span>
      </div>
      <div className="flex-1 relative h-7 bg-muted rounded overflow-hidden">
        <div
          className="absolute inset-y-0 start-0 rounded transition-all duration-700"
          style={{ width: `${category.pct}%`, background: category.color }}
        />
        <span className="absolute inset-y-0 start-2 flex items-center text-[0.65rem] font-mono font-bold text-white/90 mix-blend-plus-lighter">
          {category.pct}%
        </span>
      </div>
      <div className="w-28 flex-shrink-0 text-end">
        <span className="font-mono text-sm font-bold text-foreground">
          {fmtEGP(amount)}{" "}
          <span className="text-[0.625rem] text-muted-foreground font-normal">EGP</span>
        </span>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const MIN_SALARY = 10_000;
const MAX_SALARY = 10_000_000;
const DEFAULT_SALARY = 120_000;

export default function TaxCalculatorPage() {
  const { lang, dir } = useLanguage();
  const isAr = lang === "ar";
  const [inputVal, setInputVal] = useState<string>(DEFAULT_SALARY.toLocaleString());
  const [salary, setSalary] = useState<number>(DEFAULT_SALARY);

  // Load tax brackets and spending data from Convex
  const convexBrackets = useQuery(api.budget.getTaxBrackets, { year: "2024" });
  const convexSpending = useQuery(api.budget.getExpenditureBreakdown);

  const _isLoading = convexBrackets === undefined || convexSpending === undefined;

  // All data from Convex -- no hardcoded fallbacks
  const TAX_BRACKETS: Bracket[] = convexBrackets
    ? convexBrackets.map((b) => ({
        from: b.fromAmount,
        to: b.toAmount ?? null,
        rate: b.rate,
      }))
    : [];

  const personalExemption = convexBrackets?.[0]?.personalExemption ?? 0;

  const SPENDING: SpendingCategory[] = convexSpending?.items
    ? convexSpending.items.map((item, i) => ({
        key: `sector_${i}`,
        nameAr: item.sectorAr,
        nameEn: item.sectorEn,
        pct: item.percentageOfTotal,
        color: SECTOR_COLORS[item.sectorEn] ?? `hsl(${i * 45}, 60%, 55%)`,
      }))
    : [];

  const handleInput = useCallback((raw: string) => {
    setInputVal(raw);
    const n = parseInt(raw.replace(/,/g, ""), 10);
    if (!isNaN(n) && n >= 0) {
      setSalary(Math.min(n, MAX_SALARY));
    }
  }, []);

  const handleSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const n = parseInt(e.target.value, 10);
    setSalary(n);
    setInputVal(n.toLocaleString());
  }, []);

  const taxPaid = calcTax(salary, TAX_BRACKETS, personalExemption);
  const effectiveRate = salary > 0 ? (taxPaid / salary) * 100 : 0;
  const debtAmount = (taxPaid * 22.6) / 100;
  const eduAmount = (taxPaid * 7.0) / 100;
  const healthAmount = (taxPaid * 4.7) / 100;

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page">
        <DesktopNotice />

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">
            {isAr ? "الميزانية الشخصية" : "Personal Budget"}
          </p>
          <h1 className="text-3xl md:text-4xl font-black mb-2">
            {isAr ? "أين تذهب ضرائبك؟" : "Where Do Your Taxes Go?"}
          </h1>
          <p className="text-muted-foreground text-sm max-w-lg">
            {isAr
              ? "أدخل راتبك السنوي واكتشف كيف تُوزَّع ضرائبك على بنود الموازنة المصرية ٢٠٢٤"
              : "Enter your annual salary and see how your taxes are distributed across Egypt's 2024 budget"}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ─── Input Column ─────────────────────────────────────────────── */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-6 space-y-5">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-2">
                    {isAr ? "الراتب السنوي (جنيه مصري)" : "Annual Salary (EGP)"}
                  </label>
                  <div className="relative">
                    <span className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">ج.م</span>
                    <Input
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
                  <input
                    type="range"
                    min={MIN_SALARY}
                    max={MAX_SALARY}
                    step={5000}
                    value={Math.min(Math.max(salary, MIN_SALARY), MAX_SALARY)}
                    onChange={handleSlider}
                    className="w-full accent-[#C9A84C] cursor-pointer"
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
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{isAr ? "الراتب السنوي" : "Annual Salary"}</span>
                    <span className="font-mono text-sm font-bold">{salary.toLocaleString()} EGP</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{isAr ? "إجمالي الضريبة" : "Total Tax Paid"}</span>
                    <span className="font-mono text-sm font-bold text-primary">{taxPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })} EGP</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{isAr ? "المعدل الفعلي" : "Effective Rate"}</span>
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
                  {isAr ? "شرائح الضريبة ٢٠٢٤" : "2024 Tax Brackets"}
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
                  {isAr ? "إعفاء شخصي: " : "Personal exemption: "}{personalExemption.toLocaleString()} EGP
                </p>
                <p className="text-[0.625rem] text-muted-foreground mt-1">
                  {isAr ? "المصدر: قانون الضرائب رقم ٧ لسنة ٢٠٢٤" : "Source: Income Tax Law No. 7/2024"}
                  {" "}
                  <a href="https://taxsummaries.pwc.com/egypt/individual/taxes-on-personal-income" target="_blank" rel="noopener noreferrer" className="text-primary no-underline hover:underline">
                    {isAr ? "(مرجع)" : "(reference)"}
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
                    {isAr
                      ? "راتبك أقل من الحد الأدنى الخاضع للضريبة (١٥,٠٠٠ جنيه)"
                      : "Your salary is below the taxable threshold (15,000 EGP)"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-5">
                      {isAr ? "كيف تُوزَّع ضرائبك" : "How Your Taxes Are Distributed"}
                    </p>
                    <div className="space-y-3">
                      {SPENDING.map((cat) => (
                        <SpendingBar key={cat.key} category={cat} taxPaid={taxPaid} isAr={isAr} />
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Highlight callout */}
                <Card className="border-[#E5484D]/30 bg-[#E5484D]/5">
                  <CardContent className="p-5 flex items-start gap-4">
                    <AlertTriangle size={18} className="text-[#E5484D] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-foreground mb-1">
                        {isAr
                          ? `${fmtEGP(debtAmount)} جنيه من ضرائبك تذهب لفوائد الديون`
                          : `${fmtEGP(debtAmount)} EGP of your taxes goes to debt interest`}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {isAr
                          ? `أكثر من التعليم (${fmtEGP(eduAmount)} جنيه) والصحة (${fmtEGP(healthAmount)} جنيه) مجتمعَين.`
                          : `More than education (${fmtEGP(eduAmount)} EGP) and health (${fmtEGP(healthAmount)} EGP) combined.`}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Category cards grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                          <p className="text-[0.625rem] text-muted-foreground">EGP / {isAr ? "سنة" : "yr"}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <p className="text-[0.625rem] text-muted-foreground/60">
                  {isAr
                    ? `البيانات: وزارة المالية — الموازنة العامة للدولة ${convexSpending?.fiscalYear?.year ?? "٢٠٢٤/٢٠٢٥"}`
                    : `Source: Ministry of Finance — General State Budget ${convexSpending?.fiscalYear?.year ?? "2024/2025"}`}
                  {convexSpending?.fiscalYear?.sourceUrl && (
                    <a href={convexSpending.fiscalYear.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary no-underline hover:underline ms-1">
                      {isAr ? "(مصدر)" : "(source)"}
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
