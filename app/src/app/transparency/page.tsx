"use client";

import { useState } from "react";
import { Bot, CheckCircle2, AlertTriangle, XCircle, Clock, ExternalLink, Activity, Database, Shield, RefreshCw } from "lucide-react";
import { useLanguage } from "@/components/providers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ─── Demo Data ───────────────────────────────────────────────────────────────

interface RefreshRun {
  id: string;
  timestamp: string;
  timestampAr: string;
  category: string;
  categoryAr: string;
  status: "success" | "failed" | "in_progress";
  recordsUpdated: number;
  duration: string;
  changes: Change[];
}

interface Change {
  action: "updated" | "validated" | "flagged" | "no_change" | "created";
  table: string;
  descriptionAr: string;
  descriptionEn: string;
  sourceUrl?: string;
  previousValue?: string;
  newValue?: string;
}

const recentRuns: RefreshRun[] = [
  {
    id: "r1", timestamp: "2026-04-05 18:00 UTC", timestampAr: "٥ أبريل ٢٠٢٦ — ١٨:٠٠",
    category: "debt", categoryAr: "الدين العام", status: "success", recordsUpdated: 2, duration: "4.2s",
    changes: [
      { action: "updated", table: "debtRecords", descriptionEn: "Updated external debt: $152.8B → $155.2B (Q4 2024)", descriptionAr: "تحديث الدين الخارجي: ١٥٢.٨ → ١٥٥.٢ مليار$ (الربع الرابع ٢٠٢٤)", sourceUrl: "https://api.worldbank.org/v2/country/EGY/indicator/DT.DOD.DECT.CD", previousValue: "$152.8B", newValue: "$155.2B" },
      { action: "validated", table: "debtRecords", descriptionEn: "Validated 5 debt records — debt-to-GDP ratios within expected range", descriptionAr: "تم التحقق من ٥ سجلات — نسب الدين للناتج المحلي ضمن النطاق المتوقع", sourceUrl: "https://data.worldbank.org/country/egypt-arab-rep" },
    ],
  },
  {
    id: "r2", timestamp: "2026-04-05 18:00 UTC", timestampAr: "٥ أبريل ٢٠٢٦ — ١٨:٠٠",
    category: "budget", categoryAr: "الموازنة", status: "success", recordsUpdated: 0, duration: "6.8s",
    changes: [
      { action: "validated", table: "budgetItems", descriptionEn: "Budget items sum validated: revenue = 1,474B EGP ✓", descriptionAr: "تم التحقق: مجموع الإيرادات = ١,٤٧٤ مليار جنيه ✓", sourceUrl: "https://www.mof.gov.eg/en/posts/statementsAndReports/5" },
      { action: "no_change", table: "fiscalYears", descriptionEn: "No new fiscal year data found on mof.gov.eg", descriptionAr: "لا توجد بيانات سنة مالية جديدة على موقع وزارة المالية" },
    ],
  },
  {
    id: "r3", timestamp: "2026-04-05 18:00 UTC", timestampAr: "٥ أبريل ٢٠٢٦ — ١٨:٠٠",
    category: "government", categoryAr: "الحكومة", status: "success", recordsUpdated: 0, duration: "3.1s",
    changes: [
      { action: "no_change", table: "officials", descriptionEn: "Checked cabinet.gov.eg — no minister changes detected", descriptionAr: "تم فحص موقع مجلس الوزراء — لا توجد تغييرات في التشكيل الوزاري", sourceUrl: "https://www.cabinet.gov.eg/English/TheMinistry/Pages/default.aspx" },
    ],
  },
  {
    id: "r4", timestamp: "2026-04-05 12:00 UTC", timestampAr: "٥ أبريل ٢٠٢٦ — ١٢:٠٠",
    category: "parliament", categoryAr: "البرلمان", status: "success", recordsUpdated: 0, duration: "1.2s",
    changes: [
      { action: "flagged", table: "parliamentMembers", descriptionEn: "⚠ Parliament.gov.eg returned 594 members — expected 596. AI created GitHub Issue #12 for community verification.", descriptionAr: "⚠ موقع البرلمان أظهر ٥٩٤ عضواً — المتوقع ٥٩٦. تم إنشاء Issue #12 على GitHub للتحقق المجتمعي." },
    ],
  },
  {
    id: "r5", timestamp: "2026-04-04 18:00 UTC", timestampAr: "٤ أبريل ٢٠٢٦ — ١٨:٠٠",
    category: "debt", categoryAr: "الدين العام", status: "failed", recordsUpdated: 0, duration: "12.0s",
    changes: [
      { action: "flagged", table: "debtRecords", descriptionEn: "World Bank API timeout after 10s — retained existing data", descriptionAr: "انتهت مهلة API البنك الدولي بعد ١٠ ثوانٍ — تم الاحتفاظ بالبيانات الحالية" },
    ],
  },
];

