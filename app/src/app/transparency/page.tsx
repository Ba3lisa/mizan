"use client";

import { useState } from "react";
import { Skeleton } from "boneyard-js/react";
import { Bot, CheckCircle2, AlertTriangle, XCircle, Clock, ExternalLink, Activity, Database, Shield, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useLanguage } from "@/components/providers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  issueUrl?: string;
}

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

// ─── Data Registry ───────────────────────────────────────────────────────────

const dataPoints = [
  { category: "debt", nameAr: "الدين الخارجي", nameEn: "External Debt", value: "$155.2B", method: "direct", sourceEn: "World Bank API", sourceUrl: "https://api.worldbank.org/v2/country/EGY/indicator/DT.DOD.DECT.CD", confidence: "high" },
  { category: "debt", nameAr: "نسبة الدين للناتج المحلي", nameEn: "Debt-to-GDP Ratio", value: "84%", method: "calculated", sourceEn: "Calculated: $155.2B / $476B GDP", sourceUrl: "https://data.worldbank.org/country/egypt-arab-rep", confidence: "high", derivation: "totalExternalDebt / GDP × 100" },
  { category: "debt", nameAr: "الاحتياطي الأجنبي", nameEn: "Foreign Reserves", value: "$46.4B", method: "direct", sourceEn: "Central Bank of Egypt", sourceUrl: "https://www.cbe.org.eg/en/economic-research/statistics", confidence: "high" },
  { category: "budget", nameAr: "إجمالي الإيرادات", nameEn: "Total Revenue", value: "1,474B EGP", method: "direct", sourceEn: "Ministry of Finance Budget Statement 2024-25", sourceUrl: "https://www.mof.gov.eg/en/posts/statementsAndReports/5", confidence: "high" },
  { category: "budget", nameAr: "إجمالي المصروفات", nameEn: "Total Expenditure", value: "2,565B EGP", method: "direct", sourceEn: "Ministry of Finance", sourceUrl: "https://www.mof.gov.eg/en/posts/statementsAndReports/5", confidence: "high" },
  { category: "budget", nameAr: "العجز", nameEn: "Budget Deficit", value: "1,091B EGP", method: "calculated", sourceEn: "Calculated: 2,565 - 1,474", sourceUrl: "https://www.mof.gov.eg/en/posts/statementsAndReports/5", confidence: "high", derivation: "totalExpenditure - totalRevenue" },
  { category: "budget", nameAr: "خدمة الدين (% من الإنفاق)", nameEn: "Debt Service (% of spending)", value: "22.6%", method: "calculated", sourceEn: "Calculated: 580 / 2,565", sourceUrl: "https://www.mof.gov.eg/en/posts/statementsAndReports/5", confidence: "high", derivation: "debtService / totalExpenditure × 100" },
  { category: "parliament", nameAr: "أعضاء مجلس النواب", nameEn: "House Members", value: "596", method: "ai_extracted", sourceEn: "Wikipedia (2025 Election)", sourceUrl: "https://en.wikipedia.org/wiki/2025_Egyptian_parliamentary_election", confidence: "high" },
  { category: "parliament", nameAr: "أعضاء مجلس الشيوخ", nameEn: "Senate Members", value: "300", method: "ai_extracted", sourceEn: "Wikipedia (Egyptian Senate)", sourceUrl: "https://en.wikipedia.org/wiki/Egyptian_Senate", confidence: "high" },
  { category: "parliament", nameAr: "عدد الأحزاب", nameEn: "Political Parties", value: "22", method: "ai_extracted", sourceEn: "Wikipedia", sourceUrl: "https://en.wikipedia.org/wiki/2025_Egyptian_parliamentary_election", confidence: "high" },
  { category: "government", nameAr: "عدد المسؤولين", nameEn: "Officials", value: "30", method: "ai_extracted", sourceEn: "Ahram Online (AI-parsed)", sourceUrl: "https://english.ahram.org.eg/News/562168.aspx", confidence: "high" },
  { category: "government", nameAr: "عدد الوزارات", nameEn: "Ministries", value: "28", method: "ai_extracted", sourceEn: "Ahram Online", sourceUrl: "https://english.ahram.org.eg/News/562168.aspx", confidence: "high" },
  { category: "government", nameAr: "عدد المحافظات", nameEn: "Governorates", value: "27", method: "direct", sourceEn: "CAPMAS", sourceUrl: "https://www.capmas.gov.eg", confidence: "high" },
  { category: "constitution", nameAr: "عدد المواد", nameEn: "Constitutional Articles", value: "247", method: "direct", sourceEn: "State Information Service", sourceUrl: "https://www.sis.gov.eg/section/10/7527?lang=en", confidence: "high" },
  { category: "constitution", nameAr: "المواد المعدلة ٢٠١٩", nameEn: "2019 Amended Articles", value: "32", method: "direct", sourceEn: "State Information Service", sourceUrl: "https://www.sis.gov.eg/section/10/7527?lang=en", confidence: "high" },
  { category: "elections", nameAr: "أصوات السيسي ٢٠٢٤", nameEn: "El-Sisi Votes 2024", value: "39,702,845", method: "direct", sourceEn: "National Elections Authority", sourceUrl: "https://www.elections.eg", confidence: "high" },
  { category: "elections", nameAr: "نسبة المشاركة ٢٠٢٤", nameEn: "2024 Turnout", value: "66.8%", method: "direct", sourceEn: "National Elections Authority", sourceUrl: "https://www.elections.eg", confidence: "high" },
  { category: "economy", nameAr: "الناتج المحلي الإجمالي", nameEn: "GDP", value: "$476B", method: "direct", sourceEn: "World Bank", sourceUrl: "https://data.worldbank.org/country/egypt-arab-rep", confidence: "high" },
  { category: "economy", nameAr: "معدل التضخم", nameEn: "Inflation Rate", value: "28.1%", method: "direct", sourceEn: "CAPMAS", sourceUrl: "https://www.capmas.gov.eg", confidence: "high" },
  { category: "economy", nameAr: "سعر الدولار", nameEn: "USD/EGP Rate", value: "48.5", method: "direct", sourceEn: "Central Bank of Egypt", sourceUrl: "https://www.cbe.org.eg/en/economic-research/statistics", confidence: "high" },
  { category: "economy", nameAr: "إيرادات قناة السويس", nameEn: "Suez Canal Revenue", value: "$7.2B", method: "direct", sourceEn: "Suez Canal Authority", sourceUrl: "https://www.suezcanal.gov.eg", confidence: "high" },
  { category: "economy", nameAr: "معدل البطالة", nameEn: "Unemployment", value: "7.1%", method: "direct", sourceEn: "CAPMAS", sourceUrl: "https://www.capmas.gov.eg", confidence: "high" },
];

