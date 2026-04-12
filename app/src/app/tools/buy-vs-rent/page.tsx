"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { usePersistedState } from "@/lib/use-persisted-state";
import { createPortal } from "react-dom";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useLanguage } from "@/components/providers";
import { useWebMCPTool, mcpJSON } from "@/lib/webmcp";
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
import { Slider } from "@/components/ui/slider";

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
    inflationPct,
  } = params;

  // ── Initial Costs ──
  let downPayment = 0;
  if (financingType === "mortgage") {
    downPayment = homePrice * (downPaymentPct / 100);
  } else if (financingType === "installments") {
    downPayment = homePrice * (installDownPaymentPct / 100);
  } else if (financingType === "cash") {
    downPayment = homePrice;
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
    const inflationFactor = Math.pow(1 + inflationPct / 100, y);
    recurringCosts += propVal * (maintenancePct / 100);
    recurringCosts += propVal * (insurancePct / 100);
    recurringCosts += propVal * (propertyTaxPct / 100);
    recurringCosts += (monthlyFees * 12) * inflationFactor;
    recurringCosts += (monthlyUtilities * 12) * inflationFactor;
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
    homePrice, closingCostsPct, securityDepositMonths,
    brokerFeePct, rentersInsurancePct, monthlyUtilities,
    inflationPct,
  } = params;

  // What the buyer spent as initial costs — renter invests this instead
  let buyerDownPayment = 0;
  if (params.financingType === "mortgage") {
    buyerDownPayment = homePrice * (params.downPaymentPct / 100);
  } else if (params.financingType === "installments") {
    buyerDownPayment = homePrice * (params.installDownPaymentPct / 100);
  } else if (params.financingType === "cash") {
    buyerDownPayment = homePrice;
  }
  const buyerInitial = buyerDownPayment + homePrice * (closingCostsPct / 100);

  // ── Initial Costs ──
  const securityDeposit = monthlyRent * securityDepositMonths;
  const brokerFee = monthlyRent * (brokerFeePct / 100);
  const initialCosts = securityDeposit + brokerFee;

  // ── Recurring Costs ──
  let recurringCosts = 0;
  let annualRent = monthlyRent * 12;
  for (let y = 1; y <= years; y++) {
    const inflationFactor = Math.pow(1 + inflationPct / 100, y);
    recurringCosts += annualRent;
    recurringCosts += annualRent * (rentersInsurancePct / 100);
    recurringCosts += (monthlyUtilities * 12) * inflationFactor;
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
  rentingBetterLabel,
  buyingBetterLabel,
}: {
  params: CalcParams;
  paramKey: keyof CalcParams;
  min: number;
  max: number;
  steps: number;
  currentValue: number;
  rentingBetterLabel: string;
  buyingBetterLabel: string;
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
        <span style={{ color: "#C9A84C" }}>{rentingBetterLabel}</span>
        <span style={{ color: "#3FC380" }}>{buyingBetterLabel}</span>
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
  tooltip,
}: {
  label: string;
  buy: number;
  rent: number;
  symbol?: string;
  fromEGP?: (v: number) => number;
  highlight?: boolean;
  tooltip?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between py-1.5 text-xs ${
        highlight ? "font-bold text-foreground" : "text-muted-foreground"
      }`}
    >
      <div className="flex items-center gap-1.5 flex-1">
        <span>{label}</span>
        {tooltip && <InputTooltip text={tooltip} />}
      </div>
      <span
        className={`w-24 text-end font-mono ${
          highlight ? "text-[#E5484D]" : ""
        }`}
      >
        {fmtCompact(buy)} EGP
      </span>
      <span
        className={`w-24 text-end font-mono ${
          highlight ? "text-[#C9A84C]" : ""
        }`}
      >
        {fmtCompact(rent)} EGP
      </span>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  description,
  children,
  ...rest
}: {
  title: string;
  description: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className="border-t border-border pt-10 mt-10 first:border-t-0 first:pt-0 first:mt-0" {...rest}>
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground mb-8">{description}</p>
      {children}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function BuyVsRentPage() {
  const { t, lang: _lang, dir } = useLanguage();
  // Translation helper for keys not yet in translations.ts — will be added in a follow-up
  
  const mortgageData = useQuery(api.tools.getMortgageRate);
  const investmentData = useQuery(api.tools.getInvestmentDefaults);

  // Tools always work in EGP — USD shown as context only
  const exchangeRate = investmentData?.["exchange_rate"]?.value ?? 50;
  
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
  
  const toUsd = (egp: number) => {
    // Project final exchange rate based on annual depreciation over 'years'
    const projectedRate = exchangeRate * Math.pow(1 + egpDepreciationPct / 100, years);
    return projectedRate > 0 ? egp / projectedRate : 0;
  };

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

  // ─── WebMCP: expose buy-vs-rent calculator to AI agents ──────────────────
  const bvrSchema = useMemo(() => ({
    type: "object" as const,
    properties: {
      homePrice: { type: "number", description: "Property price in EGP (e.g. 3000000)", minimum: 100_000 },
      monthlyRent: { type: "number", description: "Current monthly rent in EGP (e.g. 10000)", minimum: 500 },
      years: { type: "number", description: "Time horizon in years (1-30)", minimum: 1, maximum: 30 },
      financingType: { type: "string", enum: ["mortgage", "installments", "cash"], description: "How you'd finance the purchase" },
      downPaymentPct: { type: "number", description: "Down payment as % of home price (0-100)", minimum: 0, maximum: 100 },
      mortgageRatePct: { type: "number", description: "Annual mortgage interest rate %", minimum: 0, maximum: 50 },
      homePriceGrowthPct: { type: "number", description: "Expected annual home price appreciation %", minimum: 0 },
      rentGrowthPct: { type: "number", description: "Expected annual rent increase %", minimum: 0 },
      investmentReturnPct: { type: "number", description: "Expected return on alternative investments %", minimum: 0 },
      inflationPct: { type: "number", description: "Expected annual inflation rate %", minimum: 0 },
    },
    required: ["homePrice", "monthlyRent"],
  }), []);

  useWebMCPTool({
    name: "compare_buy_vs_rent",
    description: "Compare the total cost of buying vs renting a home in Egypt over a given time horizon. Accounts for mortgage payments, home appreciation, inflation, EGP depreciation, opportunity cost of the down payment, maintenance, and closing costs. Returns verdict (buy or rent), total costs for each, breakeven year, and detailed cost breakdowns.",
    title: "Buy vs Rent Calculator (Egypt)",
    inputSchema: bvrSchema,
    execute: useCallback((input: Record<string, unknown>) => {
      const hp = Number(input.homePrice) || homePrice;
      const mr = Number(input.monthlyRent) || monthlyRent;
      const yr = Number(input.years) || years;
      const ft = (input.financingType as FinancingType) || financingType;

      // Apply inputs to UI
      if (input.homePrice) setHomePrice(hp);
      if (input.monthlyRent) setMonthlyRent(mr);
      if (input.years) setYears(yr);
      if (input.financingType) setFinancingType(ft);
      if (input.downPaymentPct !== undefined) setDownPaymentPct(Number(input.downPaymentPct));
      if (input.mortgageRatePct !== undefined) setMortgageRatePct(Number(input.mortgageRatePct));
      if (input.homePriceGrowthPct !== undefined) setHomePriceGrowthPct(Number(input.homePriceGrowthPct));
      if (input.rentGrowthPct !== undefined) setRentGrowthPct(Number(input.rentGrowthPct));
      if (input.investmentReturnPct !== undefined) setInvestmentReturnPct(Number(input.investmentReturnPct));
      if (input.inflationPct !== undefined) setInflationPct(Number(input.inflationPct));

      // Compute with current + overridden params
      const p: CalcParams = {
        ...params,
        homePrice: hp,
        monthlyRent: mr,
        years: yr,
        financingType: ft,
        ...(input.downPaymentPct !== undefined ? { downPaymentPct: Number(input.downPaymentPct) } : {}),
        ...(input.mortgageRatePct !== undefined ? { mortgageRatePct: Number(input.mortgageRatePct) } : {}),
        ...(input.homePriceGrowthPct !== undefined ? { homePriceGrowthPct: Number(input.homePriceGrowthPct) } : {}),
        ...(input.rentGrowthPct !== undefined ? { rentGrowthPct: Number(input.rentGrowthPct) } : {}),
        ...(input.investmentReturnPct !== undefined ? { investmentReturnPct: Number(input.investmentReturnPct) } : {}),
        ...(input.inflationPct !== undefined ? { inflationPct: Number(input.inflationPct) } : {}),
      };

      const buy = calculateBuyCosts(p, yr);
      const rent = calculateRentCosts(p, yr);
      const be = findBreakeven(p);

      return mcpJSON({
        verdict: buy.total < rent.total ? "buy" : "rent",
        savingsEgp: Math.round(Math.abs(buy.total - rent.total)),
        timeHorizonYears: yr,
        financingType: ft,
        currency: "EGP",
        buyCosts: {
          totalEgp: Math.round(buy.total),
          initialCosts: Math.round(buy.initialCosts),
          recurringCosts: Math.round(buy.recurringCosts),
          opportunityCosts: Math.round(buy.opportunityCosts),
          netProceeds: Math.round(buy.netProceeds),
        },
        rentCosts: {
          totalEgp: Math.round(rent.total),
          initialCosts: Math.round(rent.initialCosts),
          recurringCosts: Math.round(rent.recurringCosts),
          opportunityCosts: Math.round(rent.opportunityCosts),
        },
        breakevenYear: be,
        assumptions: {
          homePrice: hp,
          monthlyRent: mr,
          homePriceGrowthPct: p.homePriceGrowthPct,
          rentGrowthPct: p.rentGrowthPct,
          inflationPct: p.inflationPct,
          investmentReturnPct: p.investmentReturnPct,
        },
      });
    }, [params, homePrice, monthlyRent, years, financingType,
        setHomePrice, setMonthlyRent, setYears, setFinancingType,
        setDownPaymentPct, setMortgageRatePct, setHomePriceGrowthPct,
        setRentGrowthPct, setInvestmentReturnPct, setInflationPct]),
  });

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page">
        <DesktopNotice />

        {/* ─── Header ─────────────────────────────────────────────────────── */}
        <div className="mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">
            {t.buyVsRent_sectionLabel}
          </p>
          <h1 className="text-3xl md:text-4xl font-black mb-3 flex items-center gap-3">
            <Scale className="text-primary" size={32} />
            {t.buyVsRent_title}
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl">
            {t.buyVsRent_subtitle}
          </p>
        </div>

        {/* ─── Main Grid: 2-col inputs + 1-col sticky sidebar ─────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          {/* ═══ Sticky Summary Sidebar (right, lg) / top (mobile) ════════ */}
          <div className="order-first lg:order-last lg:col-span-1 lg:sticky lg:top-20">
            <Card className="border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden">
              {/* Verdict banner */}
              <div
                data-guide="verdict"
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
                      ? t.buyVsRent_buyingWins
                      : t.buyVsRent_rentingWins}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t.buyVsRent_save}{" "}
                  <span className="font-mono font-bold text-foreground">
                    {fmtCompact(savings)} EGP
                  </span>{" "}
                  {t.buyVsRent_over} {years} {t.common_yr}
                </p>
                <p className="text-[0.6rem] text-muted-foreground/50 font-mono" dir="ltr">
                  ≈ ${fmtCompact(toUsd(savings))} USD
                </p>
                {breakeven !== null && (
                  <p className="text-[0.65rem] text-muted-foreground/70 mt-1">
                    {t.buyVsRent_breakeven}: {t.invest_year} {breakeven}
                  </p>
                )}
                {breakeven === null && (
                  <p className="text-[0.65rem] text-muted-foreground/70 mt-1">
                    {t.buyVsRent_neverBeats}
                  </p>
                )}
              </div>

              <CardContent data-guide="bvr-breakdown" className="p-5">
                {/* Column headers */}
                <div className="flex items-center justify-between text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  <span className="flex-1">{years} {t.common_yr}</span>
                  <span className="w-24 text-end">{t.buyVsRent_buy}</span>
                  <span className="w-24 text-end">{t.buyVsRent_rent}</span>
                </div>

                <Separator className="mb-3" />

                <SummaryRow
                  label={t.buyVsRent_initialCosts}
                  buy={buyCosts.initialCosts}
                  rent={rentCosts.initialCosts}
                  tooltip={t.buyVsRent_initialCostsTooltip}
                />
                <SummaryRow
                  label={t.buyVsRent_recurringCosts}
                  buy={buyCosts.recurringCosts}
                  rent={rentCosts.recurringCosts}
                  tooltip={t.buyVsRent_recurringCostsTooltip}
                />
                <SummaryRow
                  label={t.buyVsRent_opportunityCost}
                  buy={buyCosts.opportunityCosts}
                  rent={rentCosts.opportunityCosts}
                  tooltip={t.buyVsRent_opportunityCostTooltip}
                />
                <SummaryRow
                  label={t.buyVsRent_netSaleProceeds}
                  buy={buyCosts.netProceeds}
                  rent={rentCosts.netProceeds}
                  tooltip={t.buyVsRent_netSaleProceedsTooltip}
                />

                <Separator className="my-3" />

                <SummaryRow
                  label={t.buyVsRent_total}
                  buy={buyCosts.total}
                  rent={rentCosts.total}
                  highlight
                  tooltip={t.buyVsRent_totalTooltip}
                />

                {/* Monthly mortgage pill */}
                {financingType === "mortgage" && monthlyMortgage > 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-muted/40 text-center">
                    <p className="text-[0.65rem] text-muted-foreground mb-0.5">
                      {t.buyVsRent_monthlyMortgage}
                    </p>
                    <p className="font-mono font-bold text-lg text-primary">
                      {fmtCompact(monthlyMortgage)} EGP
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
              data-guide="bvr-basics"
              title={t.buyVsRent_basicsTitle}
              description={t.buyVsRent_basicsDesc}
            >
              <SliderRow
                label={t.buyVsRent_homePrice}
                value={homePrice}
                min={500_000}
                max={30_000_000}
                step={100_000}
                displayValue={`${fmtCompact(homePrice)} EGP`}
                onChange={setHomePrice}
                tooltip={t.buyVsRent_homePriceTooltip}
              />
              <SensitivityBar
                rentingBetterLabel={t.buyVsRent_rentingBetter}
                buyingBetterLabel={t.buyVsRent_buyingBetter}
                params={params}
                paramKey="homePrice"
                min={500_000}
                max={30_000_000}
                steps={40}
                currentValue={homePrice}
              />

              <SliderRow
                label={t.buyVsRent_monthlyRent}
                value={monthlyRent}
                min={2_000}
                max={80_000}
                step={500}
                displayValue={`${fmtCompact(monthlyRent)} EGP`}
                onChange={setMonthlyRent}
                tooltip={t.buyVsRent_monthlyRentTooltip}
              />
              <SensitivityBar
                rentingBetterLabel={t.buyVsRent_rentingBetter}
                buyingBetterLabel={t.buyVsRent_buyingBetter}
                params={params}
                paramKey="monthlyRent"
                min={2_000}
                max={80_000}
                steps={40}
                currentValue={monthlyRent}
              />

              <SliderRow
                label={t.buyVsRent_howLong}
                value={years}
                min={1}
                max={40}
                step={1}
                displayValue={`${years} ${t.common_yr}`}
                onChange={setYears}
                tooltip={t.buyVsRent_howLongTooltip}
              />
              <SensitivityBar
                rentingBetterLabel={t.buyVsRent_rentingBetter}
                buyingBetterLabel={t.buyVsRent_buyingBetter}
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
              data-guide="bvr-financing"
              title={t.buyVsRent_financingTitle}
              description={t.buyVsRent_financingDesc}
            >
              {/* Financing type selector */}
              <div className="mb-6">
                <p className="text-sm font-medium text-foreground/80 mb-3">
                  {t.buyVsRent_financingType}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { key: "mortgage", label: t.buyVsRent_bankMortgage },
                      { key: "installments", label: t.buyVsRent_devInstallments },
                      { key: "cash", label: t.buyVsRent_cash },
                    ] as { key: FinancingType; label: string }[]
                  ).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setFinancingType(key)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                        financingType === key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {financingType === "mortgage" && (
                <>
                  <SliderRow
                    label={t.buyVsRent_downPayment}
                    value={downPaymentPct}
                    min={0}
                    max={100}
                    step={5}
                    displayValue={`${downPaymentPct}% — ${fmtCompact(homePrice * downPaymentPct / 100)} EGP`}
                    onChange={setDownPaymentPct}
                    tooltip={t.buyVsRent_downPaymentTooltip}
                  />
                  <div className="mb-6">
                    <div className="flex items-center gap-1.5 mb-2">
                      <label className="text-sm font-medium text-foreground/80">
                        {t.buyVsRent_mortgageRate}
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
                        text={t.buyVsRent_mortgageRateTooltip}
                      />
                      <span className="ms-auto font-mono text-sm font-bold">
                        {mortgageRatePct.toFixed(1)}%
                      </span>
                    </div>
                    <Slider
                      dir="ltr"
                      min={0}
                      max={30}
                      step={0.5}
                      value={[mortgageRatePct]}
                      onValueChange={([v]) => setMortgageRatePct(v)}
                    />
                  </div>
                  <div className="mb-6">
                    <p className="text-sm font-medium text-foreground/80 mb-2">
                      {t.buyVsRent_mortgageTerm}
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
                    label={t.buyVsRent_downPayment}
                    value={installDownPaymentPct}
                    min={0}
                    max={50}
                    step={5}
                    displayValue={`${installDownPaymentPct}% — ${fmtCompact(homePrice * installDownPaymentPct / 100)} EGP`}
                    onChange={setInstallDownPaymentPct}
                    tooltip={t.buyVsRent_installDownTooltip}
                  />
                  <SliderRow
                    label={t.buyVsRent_installPeriod}
                    value={installPeriod}
                    min={1}
                    max={10}
                    step={1}
                    displayValue={`${installPeriod} ${t.common_yr}`}
                    onChange={setInstallPeriod}
                    tooltip={t.buyVsRent_installPeriodTooltip}
                  />
                  <SliderRow
                    label={t.buyVsRent_annualIncrease}
                    value={installAnnualIncreasePct}
                    min={0}
                    max={15}
                    step={1}
                    displayValue={`${installAnnualIncreasePct}%`}
                    onChange={setInstallAnnualIncreasePct}
                    tooltip={t.buyVsRent_annualIncreaseTooltip}
                  />
                </>
              )}

              {financingType === "cash" && (
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50 text-sm text-muted-foreground">
                  {t.buyVsRent_cashNote}
                </div>
              )}
            </Section>

            {/* ── Section 3: Future ─────────────────────────────────────── */}
            <Section
              title={t.buyVsRent_futureTitle}
              description={t.buyVsRent_futureDesc}
            >
              <SliderRow
                label={t.buyVsRent_homePriceGrowth}
                value={homePriceGrowthPct}
                min={-5}
                max={25}
                step={1}
                displayValue={`${homePriceGrowthPct}%`}
                onChange={setHomePriceGrowthPct}
                tooltip={t.buyVsRent_homePriceGrowthTooltip}
              />
              <SliderRow
                label={t.buyVsRent_rentGrowth}
                value={rentGrowthPct}
                min={0}
                max={20}
                step={1}
                displayValue={`${rentGrowthPct}%`}
                onChange={setRentGrowthPct}
                tooltip={t.buyVsRent_rentGrowthTooltip}
              />
              <SliderRow
                label={t.buyVsRent_investReturn}
                value={investmentReturnPct}
                min={0}
                max={30}
                step={1}
                displayValue={`${investmentReturnPct}%`}
                onChange={setInvestmentReturnPct}
                tooltip={t.buyVsRent_investReturnTooltip}
              />
              {investmentData?.["egypt_tbill_rate"] && (
                <p className="text-[0.625rem] text-muted-foreground -mt-4 mb-5">
                  {t.buyVsRent_tbillRate}{" "}
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
                label={t.buyVsRent_inflationRate}
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
                tooltip={t.buyVsRent_inflationTooltip}
              />
              <SliderRow
                label={t.buyVsRent_egpDepreciation}
                value={egpDepreciationPct}
                min={0}
                max={30}
                step={1}
                displayValue={`${egpDepreciationPct}%`}
                onChange={setEgpDepreciationPct}
                tooltip={t.buyVsRent_egpDepreciationTooltip}
              />
            </Section>

            {/* ── Section 4: Buy Costs ──────────────────────────────────── */}
            <Section
              title={t.buyVsRent_costsTitle}
              description={t.buyVsRent_costsDesc}
            >
              <SliderRow
                label={t.buyVsRent_closingCosts}
                value={closingCostsPct}
                min={0}
                max={10}
                step={0.5}
                displayValue={`${closingCostsPct}%`}
                onChange={setClosingCostsPct}
                tooltip={t.buyVsRent_closingCostsTooltip}
              />
              <SliderRow
                label={t.buyVsRent_sellingCosts}
                value={sellingCostsPct}
                min={0}
                max={10}
                step={0.5}
                displayValue={`${sellingCostsPct}%`}
                onChange={setSellingCostsPct}
                tooltip={t.buyVsRent_sellingCostsTooltip}
              />
              <SliderRow
                label={t.buyVsRent_maintenance}
                value={maintenancePct}
                min={0}
                max={5}
                step={0.25}
                displayValue={`${maintenancePct}%`}
                onChange={setMaintenancePct}
                tooltip={t.buyVsRent_maintenanceTooltip}
              />
              <SliderRow
                label={t.buyVsRent_insurance}
                value={insurancePct}
                min={0}
                max={3}
                step={0.05}
                displayValue={`${insurancePct}%`}
                onChange={setInsurancePct}
                tooltip={t.buyVsRent_insuranceTooltip}
              />
              <SliderRow
                label={t.buyVsRent_propertyTax}
                value={propertyTaxPct}
                min={0}
                max={5}
                step={0.1}
                displayValue={`${propertyTaxPct}%`}
                onChange={setPropertyTaxPct}
                tooltip={t.buyVsRent_propertyTaxTooltip}
              />
              <SliderRow
                label={t.buyVsRent_commonFees}
                value={monthlyFees}
                min={0}
                max={10_000}
                step={100}
                displayValue={`${fmtCompact(monthlyFees)} EGP`}
                onChange={setMonthlyFees}
                tooltip={t.buyVsRent_commonFeesTooltip}
              />
              <SliderRow
                label={t.buyVsRent_utilities}
                value={monthlyUtilities}
                min={0}
                max={10_000}
                step={100}
                displayValue={`${fmtCompact(monthlyUtilities)} EGP`}
                onChange={setMonthlyUtilities}
                tooltip={t.buyVsRent_utilitiesTooltip}
              />
              <p className="text-[0.65rem] text-muted-foreground/60 -mt-3 mb-6">
                {t.buyVsRent_utilitiesNote}
              </p>
            </Section>

            {/* ── Section 5: Rent Costs ─────────────────────────────────── */}
            <Section
              title={t.buyVsRent_rentCostsTitle}
              description={t.buyVsRent_rentCostsDesc}
            >
              <SliderRow
                label={t.buyVsRent_securityDeposit}
                value={securityDepositMonths}
                min={0}
                max={12}
                step={1}
                displayValue={`${securityDepositMonths} ${t.buyVsRent_months}`}
                onChange={setSecurityDepositMonths}
                tooltip={t.buyVsRent_securityDepositTooltip}
              />
              <SliderRow
                label={t.buyVsRent_brokerFee}
                value={brokerFeePct}
                min={0}
                max={100}
                step={10}
                displayValue={`${brokerFeePct}% ${t.buyVsRent_ofMonthlyRent}`}
                onChange={setBrokerFeePct}
                tooltip={t.buyVsRent_brokerFeeTooltip}
              />
              <SliderRow
                label={t.buyVsRent_rentersInsurance}
                value={rentersInsurancePct}
                min={0}
                max={3}
                step={0.1}
                displayValue={`${rentersInsurancePct}%`}
                onChange={setRentersInsurancePct}
                tooltip={t.buyVsRent_rentersInsuranceTooltip}
              />
            </Section>

            {/* ── Methodology ───────────────────────────────────────────── */}
            <div className="border-t border-border pt-10 mt-10">
              <button
                onClick={() => setShowMethodology((p) => !p)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
              >
                <BookOpen size={14} />
                <span>{t.buyVsRent_methodology}</span>
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
                    <strong className="text-foreground">{t.buyVsRent_methodology}:</strong>{" "}
                    {t.buyVsRent_methodologyP1}
                  </p>
                  <p>
                    {t.buyVsRent_methodologyP2}
                  </p>
                  <p>
                    {t.buyVsRent_methodologyP3}
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    <Badge variant="outline" className="text-[0.6rem]">
                      {t.buyVsRent_noGuarantees}
                    </Badge>
                    <Badge variant="outline" className="text-[0.6rem]">
                      {t.buyVsRent_notAdvice}
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
