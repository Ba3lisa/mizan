"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useLanguage } from "@/components/providers";
import { useCurrency } from "@/components/providers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DataSourceFooter } from "@/components/data-source";
import { SanadBadge } from "@/components/sanad-badge";
import { Scale, TrendingUp, Home, Receipt, BookOpen, ChevronDown, Info } from "lucide-react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface YearDataPoint {
  year: number;
  buyCost: number;
  rentCost: number;
  buyUSD: number;
}

interface CalcParams {
  propertyPrice: number;
  downPaymentPct: number;
  mortgageRatePct: number;
  mortgageTerm: number;
  monthlyRent: number;
  annualRentIncreasePct: number;
  propertyAppreciationPct: number;
  investmentReturnPct: number;
  depreciationPct: number;
  exchangeRate: number;
}

interface CalcResult {
  chartData: YearDataPoint[];
  breakeven: number | null;
  totalBuyCost: number;
  totalRentCost: number;
  totalBuyUSD: number;
  monthlyMortgage: number;
  monthlyInterest: number;
  monthlyPrincipal: number;
  monthlyMaintenance: number;
}

// ─── Calculation Logic ────────────────────────────────────────────────────────

function calculateMonthlyMortgage(
  principal: number,
  annualRatePct: number,
  years: number
): number {
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
}

