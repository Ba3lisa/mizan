"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { useLanguage } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type DataStatus = "success" | "stale" | "failed";

interface DataCategory {
  key: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  sourceUrl: string;
  sourceLabel: string;
  lastRefreshAr: string;
  lastRefreshEn: string;
  status: DataStatus;
  stats: { labelAr: string; labelEn: string; value: string | number }[];
  notes?: { ar: string; en: string };
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const categories: DataCategory[] = [
  {
    key: "government",
    nameAr: "الحكومة",
    nameEn: "Government",
    icon: "🏛",
    sourceUrl: "https://www.cabinet.gov.eg/English/TheMinistry/Pages/default.aspx",
    sourceLabel: "cabinet.gov.eg",
    lastRefreshAr: "٥ أبريل ٢٠٢٦ — ١٨:٠٠",
    lastRefreshEn: "Apr 5, 2026 — 18:00 UTC",
    status: "success",
    stats: [
      { labelAr: "المسؤولون", labelEn: "Officials", value: 49 },
      { labelAr: "الوزارات", labelEn: "Ministries", value: 15 },
      { labelAr: "المحافظات", labelEn: "Governorates", value: 27 },
    ],
    notes: {
      ar: "بيانات مجلس الوزراء محدّثة — لا توجد تغييرات وزارية منذ آخر تحديث.",
      en: "Cabinet data is current — no ministerial changes detected since last refresh.",
    },
  },
  {
    key: "parliament",
    nameAr: "البرلمان",
    nameEn: "Parliament",
    icon: "⚖",
    sourceUrl: "https://www.parliament.gov.eg",
    sourceLabel: "parliament.gov.eg",
    lastRefreshAr: "٥ أبريل ٢٠٢٦ — ١٢:٠٠",
    lastRefreshEn: "Apr 5, 2026 — 12:00 UTC",
    status: "stale",
    stats: [
      { labelAr: "أعضاء مجلس النواب", labelEn: "House Members", value: 596 },
      { labelAr: "أعضاء مجلس الشيوخ", labelEn: "Senate Members", value: 300 },
      { labelAr: "الأحزاب", labelEn: "Parties", value: 8 },
      { labelAr: "اللجان", labelEn: "Committees", value: 25 },
    ],
    notes: {
      ar: "تنبيه: موقع البرلمان أظهر ٥٩٤ عضواً — المتوقع ٥٩٦. تم الإشارة للمراجعة.",
      en: "Warning: parliament.gov.eg returned 594 members — expected 596. Flagged for review.",
    },
  },
  {
    key: "constitution",
    nameAr: "الدستور",
    nameEn: "Constitution",
    icon: "📜",
    sourceUrl: "https://www.presidency.eg",
    sourceLabel: "presidency.eg",
    lastRefreshAr: "ثابت — دستور ٢٠١٤ / تعديلات ٢٠١٩",
    lastRefreshEn: "Static — 2014 Constitution / 2019 Amendments",
    status: "success",
    stats: [
      { labelAr: "المواد", labelEn: "Articles", value: 247 },
      { labelAr: "الأبواب", labelEn: "Parts", value: 6 },
      { labelAr: "المواد المعدّلة", labelEn: "Amended Articles", value: 16 },
    ],
    notes: {
      ar: "البيانات ثابتة — الدستور لا يتغير إلا بتعديل دستوري رسمي.",
      en: "Data is static — constitution only changes via formal amendment process.",
    },
  },
  {
    key: "budget",
    nameAr: "الميزانية",
    nameEn: "Budget",
    icon: "💰",
    sourceUrl: "https://www.mof.gov.eg/en/posts/statementsAndReports/5",
    sourceLabel: "mof.gov.eg",
    lastRefreshAr: "٥ أبريل ٢٠٢٦ — ١٨:٠٠",
    lastRefreshEn: "Apr 5, 2026 — 18:00 UTC",
    status: "success",
    stats: [
      { labelAr: "السنوات المالية", labelEn: "Fiscal Years", value: 3 },
      { labelAr: "آخر سنة مالية", labelEn: "Latest Year", value: "2024–25" },
      { labelAr: "إجمالي الإيرادات", labelEn: "Total Revenue", value: "1,474B EGP" },
      { labelAr: "إجمالي المصروفات", labelEn: "Total Expenditure", value: "2,565B EGP" },
    ],
    notes: {
      ar: "تم التحقق من مجموع بنود الإيرادات ومطابقتها للأرقام المنشورة.",
      en: "Revenue line items validated and match published ministry figures.",
    },
  },
  {
    key: "debt",
    nameAr: "الدين العام",
    nameEn: "Debt",
    icon: "📊",
    sourceUrl: "https://api.worldbank.org/v2/country/EGY/indicator/DT.DOD.DECT.CD",
    sourceLabel: "worldbank.org / api",
    lastRefreshAr: "٥ أبريل ٢٠٢٦ — ١٨:٠٠",
    lastRefreshEn: "Apr 5, 2026 — 18:00 UTC",
    status: "success",
    stats: [
      { labelAr: "سجلات الدين", labelEn: "Debt Records", value: 5 },
      { labelAr: "آخر دين خارجي", labelEn: "Latest External Debt", value: "$155.2B" },
      { labelAr: "نسبة الدين للناتج", labelEn: "Debt-to-GDP", value: "47.2%" },
    ],
    notes: {
      ar: "تم تحديث قيمة الدين الخارجي: ١٥٢.٨ → ١٥٥.٢ مليار دولار (الربع الرابع ٢٠٢٤).",
      en: "External debt updated: $152.8B → $155.2B (Q4 2024 data from World Bank).",
    },
  },
  {
    key: "elections",
    nameAr: "الانتخابات",
    nameEn: "Elections",
    icon: "🗳",
    sourceUrl: "https://www.elections.eg",
    sourceLabel: "elections.eg",
    lastRefreshAr: "ثابت — آخر تحديث ديسمبر ٢٠٢٣",
    lastRefreshEn: "Static — last updated Dec 2023",
    status: "success",
    stats: [
      { labelAr: "الانتخابات", labelEn: "Elections", value: 3 },
      { labelAr: "آخر رئاسية", labelEn: "Latest Presidential", value: "Dec 2023" },
      { labelAr: "نسبة المشاركة", labelEn: "Turnout", value: "66.8%" },
    ],
    notes: {
      ar: "بيانات ثابتة — تُحدَّث عند انعقاد انتخابات جديدة.",
      en: "Static data — updated when new elections are held.",
    },
  },
];

// ─── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status, isAr }: { status: DataStatus; isAr: boolean }) {
  const cfg = {
    success: {
      label: isAr ? "محدّث" : "Up to date",
      className: "border-emerald-500/50 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
      icon: <CheckCircle2 size={11} />,
    },
    stale: {
      label: isAr ? "تنبيه" : "Flagged",
      className: "border-amber-500/50 text-amber-600 bg-amber-50 dark:bg-amber-950/30",
      icon: <AlertTriangle size={11} />,
    },
    failed: {
      label: isAr ? "خطأ" : "Failed",
      className: "border-red-500/50 text-red-600 bg-red-50 dark:bg-red-950/30",
      icon: <Clock size={11} />,
    },
  }[status];

