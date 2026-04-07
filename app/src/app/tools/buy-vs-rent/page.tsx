"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { usePersistedState } from "@/lib/use-persisted-state";
import { createPortal } from "react-dom";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useLanguage } from "@/components/providers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DataSourceFooter } from "@/components/data-source";
import { SanadBadge } from "@/components/sanad-badge";
import { DesktopNotice } from "@/components/desktop-notice";
import {
  Scale,
  Home,
  TrendingUp,
  Info,
  BookOpen,
  ChevronDown,
} from "lucide-react";
import { motion } from "framer-motion";
import { AdjustableSlider } from "@/components/adjustable-slider";

// ─── Types ────────────────────────────────────────────────────────────────────

type FinancingType = "mortgage" | "installments" | "cash";

interface CalcParams {
  homePrice: number;
  monthlyRent: number;
  years: number;
  financingType: FinancingType;
  // mortgage
  mortgageRatePct: number;
  downPaymentPct: number;
  mortgageTerm: number;
  // installments
  installDownPaymentPct: number;
  installPeriod: number;
  installAnnualIncreasePct: number;
  // future
  homePriceGrowthPct: number;
  rentGrowthPct: number;
  investmentReturnPct: number;
  inflationPct: number;
  egpDepreciationPct: number;
  // costs
  closingCostsPct: number;
  sellingCostsPct: number;
  maintenancePct: number;
  insurancePct: number;
  propertyTaxPct: number;
  monthlyFees: number;
  monthlyUtilities: number; // electricity, water, gas, internet — applies to BOTH rent and buy
  // rent costs
  securityDepositMonths: number;
  brokerFeePct: number;
  rentersInsurancePct: number;
}

interface CostBreakdown {
  initialCosts: number;
  recurringCosts: number;
  opportunityCosts: number;
  netProceeds: number;
  total: number;
}

// ─── Calculation Engine ───────────────────────────────────────────────────────

function calcMonthlyMortgage(principal: number, annualRatePct: number, years: number): number {
  if (annualRatePct === 0) return years > 0 ? principal / (years * 12) : 0;
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function calcRemainingLoan(principal: number, annualRatePct: number, termYears: number, paidYears: number): number {
  if (annualRatePct === 0) return Math.max(0, principal - (principal / (termYears * 12)) * paidYears * 12);
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  const p = Math.min(paidYears * 12, n);
  return principal * (Math.pow(1 + r, n) - Math.pow(1 + r, p)) / (Math.pow(1 + r, n) - 1);
}

function calculateBuyCosts(params: CalcParams, years: number): CostBreakdown {
  const {
    homePrice, financingType, mortgageRatePct, downPaymentPct, mortgageTerm,
    installDownPaymentPct, installPeriod, installAnnualIncreasePct,
    homePriceGrowthPct, investmentReturnPct, closingCostsPct, sellingCostsPct,
    maintenancePct, insurancePct, propertyTaxPct, monthlyFees, monthlyUtilities,
  } = params;

  // ── Initial Costs ──
  let downPayment = 0;
  if (financingType === "mortgage") {
    downPayment = homePrice * (downPaymentPct / 100);
  } else if (financingType === "installments") {
    downPayment = homePrice * (installDownPaymentPct / 100);
  }
  const closingCosts = homePrice * (closingCostsPct / 100);
  const initialCosts = downPayment + closingCosts;

  // ── Recurring Costs ──
  let recurringCosts = 0;
  if (financingType === "mortgage") {
    const loanAmount = homePrice - downPayment;
    const monthlyPayment = calcMonthlyMortgage(loanAmount, mortgageRatePct, mortgageTerm);
    const mortgageYears = Math.min(years, mortgageTerm);
    recurringCosts += monthlyPayment * 12 * mortgageYears;
  } else if (financingType === "installments") {
    const installmentBalance = homePrice - downPayment;
    // Simple annual installment with price increase
    const annualInstallment = installmentBalance / installPeriod;
    for (let y = 1; y <= Math.min(years, installPeriod); y++) {
      recurringCosts += annualInstallment * Math.pow(1 + installAnnualIncreasePct / 100, y - 1);
    }
  }
  // Annual property costs accumulate over holding years
  for (let y = 1; y <= years; y++) {
    const propVal = homePrice * Math.pow(1 + homePriceGrowthPct / 100, y);
    recurringCosts += propVal * (maintenancePct / 100);
    recurringCosts += propVal * (insurancePct / 100);
    recurringCosts += propVal * (propertyTaxPct / 100);
    recurringCosts += monthlyFees * 12;
    recurringCosts += monthlyUtilities * 12;
  }

  // ── Opportunity Cost on Initial Outlay ──
  const opportunityCosts = initialCosts * (Math.pow(1 + investmentReturnPct / 100, years) - 1);

  // ── Net Proceeds (sale) ──
  const finalValue = homePrice * Math.pow(1 + homePriceGrowthPct / 100, years);
  let remainingLoan = 0;
  if (financingType === "mortgage") {
    remainingLoan = calcRemainingLoan(homePrice - downPayment, mortgageRatePct, mortgageTerm, years);
  }
  const sellingCosts = finalValue * (sellingCostsPct / 100);
  const netProceeds = -(finalValue - remainingLoan - sellingCosts);

  const total = initialCosts + recurringCosts + opportunityCosts + netProceeds;
  return { initialCosts, recurringCosts, opportunityCosts, netProceeds, total };
}

function calculateRentCosts(params: CalcParams, years: number): CostBreakdown {
  const {
    monthlyRent, rentGrowthPct, investmentReturnPct,
    homePrice, closingCostsPct, downPaymentPct, securityDepositMonths,
    brokerFeePct, rentersInsurancePct, monthlyUtilities,
  } = params;

  // What the buyer spent as initial costs — renter invests this instead
  const buyerInitial = homePrice * (downPaymentPct / 100) + homePrice * (closingCostsPct / 100);

  // ── Initial Costs ──
  const securityDeposit = monthlyRent * securityDepositMonths;
  const brokerFee = monthlyRent * (brokerFeePct / 100);
  const initialCosts = securityDeposit + brokerFee;

  // ── Recurring Costs ──
  let recurringCosts = 0;
  let annualRent = monthlyRent * 12;
  for (let y = 1; y <= years; y++) {
    recurringCosts += annualRent;
    recurringCosts += annualRent * (rentersInsurancePct / 100);
    recurringCosts += monthlyUtilities * 12;
    annualRent *= 1 + rentGrowthPct / 100;
  }

  // ── Opportunity Cost: renter invests what buyer spends upfront ──
  const opportunityCosts = -(buyerInitial * (Math.pow(1 + investmentReturnPct / 100, years) - 1));

  // ── Net Proceeds: security deposit returned ──
  const netProceeds = -securityDeposit;

  const total = initialCosts + recurringCosts + opportunityCosts + netProceeds;
  return { initialCosts, recurringCosts, opportunityCosts, netProceeds, total };
}

function findBreakeven(params: CalcParams): number | null {
  for (let y = 1; y <= 40; y++) {
    const buy = calculateBuyCosts(params, y).total;
    const rent = calculateRentCosts(params, y).total;
    if (buy < rent) return y;
  }
  return null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return Math.round(n).toString();
}

// ─── InputTooltip (createPortal pattern) ─────────────────────────────────────

function InputTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const show = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, left: Math.max(8, rect.left - 120) });
    }
    setOpen(true);
  };

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => (open ? setOpen(false) : show())}
        onMouseEnter={show}
        onMouseLeave={() => setOpen(false)}
        className="text-muted-foreground/40 hover:text-muted-foreground cursor-help"
      >
        <Info size={12} />
      </button>
      {open &&
        createPortal(
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

// ─── Slider Row ───────────────────────────────────────────────────────────────

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
  tooltip,
  badge,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (v: number) => void;
  tooltip?: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-1.5 mb-2">
        <label className="text-sm font-medium text-foreground/80">{label}</label>
        {tooltip && <InputTooltip text={tooltip} />}
        {badge}
        <span className="ms-auto font-mono text-sm font-bold text-foreground">
          {displayValue}
        </span>
      </div>
      <AdjustableSlider
        value={value}
        onChange={onChange}
        defaultMin={min}
        defaultMax={max}
        step={step}
        accentColor="#C9A84C"
        formatLabel={(v) => (v >= 1000 ? fmtCompact(v) : String(v))}
      />
    </div>
  );
}