function calculateBuyVsRent(params: CalcParams): CalcResult {
  const {
    propertyPrice,
    downPaymentPct,
    mortgageRatePct,
    mortgageTerm,
    monthlyRent,
    annualRentIncreasePct,
    propertyAppreciationPct,
    investmentReturnPct,
    depreciationPct,
    exchangeRate,
  } = params;

  const downPayment = propertyPrice * (downPaymentPct / 100);
  const loanAmount = propertyPrice - downPayment;
  const monthlyMortgage = calculateMonthlyMortgage(
    loanAmount,
    mortgageRatePct,
    mortgageTerm
  );
  // Approx interest portion for year 1
  const monthlyInterestRate = mortgageRatePct / 100 / 12;
  const monthlyInterest = loanAmount * monthlyInterestRate;
  const monthlyPrincipal = monthlyMortgage - monthlyInterest;
  // Maintenance ~0.75% of property value per year
  const monthlyMaintenance = (propertyPrice * 0.0075) / 12;

  const chartData: YearDataPoint[] = [];
  let breakeven: number | null = null;

  // Track running totals
  let cumulativeBuyCost = 0;
  let cumulativeRentCost = 0;

  // For rent path: invested down payment grows
  let investedDownPayment = downPayment;

  const r = mortgageRatePct / 100 / 12;
  const n = mortgageTerm * 12;

  for (let yr = 0; yr <= 30; yr++) {
    if (yr === 0) {
      // Year 0: initial state
      chartData.push({ year: 0, buyCost: 0, rentCost: 0, buyUSD: 0 });
      continue;
    }

    // --- BUY path ---
    // Annual mortgage cost (capped at mortgage term)
    const mortgagePaymentsThisYear =
      yr <= mortgageTerm ? monthlyMortgage * 12 : 0;

    // Maintenance + insurance (0.75% + 0.25% = 1% of property value)
    const propertyValueAtYear =
      propertyPrice * Math.pow(1 + propertyAppreciationPct / 100, yr);
    const maintenanceThisYear = propertyValueAtYear * 0.01;

    // Cumulative cash out: down payment + all mortgage + maintenance
    cumulativeBuyCost +=
      (yr === 1 ? downPayment : 0) +
      mortgagePaymentsThisYear +
      maintenanceThisYear;

    // Equity built: property value - remaining loan
    // Remaining loan after yr * 12 months
    const monthsPaid = Math.min(yr * 12, mortgageTerm * 12);
    const remainingLoanBalance =
      r > 0
        ? loanAmount *
          ((Math.pow(1 + r, n) - Math.pow(1 + r, monthsPaid)) /
            (Math.pow(1 + r, n) - 1))
        : Math.max(0, loanAmount - monthlyMortgage * monthsPaid);

    const equity = propertyValueAtYear - remainingLoanBalance;
    const buyNetCost = cumulativeBuyCost - equity;

    // USD-adjusted buy cost: convert EGP net cost to USD at projected exchange rate
    // As EGP depreciates, each EGP is worth fewer USD
    const projectedRateAtYear =
      exchangeRate > 0
        ? exchangeRate * Math.pow(1 + depreciationPct / 100, yr)
        : 1;
    const buyNetCostUSD =
      exchangeRate > 0 ? buyNetCost / projectedRateAtYear : 0;

    // --- RENT path ---
    // Rent for this year (increasing annually)
    const rentThisYear = monthlyRent * 12 * Math.pow(1 + annualRentIncreasePct / 100, yr - 1);
    cumulativeRentCost += rentThisYear;

    // Down payment invested instead of buying
    investedDownPayment =
      downPayment * Math.pow(1 + investmentReturnPct / 100, yr);
    const rentNetCost = cumulativeRentCost - (investedDownPayment - downPayment);

    chartData.push({
      year: yr,
      buyCost: Math.round(buyNetCost),
      rentCost: Math.round(rentNetCost),
      buyUSD: Math.round(buyNetCostUSD),
    });

    if (breakeven === null && buyNetCost < rentNetCost) {
      breakeven = yr;
    }

  }

  const finalData = chartData[30];
  return {
    chartData,
    breakeven,
    totalBuyCost: finalData?.buyCost ?? 0,
    totalRentCost: finalData?.rentCost ?? 0,
    totalBuyUSD: finalData?.buyUSD ?? 0,
    monthlyMortgage: Math.round(monthlyMortgage),
    monthlyInterest: Math.round(monthlyInterest),
    monthlyPrincipal: Math.round(monthlyPrincipal),
    monthlyMaintenance: Math.round(monthlyMaintenance),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

// ─── Slider Row with Tooltip ──────────────────────────────────────────────────

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
  tooltip,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (v: number) => void;
  tooltip?: string;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
        {tooltip && (
          <div className="group/tip relative">
            <Info size={12} className="text-muted-foreground/40 cursor-help" />
            <div className="absolute bottom-full start-1/2 -translate-x-1/2 h-3 w-56 opacity-0 group-hover/tip:opacity-100 pointer-events-none group-hover/tip:pointer-events-auto" />
            <div className="absolute bottom-full start-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 rounded-lg bg-popover border border-border shadow-xl text-[0.65rem] text-muted-foreground leading-relaxed opacity-0 pointer-events-none group-hover/tip:opacity-100 group-hover/tip:pointer-events-auto transition-opacity z-[200]">
              {tooltip}
            </div>
          </div>
        )}
        <span className="ms-auto font-mono text-sm font-bold text-foreground">
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-muted cursor-pointer accent-[#C9A84C]"
      />
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  color: string;
  name: string;
  value: number;
}

function CustomTooltip({
  active,
  payload,
  label,
  isAr,
  symbol,
  fromEGP,
  fmt,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  isAr: boolean;
  symbol: string;
  fromEGP: (v: number) => number;
  fmt: (v: number, opts?: { compact?: boolean }) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border text-foreground rounded-lg px-3 py-2.5 shadow-xl text-xs">
      <p className="font-semibold mb-1.5 text-muted-foreground">
        {isAr ? `السنة ${label}` : `Year ${label}`}
      </p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: p.color }}
          />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-mono font-bold">
            {/* USD line values are already in USD, don't run fromEGP on them */}
            {p.name.includes("USD") || p.name.includes("دولار")
              ? `$ ${fmtCompact(p.value)}`
              : `${symbol} ${fmt(fromEGP(p.value), { compact: true })}`}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function BuyVsRentPage() {
  const { lang, dir } = useLanguage();
  const isAr = lang === "ar";
  const { symbol, fromEGP, fmt } = useCurrency();

  const mortgageData = useQuery(api.tools.getMortgageRate);
  const investmentData = useQuery(api.tools.getInvestmentDefaults);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [showMethodology, setShowMethodology] = useState(false);

  // ─── Inputs ────────────────────────────────────────────────────────────────
  const [propertyPrice, setPropertyPrice] = useState(2_000_000);
  const [downPaymentPct, setDownPaymentPct] = useState(20);
  const [mortgageTerm, setMortgageTerm] = useState(20);
  const [monthlyRent, setMonthlyRent] = useState(8_000);
  const [annualRentIncrease, setAnnualRentIncrease] = useState(10);
  const [propertyAppreciation, setPropertyAppreciation] = useState(12);
  const [investmentReturn, setInvestmentReturn] = useState(18);
  const [depreciationPct, setDepreciationPct] = useState(7);

  // Mortgage rate comes from Convex, user can override
  const convexMortgageRate = mortgageData?.value;
  const [mortgageRatePct, setMortgageRatePct] = useState(20);

  useEffect(() => {
    if (convexMortgageRate !== undefined) {
      setMortgageRatePct(convexMortgageRate);
    }
  }, [convexMortgageRate]);

  // Exchange rate from Convex
  const exchangeRate = investmentData?.exchange_rate?.value ?? 0;

  // ─── Calculations ───────────────────────────────────────────────────────────
  const result = useMemo<CalcResult>(
    () =>
      calculateBuyVsRent({
        propertyPrice,
        downPaymentPct,
        mortgageRatePct,
        mortgageTerm,
        monthlyRent,
        annualRentIncreasePct: annualRentIncrease,
        propertyAppreciationPct: propertyAppreciation,
        investmentReturnPct: investmentReturn,
        depreciationPct,
        exchangeRate,
      }),
    [
      propertyPrice,
      downPaymentPct,
      mortgageRatePct,
      mortgageTerm,
      monthlyRent,
      annualRentIncrease,
      propertyAppreciation,
      investmentReturn,
      depreciationPct,
      exchangeRate,
    ]
  );

  const buyWins = result.breakeven !== null;
  const savings = Math.abs(result.totalBuyCost - result.totalRentCost);

  const donutData = [
    {
      name: isAr ? "أصل الدين" : "Principal",
      value: result.monthlyPrincipal,
      color: "#C9A84C",
    },
    {
      name: isAr ? "الفوائد" : "Interest",
      value: result.monthlyInterest,
      color: "#E5484D",
    },
    {
      name: isAr ? "الصيانة" : "Maintenance",
      value: result.monthlyMaintenance,
      color: "#6C8EEF",
    },
  ];

  const summaryCards = [
    {
      label: isAr ? "إجمالي تكلفة الشراء" : "Total Buy Cost",
      value: result.totalBuyCost,
      usdValue: result.totalBuyUSD,
      icon: <Home size={14} className="text-[#E5484D]" />,
      color: "#E5484D",
      showUSD: true,
    },
    {
      label: isAr ? "إجمالي تكلفة الإيجار" : "Total Rent Cost",
      value: result.totalRentCost,
      usdValue: null,
      icon: <Receipt size={14} className="text-[#C9A84C]" />,
      color: "#C9A84C",
      showUSD: false,
    },
    {
      label: isAr ? "الفرق بعد ٣٠ سنة" : "Difference (30yr)",
      value: savings,
      usdValue: null,
      icon: <TrendingUp size={14} className="text-[#3FC380]" />,
      color: "#3FC380",
      showUSD: false,
    },
    {
      label: isAr ? "القسط الشهري" : "Monthly Payment",
      value: result.monthlyMortgage,
      usdValue: null,
      icon: <Scale size={14} className="text-[#6C8EEF]" />,
      color: "#6C8EEF",
      showUSD: false,
    },
  ];

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page">
        {/* ─── Header ─────────────────────────────────────────────────────── */}
        <div className="mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">
            {isAr ? "أدوات التحليل المالي" : "Financial Tools"}
          </p>
          <h1 className="text-3xl md:text-4xl font-black mb-2 flex items-center gap-3">
            <Scale className="text-primary" size={32} />
            {isAr ? "هل الشراء أفضل؟" : "Is Buying Better?"}
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl">
            {isAr
              ? "قارن بين الشراء والإيجار في السوق المصري — احسب نقطة التعادل وصافي التكلفة على مدى ٣٠ سنة"
              : "Compare buying vs renting in Egypt's market — calculate the breakeven point and net cost over 30 years"}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ─── Inputs Column ────────────────────────────────────────────── */}
          <div className="lg:col-span-1 space-y-5">
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-5">
                  {isAr ? "بيانات العقار" : "Property Details"}
                </p>

                <SliderRow
                  label={isAr ? "سعر العقار" : "Property Price"}
                  value={propertyPrice}
                  min={500_000}
                  max={20_000_000}
                  step={100_000}
                  displayValue={`${symbol} ${fmt(fromEGP(propertyPrice), { compact: true })}`}
                  onChange={setPropertyPrice}
                  tooltip={
                    isAr
                      ? "متوسط سعر الشقة في القاهرة: 2-4 مليون جنيه. تحقق من عقارماب لأسعار منطقتك."
                      : "Average apartment price in Cairo: 2-4M EGP. Check Aqarmap or PropertyFinder for current prices in your area."
                  }
                />

                <SliderRow
                  label={isAr ? "نسبة الدفعة المقدمة" : "Down Payment %"}
                  value={downPaymentPct}
                  min={10}
                  max={50}
                  step={5}
                  displayValue={`${downPaymentPct}%`}
                  onChange={setDownPaymentPct}
                  tooltip={
                    isAr
                      ? "البنوك المصرية تطلب عادة 15-30% مقدم. مقدم أعلى = قسط شهري أقل."
                      : "Egyptian banks typically require 15-30% down payment. Higher down payment = lower monthly mortgage."
                  }
                />

                {/* Mortgage Rate — from Convex with SanadBadge */}
                <div className="mb-5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      {isAr ? "معدل فائدة القرض" : "Mortgage Rate"}
                      {mortgageData && (
                        <SanadBadge
                          sanadLevel={mortgageData.sanadLevel}
                          sourceUrl={mortgageData.sourceUrl}
                          sourceNameEn="National Bank of Egypt"
                          sourceNameAr="البنك الأهلي المصري"
                          showLabel={false}
                        />
                      )}
                    </label>
                    <div className="group relative">
                      <Info size={12} className="text-muted-foreground/40 cursor-help" />
                      <div className="absolute bottom-full start-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 rounded-lg bg-popover border border-border shadow-lg text-[0.65rem] text-muted-foreground leading-relaxed opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
                        {isAr
                          ? "معدل البنك المركزي الحالي. أسعار البنوك الفعلية قد تختلف."
                          : "Current CBE benchmark rate. Actual bank rates may vary. Check with your bank for the latest rate."}
                      </div>
                    </div>
                    <span className="ms-auto font-mono text-sm font-bold text-foreground">
                      {mortgageRatePct.toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={30}
                    step={0.5}
                    value={mortgageRatePct}
                    onChange={(e) => setMortgageRatePct(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none bg-muted cursor-pointer accent-[#C9A84C]"
                  />
                </div>

                {/* Mortgage Term — radio buttons */}
                <div className="mb-5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      {isAr ? "مدة القرض" : "Mortgage Term"}
                    </label>
                    <div className="group relative">
                      <Info size={12} className="text-muted-foreground/40 cursor-help" />
                      <div className="absolute bottom-full start-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 rounded-lg bg-popover border border-border shadow-lg text-[0.65rem] text-muted-foreground leading-relaxed opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
                        {isAr
                          ? "فترة أطول = قسط أقل لكن فوائد إجمالية أكثر."
                          : "Longer term = lower monthly payment but more total interest paid."}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2" dir="ltr">
                    {[10, 15, 20, 25].map((yr) => (
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
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-5">
                  {isAr ? "بيانات الإيجار والسوق" : "Rent & Market Data"}
                </p>

                <SliderRow
                  label={isAr ? "الإيجار الشهري" : "Monthly Rent"}
                  value={monthlyRent}
                  min={3_000}
                  max={50_000}
                  step={500}
                  displayValue={`${symbol} ${fmt(fromEGP(monthlyRent))}`}
                  onChange={setMonthlyRent}
                  tooltip={
                    isAr
                      ? "إيجار عقار مماثل. تحقق من أوليكس أو عقارماب للأسعار المقارنة."
                      : "What you would pay to rent a similar property. Check OLX or Aqarmap for comparable rents."
                  }
                />

                <SliderRow
                  label={isAr ? "زيادة الإيجار السنوية" : "Annual Rent Increase"}
                  value={annualRentIncrease}
                  min={5}
                  max={20}
                  step={1}
                  displayValue={`${annualRentIncrease}%`}
                  onChange={setAnnualRentIncrease}
                  tooltip={
                    isAr
                      ? "الإيجارات في مصر تزيد عادة 8-15% سنوياً."
                      : "Egyptian rents typically increase 8-15% annually. New rent law allows up to 15%."
                  }
                />

                <SliderRow
                  label={isAr ? "تقدير قيمة العقار سنويًا" : "Annual Property Appreciation"}
                  value={propertyAppreciation}
                  min={0}
                  max={25}
                  step={1}
                  displayValue={`${propertyAppreciation}%`}
                  onChange={setPropertyAppreciation}
                  tooltip={
                    isAr
                      ? "العقارات المصرية ارتفعت ~12-20% سنوياً مؤخراً (قبل التضخم)."
                      : "Egyptian real estate appreciated ~12-20% annually in recent years (nominal, before inflation)."
                  }
                />

                <SliderRow
                  label={isAr ? "عائد الاستثمار البديل" : "Alternative Investment Return"}
                  value={investmentReturn}
                  min={5}
                  max={30}
                  step={1}
                  displayValue={`${investmentReturn}%`}
                  onChange={setInvestmentReturn}
                  tooltip={
                    isAr
                      ? "لو استأجرت، المقدم يُستثمر. أذون الخزانة ~22%، الشهادات ~19%."
                      : "If renting, your down payment is invested instead. T-bills yield ~22%, CDs ~19%."
                  }
                />

                {investmentData?.egx30_annual_return && (
                  <p className="text-[0.625rem] text-muted-foreground mt-1">
                    {isAr ? "عائد EGX30: " : "EGX30 return: "}
                    <span className="text-primary font-mono">
                      {investmentData.egx30_annual_return.value.toFixed(1)}%
                    </span>
                    {" "}
                    <SanadBadge
                      sanadLevel={investmentData.egx30_annual_return.sanadLevel}
                      sourceUrl={investmentData.egx30_annual_return.sourceUrl}
                      sourceNameEn="Egyptian Exchange"
                    />
                  </p>
                )}
              </CardContent>
            </Card>

            {/* ─── Currency Risk Inputs ──────────────────────────────────── */}
            <Card className="border-amber-500/20 bg-amber-500/5 backdrop-blur-sm">
              <CardContent className="p-6">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-5">
                  {isAr ? "مخاطر العملة" : "Currency Risk"}
                </p>

                <SliderRow
                  label={isAr ? "انخفاض الجنيه سنوياً" : "Expected EGP Depreciation %/year"}
                  value={depreciationPct}
                  min={0}
                  max={15}
                  step={0.5}
                  displayValue={`${depreciationPct}%`}
                  onChange={setDepreciationPct}
                  tooltip={
                    isAr
                      ? "انخفض الجنيه ~50% مقابل الدولار في السنوات الأخيرة. هذا يؤثر على القيمة الحقيقية بالدولار."
                      : "The EGP depreciated ~50% vs USD in recent years. This affects the real USD value of your investment."
                  }
                />

                {exchangeRate > 0 && (
                  <p className="text-[0.625rem] text-muted-foreground mt-1">
                    {isAr ? "السعر الحالي: " : "Current rate: "}
                    <span className="text-amber-400 font-mono">
                      1 USD = {exchangeRate.toFixed(0)} EGP
                    </span>
                    {investmentData?.exchange_rate && (
                      <>
                        {" "}
                        <SanadBadge
                          sanadLevel={investmentData.exchange_rate.sanadLevel}
                          sourceUrl={investmentData.exchange_rate.sourceUrl}
                          sourceNameEn="Central Bank of Egypt"
                        />
                      </>
                    )}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ─── Results Column ─────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Verdict Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              key={`verdict-${buyWins}-${result.breakeven}`}
            >
              <Card
                className={`border-2 ${
                  buyWins
                    ? "bg-[#3FC380]/5 border-[#3FC380]/30"
                    : "bg-[#C9A84C]/5 border-[#C9A84C]/30"
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
                        {isAr ? "الحكم" : "Verdict"}
                      </p>
                      <p className="text-lg font-black text-foreground">
                        {buyWins
                          ? isAr
                            ? `الشراء يفوز بعد ${result.breakeven} سنة`
                            : `Buying wins after ${result.breakeven} years`
                          : isAr
                          ? "الإيجار أفضل على مدى ٣٠ سنة"
                          : "Renting is better over 30 years"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {buyWins
                          ? isAr
                            ? `توفر ${symbol} ${fmt(fromEGP(savings), { compact: true })} مقارنةً بالإيجار بعد ٣٠ سنة`
                            : `You save ${symbol} ${fmt(fromEGP(savings), { compact: true })} vs renting over 30 years`
                          : isAr
                          ? `الإيجار يوفر ${symbol} ${fmt(fromEGP(savings), { compact: true })} مقارنةً بالشراء بعد ٣٠ سنة`
                          : `Renting saves ${symbol} ${fmt(fromEGP(savings), { compact: true })} vs buying over 30 years`}
                      </p>
                    </div>
                    <Badge
                      className={`text-sm font-bold px-3 py-1 ${
                        buyWins
                          ? "bg-[#3FC380]/20 text-[#3FC380] border-[#3FC380]/30"
                          : "bg-[#C9A84C]/20 text-[#C9A84C] border-[#C9A84C]/30"
                      }`}
                      variant="outline"
                    >
                      {buyWins
                        ? isAr
                          ? "شراء"
                          : "BUY"
                        : isAr
                        ? "إيجار"
                        : "RENT"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Main Chart */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                  {isAr ? "صافي التكلفة التراكمية (٣٠ سنة)" : "Cumulative Net Cost (30 Years)"}
                </p>
                <div dir="ltr">
                  <ResponsiveContainer
                    width="100%"
                    height={isMobile ? 250 : 350}
                  >
                    <AreaChart
                      data={result.chartData}
                      margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="buyGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#E5484D"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#E5484D"
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                        <linearGradient
                          id="rentGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#C9A84C"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#C9A84C"
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                        <linearGradient
                          id="buyUSDGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#6C8EEF"
                            stopOpacity={0.25}
                          />
                          <stop
                            offset="95%"
                            stopColor="#6C8EEF"
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                        strokeOpacity={0.4}
                      />
                      <XAxis
                        dataKey="year"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) =>
                          v === 0 ? "" : `${v}yr`
                        }
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) =>
                          `${fmtCompact(fromEGP(v))}`
                        }
                        width={50}
                      />
                      <Tooltip
                        content={
                          <CustomTooltip
                            isAr={isAr}
                            symbol={symbol}
                            fromEGP={fromEGP}
                            fmt={fmt}
                          />
                        }
                      />
                      {result.breakeven !== null && (
                        <ReferenceLine
                          x={result.breakeven}
                          stroke="#3FC380"
                          strokeDasharray="4 2"
                          strokeWidth={1.5}
                          label={{
                            value: isAr
                              ? `تعادل: سنة ${result.breakeven}`
                              : `Breakeven: yr ${result.breakeven}`,
                            position: "insideTopRight",
                            fontSize: 10,
                            fill: "#3FC380",
                          }}
                        />
                      )}
                      <Area
                        type="monotone"
                        dataKey="buyCost"
                        name={isAr ? "شراء" : "Buy"}
                        stroke="#E5484D"
                        strokeWidth={2}
                        fill="url(#buyGradient)"
                        animationDuration={1500}
                        dot={false}
                        activeDot={{ r: 4, fill: "#E5484D" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="rentCost"
                        name={isAr ? "إيجار" : "Rent"}
                        stroke="#C9A84C"
                        strokeWidth={2}
                        fill="url(#rentGradient)"
                        animationDuration={1500}
                        dot={false}
                        activeDot={{ r: 4, fill: "#C9A84C" }}
                      />
                      {exchangeRate > 0 && (
                        <Area
                          type="monotone"
                          dataKey="buyUSD"
                          name={isAr ? "شراء (دولار)" : "Buy (USD)"}
                          stroke="#6C8EEF"
                          strokeWidth={1.5}
                          strokeDasharray="5 3"
                          fill="url(#buyUSDGradient)"
                          animationDuration={1500}
                          dot={false}
                          activeDot={{ r: 3, fill: "#6C8EEF" }}
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div className="flex items-center gap-5 mt-3 justify-center flex-wrap" dir="ltr">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-[#E5484D] inline-block rounded" />
                    <span className="text-[0.65rem] text-muted-foreground">
                      {isAr ? "شراء (EGP)" : "Buy (EGP)"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-[#C9A84C] inline-block rounded" />
                    <span className="text-[0.65rem] text-muted-foreground">
                      {isAr ? "إيجار" : "Rent"}
                    </span>
                  </div>
                  {exchangeRate > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 inline-block" style={{ borderTop: "1.5px dashed #6C8EEF" }} />
                      <span className="text-[0.65rem] text-muted-foreground">
                        {isAr ? "شراء (USD)" : "Buy (USD)"}
                      </span>
                    </div>
                  )}
                  {result.breakeven !== null && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-[#3FC380] inline-block rounded border-dashed" />
                      <span className="text-[0.65rem] text-muted-foreground">
                        {isAr ? "نقطة التعادل" : "Breakeven"}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Bottom row: Donut + Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
              {/* Donut Chart */}
              <Card className="border-border/60 bg-card/60 md:col-span-2">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                    {isAr ? "تفصيل القسط الشهري" : "Monthly Payment Breakdown"}
                  </p>
                  <div className="relative" dir="ltr">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={donutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={2}
                          dataKey="value"
                          animationDuration={1200}
                        >
                          {donutData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ payload }) => {
                            if (!payload?.length) return null;
                            return (
                              <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground shadow-xl">
                                {payload.map((p, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.fill as string }} />
                                    <span className="text-muted-foreground">{p.name}:</span>
                                    <span className="font-mono font-bold">{symbol} {fmt(fromEGP(Number(p.value)))}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          }}
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "11px",
                            color: "hsl(var(--foreground))",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[0.6rem] text-muted-foreground">
                        {isAr ? "شهريًا" : "monthly"}
                      </span>
                      <span className="font-mono text-sm font-black text-foreground">
                        {symbol} {fmt(fromEGP(result.monthlyMortgage), { compact: true })}
                      </span>
                    </div>
                  </div>
                  {/* Donut legend */}
                  <div className="space-y-1.5 mt-2">
                    {donutData.map((d) => (
                      <div
                        key={d.name}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: d.color }}
                          />
                          <span className="text-muted-foreground">{d.name}</span>
                        </div>
                        <span className="font-mono font-semibold text-foreground">
                          {symbol} {fmt(fromEGP(d.value))}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Summary Cards grid */}
              <div className="md:col-span-3 grid grid-cols-2 gap-3">
                {summaryCards.map((card, i) => (
                  <motion.div
                    key={card.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.35 }}
                  >
                    <Card className="border-border/60 bg-card/60 h-full">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-1.5 mb-2">
                          {card.icon}
                          <p className="text-[0.65rem] text-muted-foreground leading-tight">
                            {card.label}
                          </p>
                        </div>
                        <p
                          className="font-mono text-base font-black leading-none"
                          style={{ color: card.color }}
                        >
                          {symbol} {fmt(fromEGP(card.value), { compact: true })}
                        </p>
                        <p className="text-[0.6rem] text-muted-foreground mt-0.5">
                          {card.value.toLocaleString()} EGP
                        </p>
                        {card.showUSD && card.usdValue !== null && exchangeRate > 0 && (
                          <p className="text-[0.6rem] text-[#6C8EEF] mt-0.5 font-mono">
                            ≈ $ {fmtCompact(card.usdValue)} USD
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Currency Risk Warning */}
            {exchangeRate > 0 && (
              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-amber-400 mb-1">
                    {isAr ? "تنبيه: تأثير سعر الصرف" : "Currency Risk Warning"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isAr
                      ? `بافتراض انخفاض الجنيه ${depreciationPct}% سنوياً، القيمة الحقيقية بالدولار تختلف بشكل كبير عن القيمة بالجنيه.`
                      : `Assuming ${depreciationPct}% annual EGP depreciation, USD-equivalent values differ significantly from EGP values.`}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Assumptions disclosure */}
            <Card className="border-border/40 bg-card/30">
              <CardContent className="p-4">
                <p className="text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                  {isAr ? "افتراضات الحساب" : "Calculation Assumptions"}
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
                  {[
                    {
                      label: isAr ? "تأمين + صيانة" : "Maintenance + Insurance",
                      value: "1% / yr",
                    },
                    {
                      label: isAr ? "أفق الحساب" : "Calculation horizon",
                      value: "30 years",
                    },
                    {
                      label: isAr ? "الدفعة المقدمة تُستثمر (للإيجار)" : "Down payment invested (rent path)",
                      value: `${investmentReturn}%`,
                    },
                    {
                      label: isAr ? "الضرائب والرسوم" : "Taxes & fees",
                      value: isAr ? "غير مشمولة" : "Not included",
                    },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between py-0.5 border-b border-border/30">
                      <span className="text-[0.6rem] text-muted-foreground">
                        {label}
                      </span>
                      <span className="text-[0.6rem] font-mono text-foreground/70">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ─── Methodology Section ──────────────────────────────────── */}
            <div className="mt-10 border-t border-border pt-8">
              <button
                onClick={() => setShowMethodology(!showMethodology)}
                className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <BookOpen size={14} />
                {isAr ? "المنهجية والافتراضات" : "Methodology & Assumptions"}
                <ChevronDown
                  size={12}
                  className={showMethodology ? "rotate-180 transition-transform" : "transition-transform"}
                />
              </button>

              {showMethodology && (
                <div className="mt-4 space-y-4 text-xs text-muted-foreground leading-relaxed">
                  {/* Mortgage Formula */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">
                      {isAr ? "صيغة القسط الشهري" : "Monthly Payment Formula"}
                    </h4>
                    <p className="font-mono bg-muted/40 rounded px-2 py-1 text-[0.65rem]">
                      M = P × [r(1+r)^n] / [(1+r)^n - 1]
                    </p>
                    <p className="mt-1">
                      {isAr
                        ? "حيث P = قيمة القرض، r = معدل الفائدة الشهري، n = عدد الأقساط"
                        : "Where P = loan amount, r = monthly interest rate, n = number of payments"}
                    </p>
                  </div>

                  {/* Buy Cost */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">
                      {isAr ? "صافي تكلفة الشراء" : "Net Buy Cost"}
                    </h4>
                    <p>
                      {isAr
                        ? "= المقدم + إجمالي الأقساط + الصيانة (1% سنوياً) - حقوق الملكية المتراكمة - ارتفاع قيمة العقار"
                        : "= Down payment + Total mortgage payments + Maintenance (1%/yr) - Equity built - Property appreciation"}
                    </p>
                  </div>

                  {/* Rent Cost */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">
                      {isAr ? "صافي تكلفة الإيجار" : "Net Rent Cost"}
                    </h4>
                    <p>
                      {isAr
                        ? "= إجمالي الإيجار (بزيادة سنوية) - عوائد استثمار المقدم"
                        : "= Cumulative rent (with annual increases) - Returns from investing the down payment"}
                    </p>
                  </div>

                  {/* USD Adjustment */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">
                      {isAr ? "التعديل بالدولار" : "USD Adjustment"}
                    </h4>
                    <p>
                      {isAr
                        ? "= تكلفة الشراء (EGP) ÷ (سعر الصرف الحالي × (1 + نسبة الانخفاض)^السنة)"
                        : "= Buy net cost (EGP) ÷ (current exchange rate × (1 + depreciation rate)^year)"}
                    </p>
                  </div>

                  {/* Assumptions */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">
                      {isAr ? "الافتراضات" : "Assumptions"}
                    </h4>
                    <ul className="list-disc list-inside space-y-1">
                      <li>
                        {isAr
                          ? "الصيانة والتأمين = 1% من قيمة العقار سنوياً"
                          : "Maintenance + insurance = 1% of property value per year"}
                      </li>
                      <li>
                        {isAr
                          ? "لا تشمل ضرائب العقار (معفاة للوحدات السكنية تحت حد معين)"
                          : "Property taxes excluded (exempt for residential units under threshold)"}
                      </li>
                      <li>
                        {isAr
                          ? "تكاليف الإغلاق غير مشمولة (عادة 3-5%)"
                          : "Closing costs not included (typically 3-5%)"}
                      </li>
                      <li>
                        {isAr ? "الأفق الزمني: 30 سنة" : "Time horizon: 30 years"}
                      </li>
                      <li>
                        {isAr
                          ? "القيم بالجنيه المصري ما لم يُذكر غير ذلك"
                          : "Values in EGP unless otherwise noted"}
                      </li>
                    </ul>
                  </div>

                  {/* Limitations */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">
                      {isAr ? "القيود" : "Limitations"}
                    </h4>
                    <p>
                      {isAr
                        ? "هذه الحاسبة تقديرية ولا تعتبر نصيحة مالية. الأسعار الفعلية قد تختلف بناءً على الموقع والحالة الاقتصادية. استشر متخصصاً مالياً قبل اتخاذ قرارات كبيرة."
                        : "This calculator is for estimation only and does not constitute financial advice. Actual rates vary by location and economic conditions. Consult a financial professional before making major decisions."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <Separator />
            <DataSourceFooter category="economy" />
          </div>
        </div>
      </div>
    </div>
  );
}