const categoryHealth = [
  { key: "government", ar: "الحكومة", en: "Government", lastRefresh: "2h ago", lastRefreshAr: "منذ ساعتين", status: "success" as const, records: 49, source: "cabinet.gov.eg" },
  { key: "parliament", ar: "البرلمان", en: "Parliament", lastRefresh: "2h ago", lastRefreshAr: "منذ ساعتين", status: "flagged" as const, records: 596, source: "parliament.gov.eg" },
  { key: "constitution", ar: "الدستور", en: "Constitution", lastRefresh: "Static", lastRefreshAr: "ثابت", status: "success" as const, records: 247, source: "presidency.eg" },
  { key: "budget", ar: "الموازنة", en: "Budget", lastRefresh: "2h ago", lastRefreshAr: "منذ ساعتين", status: "success" as const, records: 18, source: "mof.gov.eg" },
  { key: "debt", ar: "الدين العام", en: "Debt", lastRefresh: "2h ago", lastRefreshAr: "منذ ساعتين", status: "success" as const, records: 5, source: "worldbank.org" },
  { key: "elections", ar: "الانتخابات", en: "Elections", lastRefresh: "Static", lastRefreshAr: "ثابت", status: "success" as const, records: 3, source: "elections.eg" },
];

// ─── Components ──────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "success": return <CheckCircle2 size={14} className="text-emerald-500" />;
    case "failed": return <XCircle size={14} className="text-red-500" />;
    case "flagged": return <AlertTriangle size={14} className="text-amber-500" />;
    default: return <Clock size={14} className="text-muted-foreground" />;
  }
}