const methodLabels: Record<string, { ar: string; en: string; color: string }> = {
  direct: { ar: "مباشر من المصدر", en: "Direct from source", color: "text-emerald-500" },
  calculated: { ar: "محسوب", en: "Calculated", color: "text-blue-400" },
  ai_extracted: { ar: "مستخرج بالذكاء الاصطناعي", en: "AI-extracted", color: "text-amber-400" },
  estimated: { ar: "تقديري", en: "Estimated", color: "text-red-400" },
};

const categoryLabels: Record<string, { ar: string; en: string }> = {
  debt: { ar: "الدين العام", en: "Debt" },
  budget: { ar: "الموازنة", en: "Budget" },
  parliament: { ar: "البرلمان", en: "Parliament" },
  government: { ar: "الحكومة", en: "Government" },
  constitution: { ar: "الدستور", en: "Constitution" },
  elections: { ar: "الانتخابات", en: "Elections" },
  economy: { ar: "الاقتصاد", en: "Economy" },
};

function DataRegistry({ isAr }: { isAr: boolean }) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const categories = [...new Set(dataPoints.map(d => d.category))];

  return (
    <div>
      <h2 className="text-sm font-bold mb-2">{isAr ? "سجل البيانات — كل رقم ومصدره" : "Data Registry — Every Number & Its Source"}</h2>
      <p className="text-xs text-muted-foreground mb-6">
        {isAr
          ? "كل رقم على ميزان مدرج هنا مع مصدره الدقيق وطريقة الحصول عليه."
          : "Every number on Mizan is listed here with its exact source and how it was obtained."}
      </p>

      <div className="space-y-1">
        {categories.map(cat => {
          const items = dataPoints.filter(d => d.category === cat);
          const isExpanded = expandedCategory === cat;
          const catLabel = categoryLabels[cat];

          return (
            <div key={cat}>
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : cat)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors text-start"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                  <span className="text-sm font-bold">{isAr ? catLabel?.ar : catLabel?.en}</span>
                  <Badge variant="secondary" className="text-[0.6rem]">{items.length} {isAr ? "رقم" : "values"}</Badge>
                </div>
              </button>

              {isExpanded && (
                <div className="ms-7 mb-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-start px-3 py-2 text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-wider">{isAr ? "البيان" : "Data Point"}</th>
                          <th className="text-start px-3 py-2 text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-wider">{isAr ? "القيمة" : "Value"}</th>
                          <th className="text-start px-3 py-2 text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-wider">{isAr ? "الطريقة" : "Method"}</th>
                          <th className="text-start px-3 py-2 text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-wider">{isAr ? "المصدر" : "Source"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, i) => {
                          const ml = methodLabels[item.method];
                          return (
                            <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                              <td className="px-3 py-2.5 text-sm">{isAr ? item.nameAr : item.nameEn}</td>
                              <td className="px-3 py-2.5 font-mono text-sm font-bold">{item.value}</td>
                              <td className="px-3 py-2.5">
                                <span className={cn("text-xs font-medium", ml?.color)}>{isAr ? ml?.ar : ml?.en}</span>
                                {item.derivation && (
                                  <p className="text-[0.6rem] text-muted-foreground font-mono mt-0.5">{item.derivation}</p>
                                )}
                              </td>
                              <td className="px-3 py-2.5">
                                <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-primary no-underline hover:underline inline-flex items-center gap-1">
                                  {item.sourceEn} <ExternalLink size={9} />
                                </a>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

// ─── Types for Convex data ───────────────────────────────────────────────────

interface ConvexRefreshLog {
  _id: string;
  category: string;
  status: string;
  startedAt: number;
  completedAt?: number;
  recordsUpdated?: number;
  sourceUrl?: string;
  changes: Array<{
    action: string;
    tableName: string;
    descriptionAr: string;
    descriptionEn: string;
    previousValue?: string;
    newValue?: string;
    sourceUrl?: string;
  }>;
}

interface ConvexCategoryHealth {
  category: string;
  lastRefreshTime: number | null;
  lastAttemptTime: number | null;
  lastStatus: string | null;
  recordCount: number;
  recordsUpdated: number | null;
  sourceUrl: string | null;
}

function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp) return "Never";
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "< 1h ago";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function mapConvexStatus(status: string | null, recordCount?: number): "success" | "failed" | "flagged" {
  if (status === "success") return "success";
  if (status === "failed") return "failed";
  // If no pipeline run but data exists (loaded by reference data), show as success
  if (status === null && recordCount && recordCount > 0) return "success";
  return "flagged";
}

export default function TransparencyPage() {
  const { lang, dir } = useLanguage();
  const isAr = lang === "ar";

  // ─── Convex queries ───────────────────────────────────────────────────────
  const convexActivity = useQuery(api.transparency.getRecentActivity, { limit: 10 });
  const convexCategoryHealth = useQuery(api.transparency.getCategoryHealth);

  const isLoading = convexActivity === undefined || convexCategoryHealth === undefined;

  // ─── Map Convex data to UI types ──────────────────────────────────────────
  const activeRuns: RefreshRun[] | null = isLoading
    ? null
    : (convexActivity as unknown as ConvexRefreshLog[]).map((log) => ({
        id: log._id,
        timestamp: new Date(log.startedAt).toISOString().replace("T", " ").slice(0, 16) + " UTC",
        timestampAr: new Date(log.startedAt).toLocaleString("ar-EG"),
        category: log.category,
        categoryAr: log.category,
        status: log.status as "success" | "failed" | "in_progress",
        recordsUpdated: log.recordsUpdated ?? 0,
        duration: log.completedAt
          ? `${((log.completedAt - log.startedAt) / 1000).toFixed(1)}s`
          : "...",
        changes: (log.changes ?? []).map((c) => ({
          action: c.action as Change["action"],
          table: c.tableName,
          descriptionAr: c.descriptionAr,
          descriptionEn: c.descriptionEn,
          sourceUrl: c.sourceUrl,
          previousValue: c.previousValue,
          newValue: c.newValue,
        })),
      }));

  const categoryLabelsMap: Record<string, { ar: string; en: string }> = {
    government: { ar: "الحكومة", en: "Government" },
    parliament: { ar: "البرلمان", en: "Parliament" },
    constitution: { ar: "الدستور", en: "Constitution" },
    budget: { ar: "الموازنة", en: "Budget" },
    debt: { ar: "الدين العام", en: "Debt" },
    elections: { ar: "الانتخابات", en: "Elections" },
  };

  const activeCategoryHealth = isLoading
    ? null
    : (convexCategoryHealth as unknown as ConvexCategoryHealth[]).map((ch) => {
        const label = categoryLabelsMap[ch.category];
        return {
          key: ch.category,
          ar: label?.ar ?? ch.category,
          en: label?.en ?? ch.category.charAt(0).toUpperCase() + ch.category.slice(1),
          lastRefresh: ch.lastRefreshTime ? formatRelativeTime(ch.lastRefreshTime) : (ch.recordCount > 0 ? "Reference data" : "Never"),
          lastRefreshAr: ch.lastRefreshTime ? formatRelativeTime(ch.lastRefreshTime) : (ch.recordCount > 0 ? "بيانات مرجعية" : "لم يتم"),
          status: mapConvexStatus(ch.lastStatus, ch.recordCount),
          records: ch.recordCount ?? ch.recordsUpdated ?? 0,
          source: ch.sourceUrl ?? "",
        };
      });

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
        <Skeleton name="transparency-health" loading={isLoading}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
            {activeCategoryHealth?.map(cat => (
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
        </Skeleton>

        <Separator className="mb-8" />

        {/* Activity Feed */}
        <h2 className="text-sm font-bold mb-6">{isAr ? "سجل النشاط" : "Activity Feed"}</h2>

        <Skeleton name="transparency-activity-feed" loading={isLoading}>
        <div className="space-y-4">
          {activeRuns?.map(run => (
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
                        <div className="flex flex-wrap gap-3 mt-0.5">
                          {change.sourceUrl && (
                            <a href={change.sourceUrl} target="_blank" rel="noopener noreferrer"
                              className="text-[0.625rem] text-primary/60 hover:text-primary no-underline hover:underline inline-flex items-center gap-0.5">
                              <ExternalLink size={8} /> {isAr ? "المصدر" : "source"}
                            </a>
                          )}
                          {change.issueUrl && (
                            <a href={change.issueUrl} target="_blank" rel="noopener noreferrer"
                              className="text-[0.625rem] text-primary/60 hover:text-primary no-underline hover:underline inline-flex items-center gap-0.5">
                              <ExternalLink size={8} /> GitHub Issue
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        </Skeleton>

        {/* ── Data Registry — Every number on the site ── */}
        <Separator className="my-8" />
        <DataRegistry isAr={isAr} />

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