  return (
    <Badge variant="outline" className={cn("flex items-center gap-1 text-xs px-2 py-0.5", cfg.className)}>
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}

// ─── Health Card ──────────────────────────────────────────────────────────────

function HealthCard({ cat, isAr }: { cat: DataCategory; isAr: boolean }) {
  const primaryStat = cat.stats[0];
  return (
    <Card className={cn(
      "border transition-colors",
      cat.status === "stale" && "border-amber-500/40",
      cat.status === "failed" && "border-red-500/40",
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">{cat.icon}</span>
            <span className="text-sm font-semibold text-foreground">
              {isAr ? cat.nameAr : cat.nameEn}
            </span>
          </div>
          <StatusBadge status={cat.status} isAr={isAr} />
        </div>
        <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
          {primaryStat.value}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isAr ? primaryStat.labelAr : primaryStat.labelEn}
        </p>
        <p className="text-[0.65rem] text-muted-foreground/70 mt-2 truncate">
          {isAr ? cat.lastRefreshAr : cat.lastRefreshEn}
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Category Section ─────────────────────────────────────────────────────────

function CategorySection({ cat, isAr }: { cat: DataCategory; isAr: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors text-start"
      >
        <span className="text-xl flex-shrink-0" aria-hidden="true">{cat.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground text-sm">
              {isAr ? cat.nameAr : cat.nameEn}
            </span>
            <StatusBadge status={cat.status} isAr={isAr} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {isAr ? cat.lastRefreshAr : cat.lastRefreshEn}
          </p>
        </div>
        {/* Primary stats row */}
        <div className="hidden sm:flex items-center gap-6 flex-shrink-0">
          {cat.stats.slice(0, 2).map((s, i) => (
            <div key={i} className="text-end">
              <p className="font-mono text-lg font-bold tabular-nums text-foreground">{s.value}</p>
              <p className="text-[0.65rem] text-muted-foreground whitespace-nowrap">
                {isAr ? s.labelAr : s.labelEn}
              </p>
            </div>
          ))}
        </div>
        <span className="flex-shrink-0 text-muted-foreground ms-2">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>

      {/* Expanded content */}
      {open && (
        <>
          <Separator />
          <div className="px-5 py-5 flex flex-col gap-5">
            {/* All stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {cat.stats.map((s, i) => (
                <div key={i} className="bg-muted/40 rounded-lg px-4 py-3">
                  <p className="font-mono text-2xl font-bold tabular-nums text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isAr ? s.labelAr : s.labelEn}
                  </p>
                </div>
              ))}
            </div>

            {/* Source + refresh */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  {isAr ? "المصدر" : "Data Source"}
                </p>
                <a
                  href={cat.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline font-mono"
                >
                  {cat.sourceLabel}
                  <ExternalLink size={12} className="flex-shrink-0" />
                </a>
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled
                className="flex items-center gap-2 text-xs text-muted-foreground cursor-not-allowed opacity-60"
              >
                <RefreshCw size={13} />
                {isAr ? "تحديث الآن — يتطلب وصول API" : "Refresh Now — Requires API Access"}
              </Button>
            </div>

            {/* Notes */}
            {cat.notes && (
              <div className="bg-muted/30 rounded-lg px-4 py-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                  {isAr ? "ملاحظات" : "Notes"}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {isAr ? cat.notes.ar : cat.notes.en}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { lang, dir } = useLanguage();
  const isAr = lang === "ar";

  const successCount = categories.filter((c) => c.status === "success").length;
  const staleCount = categories.filter((c) => c.status === "stale").length;
  const failedCount = categories.filter((c) => c.status === "failed").length;

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page flex flex-col gap-8">

        {/* Page header */}
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">
            {isAr ? "الإشراف والبيانات" : "Data Management"}
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {isAr ? "إدارة البيانات" : "Data Management"}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            {isAr
              ? "مصادر بيانات جميع أقسام الموقع — الحالة، عدد السجلات، وتواريخ التحديث"
              : "All site data sources — status, record counts, and refresh timestamps"}
          </p>
        </div>

        {/* Overall health summary */}
        <div className="rounded-xl border border-border bg-muted/20 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
              {isAr ? "حالة البيانات الكلية" : "Overall Data Health"}
            </p>
            <p className="text-sm text-foreground">
              {isAr
                ? `${successCount} أقسام محدّثة · ${staleCount} تنبيهات · ${failedCount} أخطاء`
                : `${successCount} categories up to date · ${staleCount} flagged · ${failedCount} failed`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600">
              <CheckCircle2 size={13} />
              <span className="font-mono font-bold">{successCount}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-600">
              <AlertTriangle size={13} />
              <span className="font-mono font-bold">{staleCount}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-red-600">
              <Clock size={13} />
              <span className="font-mono font-bold">{failedCount}</span>
            </div>
          </div>
        </div>

        {/* Health cards grid */}
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">
            {isAr ? "نظرة سريعة" : "Quick Overview"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <HealthCard key={cat.key} cat={cat} isAr={isAr} />
            ))}
          </div>
        </div>

        {/* Collapsible sections */}
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">
            {isAr ? "تفاصيل كل قسم" : "Category Details"}
          </p>
          <div className="flex flex-col gap-3">
            {categories.map((cat) => (
              <CategorySection key={cat.key} cat={cat} isAr={isAr} />
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div className="text-xs text-muted-foreground/60 border-t border-border pt-4">
          {isAr
            ? "جميع البيانات مستقاة من مصادر رسمية للحكومة المصرية. يتم تحديث البيانات الديناميكية تلقائياً كل 6 ساعات."
            : "All data sourced from official Egyptian government publications. Dynamic data auto-refreshes every 6 hours."}
        </div>

      </div>
    </div>
  );
}