function ActionBadge({ action, isAr }: { action: string; isAr: boolean }) {
  const config: Record<string, { label: string; labelAr: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    updated: { label: "Updated", labelAr: "تحديث", variant: "default" },
    validated: { label: "Validated", labelAr: "تم التحقق", variant: "secondary" },
    flagged: { label: "Flagged", labelAr: "تنبيه", variant: "destructive" },
    no_change: { label: "No Change", labelAr: "لا تغيير", variant: "outline" },
    created: { label: "Created", labelAr: "إنشاء", variant: "default" },
  };
  const c = config[action] ?? config.no_change;
  return <Badge variant={c.variant} className="text-[0.625rem]">{isAr ? c.labelAr : c.label}</Badge>;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TransparencyPage() {
  const { lang, dir } = useLanguage();
  const isAr = lang === "ar";

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Bot size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest">
                {isAr ? "الشفافية" : "Transparency"}
              </p>
              <h1 className="text-2xl md:text-3xl font-black">
                {isAr ? "سجل تحديث البيانات" : "Data Refresh Audit Log"}
              </h1>
            </div>
          </div>
          <p className="text-sm text-muted-foreground max-w-xl">
            {isAr
              ? "سجل كامل لعمليات تحديث البيانات الآلية. يعمل وكيل ذكاء اصطناعي كل ٦ ساعات لفحص المصادر الرسمية والتحقق من البيانات وتحديثها."
              : "Full audit log of automated data refreshes. An AI agent runs every 6 hours to check official sources, validate data, and update records."}
          </p>
        </div>

        {/* Category Health */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
          {categoryHealth.map(cat => (
            <Card key={cat.key} className="border-border/60">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold">{isAr ? cat.ar : cat.en}</span>
                  <StatusIcon status={cat.status} />
                </div>
                <p className="font-mono text-2xl font-bold">{cat.records}</p>
                <p className="text-[0.625rem] text-muted-foreground">{isAr ? "سجل" : "records"}</p>
                <p className="text-[0.625rem] text-muted-foreground mt-1">
                  <Clock size={8} className="inline me-1" />
                  {isAr ? cat.lastRefreshAr : cat.lastRefresh}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator className="mb-8" />

        {/* Activity Feed */}
        <h2 className="text-sm font-bold mb-6">{isAr ? "سجل النشاط" : "Activity Feed"}</h2>

        <div className="space-y-4">
          {recentRuns.map(run => (
            <Card key={run.id} className={cn(
              "border-border/60",
              run.status === "failed" && "border-red-500/30"
            )}>
              <CardContent className="p-5">
                {/* Run header */}
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <StatusIcon status={run.status} />
                    <span className="text-sm font-bold">{isAr ? run.categoryAr : run.category}</span>
                    <Badge variant="outline" className="text-[0.625rem] font-mono">{run.duration}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <RefreshCw size={10} />
                    {isAr ? run.timestampAr : run.timestamp}
                  </div>
                </div>

                {/* Changes */}
                <div className="space-y-2">
                  {run.changes.map((change, i) => (
                    <div key={i} className="flex items-start gap-3 ps-6 text-sm">
                      <ActionBadge action={change.action} isAr={isAr} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">
                          {isAr ? change.descriptionAr : change.descriptionEn}
                        </p>
                        {change.previousValue && change.newValue && (
                          <p className="text-xs font-mono text-muted-foreground mt-0.5">
                            <span className="text-red-400 line-through">{change.previousValue}</span>
                            {" → "}
                            <span className="text-emerald-400">{change.newValue}</span>
                          </p>
                        )}
                        {change.sourceUrl && (
                          <a href={change.sourceUrl} target="_blank" rel="noopener noreferrer"
                            className="text-[0.625rem] text-primary/60 hover:text-primary no-underline hover:underline inline-flex items-center gap-0.5 mt-0.5">
                            <ExternalLink size={8} /> {isAr ? "المصدر" : "source"}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* How it works */}
        <div className="mt-12 mb-8">
          <h2 className="text-sm font-bold mb-4">{isAr ? "كيف يعمل" : "How It Works"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: RefreshCw, titleAr: "فحص كل ٦ ساعات", titleEn: "Check Every 6 Hours", descAr: "وكيل ذكاء اصطناعي يفحص المصادر الرسمية تلقائياً", descEn: "AI agent automatically checks official government sources" },
              { icon: Shield, titleAr: "تحقق حتمي", titleEn: "Deterministic Validation", descAr: "فحوصات رياضية: مجاميع الميزانية، عدد النواب، نسب الدين", descEn: "Math checks: budget totals, MP counts, debt ratios must pass" },
              { icon: Database, titleAr: "سجل كامل", titleEn: "Full Audit Trail", descAr: "كل تغيير موثق بالمصدر والقيمة القديمة والجديدة", descEn: "Every change logged with source URL, old value, and new value" },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <Card key={i} className="border-border/60">
                  <CardContent className="p-5">
                    <Icon size={20} className="text-primary mb-3" />
                    <h3 className="text-sm font-bold mb-1">{isAr ? item.titleAr : item.titleEn}</h3>
                    <p className="text-xs text-muted-foreground">{isAr ? item.descAr : item.descEn}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Activity size={11} />
          {isAr
            ? "هذه الصفحة تعرض سجل شفاف لجميع عمليات التحديث الآلية. لا يتم تعديل أي بيانات بدون تسجيل."
            : "This page shows a transparent log of all automated updates. No data is modified without logging."}
        </p>
      </div>
    </div>
  );
}