// ─── Sensitivity Bar ──────────────────────────────────────────────────────────

function SensitivityBar({
  params,
  paramKey,
  min,
  max,
  steps,
  currentValue,
  isAr,
}: {
  params: CalcParams;
  paramKey: keyof CalcParams;
  min: number;
  max: number;
  steps: number;
  currentValue: number;
  isAr: boolean;
}) {
  const segments = useMemo(() => {
    const arr: boolean[] = [];
    for (let i = 0; i < steps; i++) {
      const val = min + ((max - min) / steps) * i;
      const testParams = { ...params, [paramKey]: val } as CalcParams;
      const buy = calculateBuyCosts(testParams, params.years).total;
      const rent = calculateRentCosts(testParams, params.years).total;
      arr.push(buy < rent); // true = buying wins
    }
    return arr;
  }, [params, paramKey, min, max, steps]);

  const thumbPct = Math.min(100, Math.max(0, ((currentValue - min) / (max - min)) * 100));

  return (
    <div className="hidden md:block mb-4">
      <div className="relative h-2 rounded-full overflow-hidden flex">
        {segments.map((buyWins, i) => (
          <div
            key={i}
            className="flex-1 transition-colors"
            style={{ background: buyWins ? "#3FC380" : "#C9A84C" }}
          />
        ))}
      </div>
      <div className="relative -mt-3" style={{ paddingLeft: `${thumbPct}%` }}>
        <div className="w-0.5 h-4 bg-white/80 rounded-full mx-auto" />
      </div>
      <div className="flex justify-between text-[0.55rem] text-muted-foreground/50 mt-1">
        <span style={{ color: "#C9A84C" }}>{isAr ? "الإيجار أفضل" : "Renting better"}</span>
        <span style={{ color: "#3FC380" }}>{isAr ? "الشراء أفضل" : "Buying better"}</span>
      </div>
    </div>
  );
}

// ─── Summary Row ──────────────────────────────────────────────────────────────

function SummaryRow({
  label,
  buy,
  rent,
  highlight,
}: {
  label: string;
  buy: number;
  rent: number;
  symbol?: string;
  fromEGP?: (v: number) => number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-1.5 text-xs ${
        highlight ? "font-bold text-foreground" : "text-muted-foreground"
      }`}
    >
      <span className="flex-1">{label}</span>
      <span
        className={`w-24 text-end font-mono ${
          highlight ? "text-[#E5484D]" : ""
        }`}
      >
        {fmtCompact(buy)} ج.م
      </span>
      <span
        className={`w-24 text-end font-mono ${
          highlight ? "text-[#C9A84C]" : ""
        }`}
      >
        {fmtCompact(rent)} ج.م
      </span>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-border pt-10 mt-10 first:border-t-0 first:pt-0 first:mt-0">
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground mb-8">{description}</p>
      {children}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function BuyVsRentPage() {
  const { lang, dir } = useLanguage();
  const isAr = lang === "ar";
  const mortgageData = useQuery(api.tools.getMortgageRate);
  const investmentData = useQuery(api.tools.getInvestmentDefaults);

  // Tools always work in EGP — USD shown as context only
  const exchangeRate = investmentData?.["exchange_rate"]?.value ?? 50;
  const toUsd = (egp: number) => exchangeRate > 0 ? egp / exchangeRate : 0;

  const [showMethodology, setShowMethodology] = useState(false);

  // ─── Convex-derived defaults ────────────────────────────────────────────────
  const convexMortgageRate = mortgageData?.value;
  const convexInflation = investmentData?.["inflation"]?.value;

  // ─── Section 1: Basics ─────────────────────────────────────────────────────
  const [homePrice, setHomePrice] = usePersistedState("bvr-homePrice", 3_000_000);
  const [monthlyRent, setMonthlyRent] = usePersistedState("bvr-monthlyRent", 10_000);
  const [years, setYears] = usePersistedState("bvr-years", 10);

  // ─── Section 2: Financing ──────────────────────────────────────────────────
  const [financingType, setFinancingType] = usePersistedState<FinancingType>("bvr-financingType", "mortgage");
  const [mortgageRatePct, setMortgageRatePct] = usePersistedState("bvr-mortgageRatePct", 20);
  const [downPaymentPct, setDownPaymentPct] = usePersistedState("bvr-downPaymentPct", 20);
  const [mortgageTerm, setMortgageTerm] = usePersistedState("bvr-mortgageTerm", 20);
  const [installDownPaymentPct, setInstallDownPaymentPct] = usePersistedState("bvr-installDownPaymentPct", 10);
  const [installPeriod, setInstallPeriod] = usePersistedState("bvr-installPeriod", 5);
  const [installAnnualIncreasePct, setInstallAnnualIncreasePct] = usePersistedState("bvr-installAnnualIncreasePct", 5);

  // ─── Section 3: Future ─────────────────────────────────────────────────────
  const [homePriceGrowthPct, setHomePriceGrowthPct] = usePersistedState("bvr-homePriceGrowthPct", 12);
  const [rentGrowthPct, setRentGrowthPct] = usePersistedState("bvr-rentGrowthPct", 10);
  const [investmentReturnPct, setInvestmentReturnPct] = usePersistedState("bvr-investmentReturnPct", 18);
  const [inflationPct, setInflationPct] = usePersistedState("bvr-inflationPct", 28);
  const [egpDepreciationPct, setEgpDepreciationPct] = usePersistedState("bvr-egpDepreciationPct", 7);

  // ─── Section 4: Buy Costs ──────────────────────────────────────────────────
  const [closingCostsPct, setClosingCostsPct] = usePersistedState("bvr-closingCostsPct", 3);
  const [sellingCostsPct, setSellingCostsPct] = usePersistedState("bvr-sellingCostsPct", 2.5);
  const [maintenancePct, setMaintenancePct] = usePersistedState("bvr-maintenancePct", 1);
  const [insurancePct, setInsurancePct] = usePersistedState("bvr-insurancePct", 0.25);
  const [propertyTaxPct, setPropertyTaxPct] = usePersistedState("bvr-propertyTaxPct", 0);
  const [monthlyFees, setMonthlyFees] = usePersistedState("bvr-monthlyFees", 500);
  const [monthlyUtilities, setMonthlyUtilities] = usePersistedState("bvr-monthlyUtilities", 3000);

  // ─── Section 5: Rent Costs ─────────────────────────────────────────────────
  const [securityDepositMonths, setSecurityDepositMonths] = usePersistedState("bvr-securityDepositMonths", 2);
  const [brokerFeePct, setBrokerFeePct] = usePersistedState("bvr-brokerFeePct", 50);
  const [rentersInsurancePct, setRentersInsurancePct] = usePersistedState("bvr-rentersInsurancePct", 0.5);

  // Sync Convex values on load
  useEffect(() => {
    if (convexMortgageRate !== undefined) setMortgageRatePct(convexMortgageRate);
  }, [convexMortgageRate, setMortgageRatePct]);

  useEffect(() => {
    if (convexInflation !== undefined) setInflationPct(Math.round(convexInflation * 10) / 10);
  }, [convexInflation, setInflationPct]);

  // ─── Build params object ───────────────────────────────────────────────────
  const params = useMemo<CalcParams>(
    () => ({
      homePrice,
      monthlyRent,
      years,
      financingType,
      mortgageRatePct,
      downPaymentPct,
      mortgageTerm,
      installDownPaymentPct,
      installPeriod,
      installAnnualIncreasePct,
      homePriceGrowthPct,
      rentGrowthPct,
      investmentReturnPct,
      inflationPct,
      egpDepreciationPct,
      closingCostsPct,
      sellingCostsPct,
      maintenancePct,
      insurancePct,
      propertyTaxPct,
      monthlyFees,
      monthlyUtilities,
      securityDepositMonths,
      brokerFeePct,
      rentersInsurancePct,
    }),
    [
      homePrice, monthlyRent, years, financingType,
      mortgageRatePct, downPaymentPct, mortgageTerm,
      installDownPaymentPct, installPeriod, installAnnualIncreasePct,
      homePriceGrowthPct, rentGrowthPct, investmentReturnPct,
      inflationPct, egpDepreciationPct, closingCostsPct, sellingCostsPct,
      maintenancePct, insurancePct, propertyTaxPct, monthlyFees, monthlyUtilities,
      securityDepositMonths, brokerFeePct, rentersInsurancePct,
    ]
  );

  // ─── Calculations ──────────────────────────────────────────────────────────
  const buyCosts = useMemo(() => calculateBuyCosts(params, years), [params, years]);
  const rentCosts = useMemo(() => calculateRentCosts(params, years), [params, years]);
  const breakeven = useMemo(() => findBreakeven(params), [params]);
  const buyWins = buyCosts.total < rentCosts.total;
  const savings = Math.abs(buyCosts.total - rentCosts.total);

  // Monthly mortgage for display
  const monthlyMortgage = useMemo(() => {
    if (financingType !== "mortgage") return 0;
    const loan = homePrice * (1 - downPaymentPct / 100);
    return calcMonthlyMortgage(loan, mortgageRatePct, mortgageTerm);
  }, [financingType, homePrice, downPaymentPct, mortgageRatePct, mortgageTerm]);

  const t = (ar: string, en: string) => (isAr ? ar : en);

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page">
        <DesktopNotice />

        {/* ─── Header ─────────────────────────────────────────────────────── */}
        <div className="mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">
            {t("أدوات التحليل المالي", "Financial Tools")}
          </p>
          <h1 className="text-3xl md:text-4xl font-black mb-3 flex items-center gap-3">
            <Scale className="text-primary" size={32} />
            {t("شراء أم إيجار؟", "Buy or Rent?")}
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl">
            {t(
              "احسب القرار الأذكى في السوق المصري — مع مراعاة التضخم وانخفاض الجنيه وعوائد الاستثمار",
              "Calculate the smarter choice for Egypt's market — factoring in inflation, EGP depreciation, and investment returns"
            )}
          </p>
        </div>

        {/* ─── Main Grid: 2-col inputs + 1-col sticky sidebar ─────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          {/* ═══ Sticky Summary Sidebar (right, lg) / top (mobile) ════════ */}
          <div className="order-first lg:order-last lg:col-span-1 lg:sticky lg:top-20">
            <Card className="border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden">
              {/* Verdict banner */}
              <div
                className={`px-5 py-4 ${
                  buyWins
                    ? "bg-[#3FC380]/10 border-b border-[#3FC380]/20"
                    : "bg-[#C9A84C]/10 border-b border-[#C9A84C]/20"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {buyWins ? (
                    <Home size={16} className="text-[#3FC380]" />
                  ) : (
                    <TrendingUp size={16} className="text-[#C9A84C]" />
                  )}
                  <span
                    className={`font-black text-base ${
                      buyWins ? "text-[#3FC380]" : "text-[#C9A84C]"
                    }`}
                  >
                    {buyWins
                      ? t("الشراء أفضل", "Buying Wins")
                      : t("الإيجار أفضل", "Renting Wins")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("توفر", "Save")}{" "}
                  <span className="font-mono font-bold text-foreground">
                    {fmtCompact(savings)} ج.م
                  </span>{" "}
                  {t(`خلال ${years} سنوات`, `over ${years} years`)}
                </p>
                <p className="text-[0.6rem] text-muted-foreground/50 font-mono" dir="ltr">
                  ≈ ${fmtCompact(toUsd(savings))} USD
                </p>
                {breakeven !== null && (
                  <p className="text-[0.65rem] text-muted-foreground/70 mt-1">
                    {t(
                      `نقطة التعادل: ${breakeven} سنة`,
                      `Breakeven: year ${breakeven}`
                    )}
                  </p>
                )}
                {breakeven === null && (
                  <p className="text-[0.65rem] text-muted-foreground/70 mt-1">
                    {t(
                      "الشراء لا يُعادل الإيجار خلال 40 سنة",
                      "Buying never beats renting within 40 years"
                    )}
                  </p>
                )}
              </div>

              <CardContent className="p-5">
                {/* Column headers */}
                <div className="flex items-center justify-between text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  <span className="flex-1">{t(`${years} سنوات`, `${years} yrs`)}</span>
                  <span className="w-24 text-end">{t("شراء", "Buy")}</span>
                  <span className="w-24 text-end">{t("إيجار", "Rent")}</span>
                </div>

                <Separator className="mb-3" />

                <SummaryRow
                  label={t("التكاليف الأولية", "Initial Costs")}
                  buy={buyCosts.initialCosts}
                  rent={rentCosts.initialCosts}
                />
                <SummaryRow
                  label={t("التكاليف المتكررة", "Recurring Costs")}
                  buy={buyCosts.recurringCosts}
                  rent={rentCosts.recurringCosts}
                />
                <SummaryRow
                  label={t("تكلفة الفرصة", "Opportunity Cost")}
                  buy={buyCosts.opportunityCosts}
                  rent={rentCosts.opportunityCosts}
                />
                <SummaryRow
                  label={t("صافي العائد من البيع", "Net Sale Proceeds")}
                  buy={buyCosts.netProceeds}
                  rent={rentCosts.netProceeds}
                />

                <Separator className="my-3" />

                <SummaryRow
                  label={t("الإجمالي", "Total")}
                  buy={buyCosts.total}
                  rent={rentCosts.total}
                  highlight
                />

                {/* Monthly mortgage pill */}
                {financingType === "mortgage" && monthlyMortgage > 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-muted/40 text-center">
                    <p className="text-[0.65rem] text-muted-foreground mb-0.5">
                      {t("القسط الشهري", "Monthly Mortgage")}
                    </p>
                    <p className="font-mono font-bold text-lg text-primary">
                      {fmtCompact(monthlyMortgage)} ج.م
                    </p>
                  </div>
                )}

                {/* Exchange rate footnote */}
                {exchangeRate > 0 && (
                  <p className="text-[0.6rem] text-muted-foreground/50 text-center mt-3">
                    1 USD = {exchangeRate.toFixed(0)} EGP
                    {investmentData?.["exchange_rate"] && (
                      <span className="ms-1">
                        <SanadBadge
                          sanadLevel={investmentData["exchange_rate"].sanadLevel}
                          sourceUrl={investmentData["exchange_rate"].sourceUrl}
                          sourceNameEn="Central Bank of Egypt"
                          sourceNameAr="البنك المركزي المصري"
                          showLabel={false}
                        />
                      </span>
                    )}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ═══ Scrolling Inputs (left 2 cols) ══════════════════════════════ */}
          <div className="lg:col-span-2 space-y-0">
            {/* ── Section 1: Basics ──────────────────────────────────────── */}
            <Section
              title={t("الأساسيات", "The Basics")}
              description={t(
                "أدخل سعر العقار والإيجار وعدد السنوات التي تخطط للبقاء فيها",
                "Enter the home price, rent amount, and how long you plan to stay"
              )}
            >
              <SliderRow
                label={t("سعر العقار", "Home Price")}
                value={homePrice}
                min={500_000}
                max={30_000_000}
                step={100_000}
                displayValue={`${fmtCompact(homePrice)} ج.م`}
                onChange={setHomePrice}
                tooltip={t(
                  "متوسط الأسعار: القاهرة 2-5 مليون، العاصمة الإدارية 1.5-4 مليون، الإسكندرية 1-3 مليون جنيه",
                  "Average prices: Cairo 2-5M, New Capital 1.5-4M, Alexandria 1-3M EGP"
                )}
              />
              <SensitivityBar
                isAr={isAr}
                params={params}
                paramKey="homePrice"
                min={500_000}
                max={30_000_000}
                steps={40}
                currentValue={homePrice}
              />

              <SliderRow
                label={t("الإيجار الشهري", "Monthly Rent")}
                value={monthlyRent}
                min={2_000}
                max={80_000}
                step={500}
                displayValue={`${fmtCompact(monthlyRent)} ج.م`}
                onChange={setMonthlyRent}
                tooltip={t(
                  "إيجار عقار مماثل. تحقق من أوليكس أو عقارماب للأسعار المقارنة.",
                  "What you'd pay to rent a similar property. Check OLX or Aqarmap."
                )}
              />
              <SensitivityBar
                isAr={isAr}
                params={params}
                paramKey="monthlyRent"
                min={2_000}
                max={80_000}
                steps={40}
                currentValue={monthlyRent}
              />

              <SliderRow
                label={t("مدة البقاء (سنوات)", "How Long Do You Plan to Stay")}
                value={years}
                min={1}
                max={40}
                step={1}
                displayValue={`${years} ${t("سنة", "yrs")}`}
                onChange={setYears}
                tooltip={t(
                  "الشراء يصبح أفضل كلما طالت المدة — التكاليف الأولية تُوزَّع على سنوات أكثر",
                  "Buying improves the longer you stay — upfront costs spread over more years"
                )}
              />
              <SensitivityBar
                isAr={isAr}
                params={params}
                paramKey="years"
                min={1}
                max={40}
                steps={40}
                currentValue={years}
              />
            </Section>

            {/* ── Section 2: Financing ───────────────────────────────────── */}
            <Section
              title={t("تفاصيل التمويل", "Financing Details")}
              description={t(
                "في مصر، كثير من المشترين يعتمدون على تقسيط المطور بدل القرض البنكي",
                "In Egypt, many buyers use developer installments (تقسيط) rather than bank mortgages"
              )}
            >
              {/* Financing type selector */}
              <div className="mb-6">
                <p className="text-sm font-medium text-foreground/80 mb-3">
                  {t("نوع التمويل", "Financing Type")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { key: "mortgage", ar: "قرض بنكي", en: "Bank Mortgage" },
                      { key: "installments", ar: "تقسيط المطور", en: "Developer Installments" },
                      { key: "cash", ar: "كاش", en: "Cash" },
                    ] as const
                  ).map(({ key, ar, en }) => (
                    <button
                      key={key}
                      onClick={() => setFinancingType(key)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                        financingType === key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {t(ar, en)}
                    </button>
                  ))}
                </div>
              </div>

              {financingType === "mortgage" && (
                <>
                  <SliderRow
                    label={t("نسبة الدفعة المقدمة", "Down Payment")}
                    value={downPaymentPct}
                    min={0}
                    max={100}
                    step={5}
                    displayValue={`${downPaymentPct}% — ${fmtCompact(homePrice * downPaymentPct / 100)} ج.م`}
                    onChange={setDownPaymentPct}
                    tooltip={t(
                      "البنوك المصرية تطلب عادة 15-30% مقدم",
                      "Egyptian banks typically require 15-30% down payment"
                    )}
                  />
                  <div className="mb-6">
                    <div className="flex items-center gap-1.5 mb-2">
                      <label className="text-sm font-medium text-foreground/80">
                        {t("معدل الفائدة", "Mortgage Rate")}
                      </label>
                      {mortgageData && (
                        <SanadBadge
                          sanadLevel={mortgageData.sanadLevel}
                          sourceUrl={mortgageData.sourceUrl}
                          sourceNameEn="National Bank of Egypt"
                          sourceNameAr="البنك الأهلي المصري"
                          showLabel={false}
                        />
                      )}
                      <InputTooltip
                        text={t(
                          "معدل البنك المركزي الحالي. أسعار البنوك الفعلية قد تختلف.",
                          "Current CBE benchmark rate. Actual bank rates may vary."
                        )}
                      />
                      <span className="ms-auto font-mono text-sm font-bold">
                        {mortgageRatePct.toFixed(1)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      dir="ltr"
                      min={0}
                      max={30}
                      step={0.5}
                      value={mortgageRatePct}
                      onChange={(e) => setMortgageRatePct(Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none bg-muted cursor-pointer accent-[#C9A84C]"
                    />
                  </div>
                  <div className="mb-6">
                    <p className="text-sm font-medium text-foreground/80 mb-2">
                      {t("مدة القرض", "Mortgage Term")}
                    </p>
                    <div className="flex gap-2" dir="ltr">
                      {[5, 10, 15, 20, 25, 30].map((yr) => (
                        <button
                          key={yr}
                          onClick={() => setMortgageTerm(yr)}
                          className={`flex-1 text-xs font-mono py-1.5 rounded border transition-colors ${
                            mortgageTerm === yr
                              ? "border-primary bg-primary/10 text-primary font-bold"
                              : "border-border text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {yr}yr
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {financingType === "installments" && (
                <>
                  <SliderRow
                    label={t("نسبة الدفعة المقدمة", "Down Payment")}
                    value={installDownPaymentPct}
                    min={0}
                    max={50}
                    step={5}
                    displayValue={`${installDownPaymentPct}% — ${fmtCompact(homePrice * installDownPaymentPct / 100)} ج.م`}
                    onChange={setInstallDownPaymentPct}
                    tooltip={t(
                      "مطورون مصريون يقبلون مقدم 5-20%",
                      "Egyptian developers accept 5-20% down"
                    )}
                  />
                  <SliderRow
                    label={t("فترة التقسيط (سنوات)", "Installment Period")}
                    value={installPeriod}
                    min={1}
                    max={10}
                    step={1}
                    displayValue={`${installPeriod} ${t("سنوات", "years")}`}
                    onChange={setInstallPeriod}
                    tooltip={t(
                      "معظم مطوري مصر يقدمون تقسيطاً 4-8 سنوات",
                      "Most Egyptian developers offer 4-8 year installment plans"
                    )}
                  />
                  <SliderRow
                    label={t("زيادة سنوية على الأقساط", "Annual Price Increase on Installments")}
                    value={installAnnualIncreasePct}
                    min={0}
                    max={15}
                    step={1}
                    displayValue={`${installAnnualIncreasePct}%`}
                    onChange={setInstallAnnualIncreasePct}
                    tooltip={t(
                      "بعض المطورين يطبقون زيادة سنوية على الأقساط",
                      "Some developers apply annual escalation on installments"
                    )}
                  />
                </>
              )}

              {financingType === "cash" && (
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50 text-sm text-muted-foreground">
                  {t(
                    "الشراء بالكاش — لا توجد أقساط. الدفعة المقدمة = كامل سعر العقار.",
                    "Cash purchase — no mortgage payments. Down payment = full price."
                  )}
                </div>
              )}
            </Section>

            {/* ── Section 3: Future ─────────────────────────────────────── */}
            <Section
              title={t("ماذا يحمل المستقبل؟", "What Does the Future Hold?")}
              description={t(
                "السوق المصري يتميز بتضخم مرتفع وانخفاض الجنيه — هذه العوامل تؤثر كثيراً على الحساب",
                "Egypt's market has high inflation and EGP depreciation — these heavily influence the result"
              )}
            >
              <SliderRow
                label={t("نمو أسعار العقارات سنوياً", "Home Price Growth Rate")}
                value={homePriceGrowthPct}
                min={-5}
                max={25}
                step={1}
                displayValue={`${homePriceGrowthPct}%`}
                onChange={setHomePriceGrowthPct}
                tooltip={t(
                  "العقارات المصرية ارتفعت 12-20% سنوياً مؤخراً (اسمياً قبل التضخم)",
                  "Egyptian real estate appreciated 12-20% annually recently (nominal, pre-inflation)"
                )}
              />
              <SliderRow
                label={t("نمو الإيجار سنوياً", "Rent Growth Rate")}
                value={rentGrowthPct}
                min={0}
                max={20}
                step={1}
                displayValue={`${rentGrowthPct}%`}
                onChange={setRentGrowthPct}
                tooltip={t(
                  "الإيجارات المصرية ترتفع 8-15% سنوياً",
                  "Egyptian rents increase 8-15% annually"
                )}
              />
              <SliderRow
                label={t("عائد الاستثمار البديل", "Investment Return Rate")}
                value={investmentReturnPct}
                min={0}
                max={30}
                step={1}
                displayValue={`${investmentReturnPct}%`}
                onChange={setInvestmentReturnPct}
                tooltip={t(
                  "لو استأجرت، مدخراتك تُستثمر. أذون الخزانة ~22%، الشهادات ~19%",
                  "If renting, your savings are invested. T-bills yield ~22%, CDs ~19%"
                )}
              />
              {investmentData?.["egypt_tbill_rate"] && (
                <p className="text-[0.625rem] text-muted-foreground -mt-4 mb-5">
                  {t("أذون الخزانة: ", "T-bill rate: ")}
                  <span className="text-primary font-mono">
                    {investmentData["egypt_tbill_rate"].value.toFixed(1)}%
                  </span>
                  {" "}
                  <SanadBadge
                    sanadLevel={investmentData["egypt_tbill_rate"].sanadLevel}
                    sourceUrl={investmentData["egypt_tbill_rate"].sourceUrl}
                    sourceNameEn="Central Bank of Egypt"
                    showLabel={false}
                  />
                </p>
              )}
              <SliderRow
                label={t("معدل التضخم", "Inflation Rate")}
                value={inflationPct}
                min={0}
                max={40}
                step={1}
                displayValue={`${Math.round(inflationPct * 10) / 10}%`}
                onChange={setInflationPct}
                badge={
                  investmentData?.["inflation"] ? (
                    <SanadBadge
                      sanadLevel={investmentData["inflation"].sanadLevel}
                      sourceUrl={investmentData["inflation"].sourceUrl}
                      sourceNameEn="CAPMAS / World Bank"
                      showLabel={false}
                    />
                  ) : undefined
                }
                tooltip={t(
                  "التضخم في مصر وصل ~33% عام 2023. يؤثر على القيمة الحقيقية للأصول.",
                  "Egypt's inflation hit ~33% in 2023. Affects the real value of assets."
                )}
              />
              <SliderRow
                label={t("انخفاض الجنيه سنوياً", "EGP Depreciation")}
                value={egpDepreciationPct}
                min={0}
                max={30}
                step={1}
                displayValue={`${egpDepreciationPct}%`}
                onChange={setEgpDepreciationPct}
                tooltip={t(
                  "انخفض الجنيه ~50% مقابل الدولار منذ 2022. يؤثر على القيمة الدولارية.",
                  "The EGP depreciated ~50% vs USD since 2022. Affects USD-value calculations."
                )}
              />
            </Section>

            {/* ── Section 4: Buy Costs ──────────────────────────────────── */}
            <Section
              title={t("التكاليف والرسوم", "Costs & Fees")}
              description={t(
                "رسوم التسجيل والصيانة والتأمين والخدمات المشتركة — مصاريف يغفلها كثيرون",
                "Registration fees, maintenance, insurance, and common charges — costs many overlook"
              )}
            >
              <SliderRow
                label={t("تكاليف الإغلاق (شراء)", "Closing Costs (Buying)")}
                value={closingCostsPct}
                min={0}
                max={10}
                step={0.5}
                displayValue={`${closingCostsPct}%`}
                onChange={setClosingCostsPct}
                tooltip={t(
                  "رسوم التسجيل والمحامي والتوثيق — عادة 2-5% في مصر",
                  "Registration, lawyer, notary fees — typically 2-5% in Egypt"
                )}
              />
              <SliderRow
                label={t("تكاليف البيع", "Selling Costs")}
                value={sellingCostsPct}
                min={0}
                max={10}
                step={0.5}
                displayValue={`${sellingCostsPct}%`}
                onChange={setSellingCostsPct}
                tooltip={t(
                  "عمولة السمسار + رسوم النقل — عادة 2-3%",
                  "Broker commission + transfer fees — typically 2-3%"
                )}
              />
              <SliderRow
                label={t("الصيانة والتجديد السنوية", "Annual Maintenance & Renovation")}
                value={maintenancePct}
                min={0}
                max={5}
                step={0.25}
                displayValue={`${maintenancePct}%`}
                onChange={setMaintenancePct}
                tooltip={t(
                  "عادة 0.5-2% من قيمة العقار سنوياً",
                  "Typically 0.5-2% of property value annually"
                )}
              />
              <SliderRow
                label={t("تأمين المنزل السنوي", "Homeowner's Insurance")}
                value={insurancePct}
                min={0}
                max={3}
                step={0.05}
                displayValue={`${insurancePct}%`}
                onChange={setInsurancePct}
                tooltip={t(
                  "التأمين على المنزل — نادر الشيوع في مصر لكن مستحسن",
                  "Home insurance — less common in Egypt but advisable"
                )}
              />
              <SliderRow
                label={t("ضريبة الأملاك السنوية", "Annual Property Tax Rate")}
                value={propertyTaxPct}
                min={0}
                max={5}
                step={0.1}
                displayValue={`${propertyTaxPct}%`}
                onChange={setPropertyTaxPct}
                tooltip={t(
                  "مصر: الوحدات السكنية أقل من 2 مليون جنيه معفاة. فوق ذلك: 10% من القيمة الإيجارية الزائدة عن 24 ألف جنيه سنوياً",
                  "Egypt: residential units under 2M EGP are exempt. Above that: 10% of rental value exceeding 24K EGP/yr"
                )}
              />
              <SliderRow
                label={t("رسوم الخدمات الشهرية", "Monthly Common Fees")}
                value={monthlyFees}
                min={0}
                max={10_000}
                step={100}
                displayValue={`${fmtCompact(monthlyFees)} ج.م`}
                onChange={setMonthlyFees}
                tooltip={t(
                  "رسوم الحراسة والنظافة والصيانة المشتركة — تتفاوت بحسب المجمع السكني",
                  "Security, cleaning, shared maintenance — varies widely by compound"
                )}
              />
              <SliderRow
                label={t("المصاريف الشهرية", "Monthly Utilities")}
                value={monthlyUtilities}
                min={0}
                max={10_000}
                step={100}
                displayValue={`${fmtCompact(monthlyUtilities)} ج.م`}
                onChange={setMonthlyUtilities}
                tooltip={t(
                  "الكهرباء والمياه والغاز والإنترنت — تُضاف لكلا السيناريوهين (شراء وإيجار)",
                  "Electricity, water, gas, internet — applies to both buy and rent scenarios"
                )}
              />
              <p className="text-[0.65rem] text-muted-foreground/60 -mt-3 mb-6">
                {t(
                  "تُحتسب لكلا السيناريوهين — تُظهر التكلفة الحقيقية للسكن",
                  "Counted in both scenarios — shows the true total cost of living"
                )}
              </p>
            </Section>

            {/* ── Section 5: Rent Costs ─────────────────────────────────── */}
            <Section
              title={t("تكاليف الإيجار الإضافية", "Additional Renting Costs")}
              description={t(
                "مصاريف الإيجار التي تُضاف فوق القسط الشهري",
                "Renting costs beyond the monthly rent payment"
              )}
            >
              <SliderRow
                label={t("مبلغ التأمين (أشهر)", "Security Deposit (months)")}
                value={securityDepositMonths}
                min={0}
                max={12}
                step={1}
                displayValue={`${securityDepositMonths} ${t("أشهر", "months")}`}
                onChange={setSecurityDepositMonths}
                tooltip={t(
                  "عادة شهر إلى 3 أشهر في مصر — يُسترد عند الإخلاء",
                  "Typically 1-3 months in Egypt — returned at end of lease"
                )}
              />
              <SliderRow
                label={t("عمولة السمسار", "Broker's Fee")}
                value={brokerFeePct}
                min={0}
                max={100}
                step={10}
                displayValue={`${brokerFeePct}% ${t("من الإيجار الشهري", "of monthly rent")}`}
                onChange={setBrokerFeePct}
                tooltip={t(
                  "عادة نصف شهر إلى شهر كامل في مصر",
                  "Typically 0.5-1 month's rent in Egypt"
                )}
              />
              <SliderRow
                label={t("تأمين المستأجر السنوي", "Renter's Insurance")}
                value={rentersInsurancePct}
                min={0}
                max={3}
                step={0.1}
                displayValue={`${rentersInsurancePct}%`}
                onChange={setRentersInsurancePct}
                tooltip={t(
                  "نادر في مصر لكن ينصح به. يغطي المحتويات والمسؤولية القانونية.",
                  "Rare in Egypt but advisable. Covers contents and liability."
                )}
              />
            </Section>

            {/* ── Methodology ───────────────────────────────────────────── */}
            <div className="border-t border-border pt-10 mt-10">
              <button
                onClick={() => setShowMethodology((p) => !p)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
              >
                <BookOpen size={14} />
                <span>{t("منهجية الحساب", "Calculation Methodology")}</span>
                <ChevronDown
                  size={14}
                  className={`ms-auto transition-transform ${showMethodology ? "rotate-180" : ""}`}
                />
              </button>

              {showMethodology && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-4 text-xs text-muted-foreground leading-relaxed space-y-3"
                >
                  <p>
                    <strong className="text-foreground">{t("منهجية الحساب:", "Methodology:")}</strong>{" "}
                    {t(
                      "يُحسب الفارق الحقيقي بين الشراء والإيجار عبر أربعة مكونات: التكاليف الأولية (المقدم + رسوم التسجيل)، التكاليف المتكررة (الأقساط + الصيانة + التأمين)، تكلفة الفرصة (ما كان يمكن تحقيقه بالاستثمار)، وصافي عائد البيع في نهاية المدة.",
                      "The true buy vs rent gap is calculated across four components: initial costs (down payment + closing), recurring costs (mortgage + maintenance + insurance), opportunity cost (investment return foregone), and net sale proceeds at the end of the holding period."
                    )}
                  </p>
                  <p>
                    {t(
                      "للمستأجر: يُحسب عائد الاستثمار على المبلغ الذي كان سيدفعه كمقدم وتكاليف شراء. هذا هو جوهر المقارنة — الشراء يربطك بأصل، الإيجار يحرر رأس المال للاستثمار.",
                      "For the renter: we calculate the investment return on the amount they would have paid as a down payment and closing costs. This is the heart of the comparison — buying ties up capital in an asset, renting frees it for investment."
                    )}
                  </p>
                  <p>
                    {t(
                      "ملاحظة: النتائج تقريبية وتعتمد كثيراً على الافتراضات المستقبلية. الأرقام الفعلية قد تختلف.",
                      "Note: Results are estimates and highly sensitive to future assumptions. Actual outcomes may vary significantly."
                    )}
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    <Badge variant="outline" className="text-[0.6rem]">
                      {t("لا ضمانات استثمارية", "No investment guarantees")}
                    </Badge>
                    <Badge variant="outline" className="text-[0.6rem]">
                      {t("ليس استشارة مالية", "Not financial advice")}
                    </Badge>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Data Source Footer ──────────────────────────────────────────── */}
        <div className="mt-16">
          <DataSourceFooter category="economy" />
        </div>
      </div>
    </div>
  );
}
