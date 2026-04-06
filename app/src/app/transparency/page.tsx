"use client";

import { useState } from "react";
import { Skeleton } from "boneyard-js/react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ExternalLink,
  Activity,
  Shield,
  ChevronDown,
  ChevronRight,
  Building2,
  Users,
  BookOpen,
  BarChart3,
  TrendingDown,
  Landmark,
  RefreshCw,
  Database,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useLanguage } from "@/components/providers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface ConvexDataSource {
  _id: string;
  nameAr: string;
  nameEn: string;
  url: string;
  type: "official_government" | "international_org" | "academic" | "media" | "other";
  lastAccessedDate?: number;
  notes?: string;
  category: string;
}

interface DataCategoryOverview {
  tableName: string;
  recordCount: number;
  lastRefreshAt: number | null;
  lastRefreshStatus: "success" | "failed" | null;
  sourceUrl: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, { ar: string; en: string }> = {
  government: { ar: "الحكومة", en: "Government" },
  parliament: { ar: "البرلمان", en: "Parliament" },
  constitution: { ar: "الدستور", en: "Constitution" },
  budget: { ar: "الموازنة", en: "Budget" },
  debt: { ar: "الدين العام", en: "Debt" },
  elections: { ar: "الانتخابات", en: "Elections" },
  economy: { ar: "الاقتصاد", en: "Economy" },
};

// Table → category mapping for getDataOverview enrichment
const TABLE_TO_CATEGORY: Record<string, string> = {
  officials: "government",
  ministries: "government",
  governorates: "government",
  parliamentMembers: "parliament",
  parties: "parliament",
  constitutionArticles: "constitution",
  fiscalYears: "budget",
  budgetItems: "budget",
  debtRecords: "debt",
  elections: "elections",
};

const TABLE_LABEL_AR: Record<string, string> = {
  officials: "المسؤولون",
  ministries: "الوزارات",
  governorates: "المحافظات",
  parliamentMembers: "أعضاء البرلمان",
  parties: "الأحزاب",
  constitutionArticles: "مواد الدستور",
  fiscalYears: "السنوات المالية",
  budgetItems: "بنود الموازنة",
  debtRecords: "سجلات الدين",
  elections: "الانتخابات",
};

const TABLE_LABEL_EN: Record<string, string> = {
  officials: "Officials",
  ministries: "Ministries",
  governorates: "Governorates",
  parliamentMembers: "Parliament Members",
  parties: "Parties",
  constitutionArticles: "Constitution Articles",
  fiscalYears: "Fiscal Years",
  budgetItems: "Budget Items",
  debtRecords: "Debt Records",
  elections: "Elections",
};

// Ordered list of categories shown in the Category Details accordion
const ORDERED_CATEGORIES = [
  "government",
  "parliament",
  "constitution",
  "budget",
  "debt",
  "elections",
] as const;

type TrackedCategory = (typeof ORDERED_CATEGORIES)[number];

function getCategoryIcon(category: string) {
  switch (category) {
    case "government":
      return Building2;
    case "parliament":
      return Users;
    case "constitution":
      return BookOpen;
    case "budget":
      return BarChart3;
    case "debt":
      return TrendingDown;
    case "elections":
      return Landmark;
    default:
      return Database;
  }
}

const SOURCE_TYPE_CONFIG: Record<
  string,
  { labelAr: string; labelEn: string; color: string }
> = {
  official_government: {
    labelAr: "حكومي رسمي",
    labelEn: "Official Gov.",
    color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  international_org: {
    labelAr: "منظمة دولية",
    labelEn: "Intl. Org.",
    color: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  },
  media: {
    labelAr: "إعلام",
    labelEn: "Media",
    color: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  academic: {
    labelAr: "أكاديمي",
    labelEn: "Academic",
    color: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  },
  other: {
    labelAr: "أخرى",
    labelEn: "Other",
    color: "bg-muted text-muted-foreground",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(timestamp: number | null, isAr: boolean): string {
  if (!timestamp) return isAr ? "لم يتم" : "Never";
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return isAr ? "أقل من ساعة" : "< 1h ago";
  if (hours < 24) return isAr ? `منذ ${hours}س` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return isAr ? `منذ ${days}ي` : `${days}d ago`;
}

function mapStatus(
  status: string | null,
  recordCount?: number
): "success" | "failed" | "flagged" {
  if (status === "success") return "success";
  if (status === "failed") return "failed";
  if (status === null && recordCount && recordCount > 0) return "success";
  return "flagged";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusDot({ status }: { status: "success" | "failed" | "flagged" }) {
  return (
    <span
      className={cn("inline-block w-2 h-2 rounded-full shrink-0", {
        "bg-emerald-500": status === "success",
        "bg-red-500": status === "failed",
        "bg-amber-500": status === "flagged",
      })}
    />
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "success":
      return <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />;
    case "failed":
      return <XCircle size={14} className="text-red-500 shrink-0" />;
    case "flagged":
      return <AlertTriangle size={14} className="text-amber-500 shrink-0" />;
    default:
      return <Clock size={14} className="text-muted-foreground shrink-0" />;
  }
}

function StatusBadge({
  status,
  isAr,
}: {
  status: "success" | "failed" | "flagged";
  isAr: boolean;
}) {
  const config = {
    success: {
      label: "Healthy",
      labelAr: "سليم",
      className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0",
    },
    failed: {
      label: "Failed",
      labelAr: "فشل",
      className: "bg-red-500/15 text-red-600 dark:text-red-400 border-0",
    },
    flagged: {
      label: "Stale",
      labelAr: "قديم",
      className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-0",
    },
  };
  const c = config[status];
  return (
    <Badge className={cn("text-[0.6rem] px-1.5 py-0", c.className)}>
      {isAr ? c.labelAr : c.label}
    </Badge>
  );
}

// ─── Row 1 Left: Overall Health Card ─────────────────────────────────────────

interface HealthCardProps {
  isAr: boolean;
  categoryHealth: ConvexCategoryHealth[] | null;
  isLoading: boolean;
}

function OverallHealthCard({ isAr, categoryHealth, isLoading }: HealthCardProps) {
  const totalRecords = categoryHealth
    ? categoryHealth.reduce((sum, ch) => sum + ch.recordCount, 0)
    : 0;

  const successCount = categoryHealth
    ? categoryHealth.filter(
        (ch) => mapStatus(ch.lastStatus, ch.recordCount) === "success"
      ).length
    : 0;
  const failedCount = categoryHealth
    ? categoryHealth.filter(
        (ch) => mapStatus(ch.lastStatus, ch.recordCount) === "failed"
      ).length
    : 0;
  const flaggedCount = categoryHealth
    ? categoryHealth.filter(
        (ch) => mapStatus(ch.lastStatus, ch.recordCount) === "flagged"
      ).length
    : 0;
  const total = categoryHealth ? categoryHealth.length : 1;

  const successPct = Math.round((successCount / total) * 100);
  const failedPct = Math.round((failedCount / total) * 100);
  const flaggedPct = 100 - successPct - failedPct;

  return (
    <Card className="border-border/60 col-span-2 lg:col-span-2">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} className="text-primary" />
          <h2 className="text-sm font-bold">
            {isAr ? "الصحة الإجمالية" : "Overall Health"}
          </h2>
        </div>

        <Skeleton name="health-total" loading={isLoading}>
          <div className="mb-4">
            <p className="text-3xl font-black font-mono tabular-nums">
              {totalRecords.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              {isAr ? "إجمالي السجلات" : "total records tracked"}
            </p>
          </div>

          {/* Health ratio bar */}
          <div className="flex h-2 w-full rounded-full overflow-hidden gap-px mb-2">
            <div
              className="bg-emerald-500 transition-all"
              style={{ width: `${successPct}%` }}
            />
            <div
              className="bg-amber-500 transition-all"
              style={{ width: `${flaggedPct}%` }}
            />
            <div
              className="bg-red-500 transition-all"
              style={{ width: `${failedPct}%` }}
            />
          </div>
          <div className="flex items-center gap-3 text-[0.6rem] text-muted-foreground mb-5">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              {isAr ? `${successCount} سليم` : `${successCount} healthy`}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              {isAr ? `${flaggedCount} قديم` : `${flaggedCount} stale`}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
              {isAr ? `${failedCount} فشل` : `${failedCount} failed`}
            </span>
          </div>

          {/* Per-category mini indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
            {categoryHealth?.map((ch) => {
              const status = mapStatus(ch.lastStatus, ch.recordCount);
              const label = CATEGORY_LABELS[ch.category];
              return (
                <div key={ch.category} className="flex items-center gap-2">
                  <StatusDot status={status} />
                  <span className="text-xs text-muted-foreground truncate">
                    {isAr ? label?.ar : label?.en ?? ch.category}
                  </span>
                  <span className="text-[0.6rem] font-mono text-muted-foreground ms-auto">
                    {ch.recordCount.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </Skeleton>
      </CardContent>
    </Card>
  );
}

// ─── Row 1 Right: Latest Activity Card ───────────────────────────────────────

interface ActivityCardProps {
  isAr: boolean;
  activityLogs: ConvexRefreshLog[] | null;
  isLoading: boolean;
}

function LatestActivityCard({
  isAr,
  activityLogs,
  isLoading,
}: ActivityCardProps) {
  const recentLogs = activityLogs ? activityLogs.slice(0, 5) : [];

  return (
    <Card className="border-border/60 col-span-2 lg:col-span-1">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={16} className="text-primary" />
          <h2 className="text-sm font-bold">
            {isAr ? "آخر تحديثات" : "Latest Activity"}
          </h2>
        </div>

        <Skeleton name="activity-recent" loading={isLoading}>
          <div className="space-y-3">
            {recentLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {isAr ? "لا يوجد نشاط حتى الآن" : "No activity yet"}
              </p>
            ) : (
              recentLogs.map((log) => {
                const status = mapStatus(log.status);
                const label = CATEGORY_LABELS[log.category];
                const relTime = formatRelativeTime(log.startedAt, isAr);
                // Pick first change that has a value transition
                const highlight = log.changes.find(
                  (c) => c.previousValue && c.newValue
                );

                return (
                  <div
                    key={log._id}
                    className="flex items-start gap-2.5 pb-3 border-b border-border/50 last:border-0 last:pb-0"
                  >
                    <StatusIcon status={status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold truncate">
                          {isAr
                            ? (label?.ar ?? log.category)
                            : (label?.en ?? log.category)}
                        </span>
                        <span className="text-[0.6rem] text-muted-foreground shrink-0">
                          {relTime}
                        </span>
                      </div>
                      {log.recordsUpdated !== undefined && (
                        <p className="text-[0.6rem] text-muted-foreground">
                          {isAr
                            ? `${log.recordsUpdated} سجل محدث`
                            : `${log.recordsUpdated} records updated`}
                        </p>
                      )}
                      {highlight && (
                        <p className="text-[0.6rem] font-mono text-muted-foreground mt-0.5 truncate">
                          <span className="text-red-400 line-through">
                            {highlight.previousValue}
                          </span>{" "}
                          →{" "}
                          <span className="text-emerald-400">
                            {highlight.newValue}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Skeleton>
      </CardContent>
    </Card>
  );
}

// ─── Row 2 Left: Data Sources Card ───────────────────────────────────────────

interface SourcesCardProps {
  isAr: boolean;
  sources: ConvexDataSource[] | null;
  isLoading: boolean;
}

function DataSourcesCard({ isAr, sources, isLoading }: SourcesCardProps) {
  return (
    <Card className="border-border/60 col-span-2 lg:col-span-1">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-primary" />
            <h2 className="text-sm font-bold">
              {isAr ? "المصادر المتتبعة" : "Tracked Sources"}
            </h2>
          </div>
          {sources && (
            <Badge variant="secondary" className="text-[0.6rem]">
              {sources.length}
            </Badge>
          )}
        </div>
        <p className="text-[0.6rem] text-muted-foreground mb-4">
          {isAr
            ? "جميع المصادر التي يراقبها وكيل البيانات"
            : "All sources monitored by the data agent"}
        </p>

        <Skeleton name="sources-list" loading={isLoading}>
          <div className="space-y-2 max-h-80 overflow-y-auto pe-1">
            {sources?.map((src) => {
              const typeConf =
                SOURCE_TYPE_CONFIG[src.type] ?? SOURCE_TYPE_CONFIG.other;
              return (
                <div
                  key={src._id}
                  className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {isAr ? src.nameAr : src.nameEn}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={cn(
                          "text-[0.55rem] font-medium px-1.5 py-px rounded-full",
                          typeConf.color
                        )}
                      >
                        {isAr ? typeConf.labelAr : typeConf.labelEn}
                      </span>
                    </div>
                  </div>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors mt-0.5 shrink-0"
                    aria-label={isAr ? "فتح المصدر" : "Open source"}
                  >
                    <ExternalLink size={11} />
                  </a>
                </div>
              );
            })}
          </div>
        </Skeleton>
      </CardContent>
    </Card>
  );
}

// ─── Row 2 Right: Category Details Accordion Card ────────────────────────────

interface CategoryDetailsCardProps {
  isAr: boolean;
  categoryHealth: ConvexCategoryHealth[] | null;
  dataOverview: Record<string, DataCategoryOverview> | null;
  sources: ConvexDataSource[] | null;
  isLoading: boolean;
}

function CategoryDetailsCard({
  isAr,
  categoryHealth,
  dataOverview,
  sources,
  isLoading,
}: CategoryDetailsCardProps) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const toggle = (cat: string) =>
    setOpenCategory((prev) => (prev === cat ? null : cat));

  // Build a map from category → sources
  const sourcesByCategory: Record<string, ConvexDataSource[]> = {};
  if (sources) {
    for (const src of sources) {
      if (!sourcesByCategory[src.category]) {
        sourcesByCategory[src.category] = [];
      }
      sourcesByCategory[src.category].push(src);
    }
  }

  return (
    <Card className="border-border/60 col-span-2 lg:col-span-2">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw size={16} className="text-primary" />
          <h2 className="text-sm font-bold">
            {isAr ? "تفاصيل الفئات" : "Category Details"}
          </h2>
        </div>

        <Skeleton name="category-details" loading={isLoading}>
          <div className="space-y-1">
            {ORDERED_CATEGORIES.map((cat: TrackedCategory) => {
              const ch = categoryHealth?.find((c) => c.category === cat);
              const status = mapStatus(ch?.lastStatus ?? null, ch?.recordCount);
              const label = CATEGORY_LABELS[cat];
              const Icon = getCategoryIcon(cat);
              const isOpen = openCategory === cat;

              // Tables belonging to this category for the overview grid
              const relatedTables = Object.entries(TABLE_TO_CATEGORY)
                .filter(([, c]) => c === cat)
                .map(([tbl]) => tbl);

              const catSources = sourcesByCategory[cat] ?? [];

              return (
                <div key={cat} className="border border-border/50 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggle(cat)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-start"
                  >
                    <Icon
                      size={15}
                      className={cn("shrink-0", {
                        "text-emerald-500": status === "success",
                        "text-amber-500": status === "flagged",
                        "text-red-500": status === "failed",
                      })}
                    />
                    <span className="flex-1 text-sm font-semibold">
                      {isAr ? label?.ar : label?.en}
                    </span>
                    <StatusBadge status={status} isAr={isAr} />
                    <span className="text-[0.6rem] font-mono text-muted-foreground">
                      {ch
                        ? ch.recordCount.toLocaleString()
                        : "—"}
                      {" "}
                      {isAr ? "سجل" : "rec."}
                    </span>
                    <span className="text-[0.6rem] text-muted-foreground hidden sm:block">
                      {formatRelativeTime(ch?.lastRefreshTime ?? null, isAr)}
                    </span>
                    {isOpen ? (
                      <ChevronDown size={14} className="text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-2 bg-muted/20 border-t border-border/40 space-y-4">
                      {/* Stats grid */}
                      {dataOverview && relatedTables.length > 0 && (
                        <div>
                          <p className="text-[0.625rem] uppercase font-semibold text-muted-foreground tracking-wider mb-2">
                            {isAr ? "إحصائيات الجداول" : "Table Stats"}
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {relatedTables.map((tbl) => {
                              const ov = dataOverview[tbl];
                              return (
                                <div
                                  key={tbl}
                                  className="bg-background rounded-md px-3 py-2 border border-border/40"
                                >
                                  <p className="text-[0.6rem] text-muted-foreground">
                                    {isAr
                                      ? (TABLE_LABEL_AR[tbl] ?? tbl)
                                      : (TABLE_LABEL_EN[tbl] ?? tbl)}
                                  </p>
                                  <p className="font-mono text-sm font-bold">
                                    {ov ? ov.recordCount.toLocaleString() : "—"}
                                  </p>
                                  {ov?.sourceUrl && (
                                    <a
                                      href={ov.sourceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[0.55rem] text-primary/60 hover:text-primary inline-flex items-center gap-0.5 mt-0.5"
                                    >
                                      <ExternalLink size={8} />
                                      {isAr ? "المصدر" : "source"}
                                    </a>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Sources from dataSources table */}
                      {catSources.length > 0 && (
                        <div>
                          <p className="text-[0.625rem] uppercase font-semibold text-muted-foreground tracking-wider mb-2">
                            {isAr ? "المصادر المسجلة" : "Registered Sources"}
                          </p>
                          <div className="space-y-1">
                            {catSources.map((src) => (
                              <div
                                key={src._id}
                                className="flex items-start gap-2 text-xs"
                              >
                                <span className="text-muted-foreground flex-1">
                                  {isAr ? src.nameAr : src.nameEn}
                                </span>
                                {src.notes && (
                                  <span className="text-[0.6rem] text-muted-foreground/70 italic">
                                    {src.notes}
                                  </span>
                                )}
                                <a
                                  href={src.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary/60 hover:text-primary shrink-0"
                                >
                                  <ExternalLink size={10} />
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Auto-refresh indicator */}
                      <div className="flex items-center gap-1.5 text-[0.6rem] text-muted-foreground">
                        <RefreshCw size={9} />
                        {isAr
                          ? "يتجدد تلقائياً كل ٦ ساعات"
                          : "Auto-refreshes every 6 hours"}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Skeleton>
      </CardContent>
    </Card>
  );
}

// ─── Row 3: Sanad Levels ──────────────────────────────────────────────────────

function ConfidenceLevels({ isAr }: { isAr: boolean }) {
  const levels = [
    {
      key: "official_government",
      level: 1,
      labelAr: "حكومي رسمي",
      labelEn: "Official Government",
      descAr: "مباشر من مصادر حكومية رسمية (.gov.eg)",
      descEn: "Direct from gov.eg sources (CAPMAS, ministries)",
      color: "border-emerald-500/30 bg-emerald-500/5",
      dot: "bg-emerald-500",
      textColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      key: "international_org",
      level: 2,
      labelAr: "منظمة دولية",
      labelEn: "International Org",
      descAr: "البنك الدولي، صندوق النقد الدولي، الأمم المتحدة",
      descEn: "World Bank, IMF, UNDP",
      color: "border-blue-500/30 bg-blue-500/5",
      dot: "bg-blue-500",
      textColor: "text-blue-600 dark:text-blue-400",
    },
    {
      key: "news_media",
      level: 3,
      labelAr: "إعلام",
      labelEn: "News & Media",
      descAr: "الأهرام، الهيئة العامة للاستعلامات، إيجيبت توداي",
      descEn: "Ahram Online, SIS, EgyptToday",
      color: "border-amber-500/30 bg-amber-500/5",
      dot: "bg-amber-500",
      textColor: "text-amber-600 dark:text-amber-400",
    },
    {
      key: "other",
      level: 4,
      labelAr: "مصادر أخرى",
      labelEn: "Other Sources",
      descAr: "ويكيبيديا، مصادر مجتمعية",
      descEn: "Wikipedia, community-submitted",
      color: "border-border bg-muted/30",
      dot: "bg-muted-foreground",
      textColor: "text-muted-foreground",
    },
    {
      key: "derived",
      level: 5,
      labelAr: "محسوب",
      labelEn: "Derived/Calculated",
      descAr: "محسوب من بيانات أخرى",
      descEn: "Computed from other data",
      color: "border-violet-500/30 bg-violet-500/5",
      dot: "bg-violet-500",
      textColor: "text-violet-600 dark:text-violet-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {levels.map((lvl) => (
        <div
          key={lvl.key}
          className={cn(
            "rounded-lg border px-4 py-3 flex items-center gap-3",
            lvl.color
          )}
        >
          <span className="text-[0.6rem] font-mono text-muted-foreground/60">
            {lvl.level}
          </span>
          <span
            className={cn("w-2.5 h-2.5 rounded-full shrink-0", lvl.dot)}
          />
          <div>
            <p className={cn("text-xs font-bold", lvl.textColor)}>
              {isAr ? lvl.labelAr : lvl.labelEn}
            </p>
            <p className="text-[0.65rem] text-muted-foreground">
              {isAr ? lvl.descAr : lvl.descEn}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Row 3: Research Reports ──────────────────────────────────────────────────

interface ReportSource {
  nameEn: string;
  nameAr: string;
  accessible: boolean;
}

interface ResearchReport {
  titleEn: string;
  titleAr: string;
  dateEn: string;
  dateAr: string;
  sourcesChecked: ReportSource[];
  findingsCount: number;
  discrepancyCount: number;
  summaryEn: string;
  summaryAr: string;
  validationResults: Array<{ textEn: string; textAr: string; pass: boolean }>;
}

const RESEARCH_REPORTS: ResearchReport[] = [
  {
    titleEn: "External Debt Verification",
    titleAr: "التحقق من الدين الخارجي",
    dateEn: "April 2026",
    dateAr: "أبريل ٢٠٢٦",
    sourcesChecked: [
      { nameEn: "World Bank API", nameAr: "واجهة البنك الدولي", accessible: true },
      { nameEn: "IMF Country Report", nameAr: "تقرير صندوق النقد الدولي", accessible: true },
      { nameEn: "CBE Statistical Bulletin", nameAr: "النشرة الإحصائية للبنك المركزي", accessible: true },
      { nameEn: "Ministry of Finance Annual Report", nameAr: "التقرير السنوي لوزارة المالية", accessible: true },
    ],
    findingsCount: 8,
    discrepancyCount: 1,
    summaryEn:
      "Verified 8 external debt records across 4 sources. One minor discrepancy ($0.3B) found between World Bank data and IMF report — World Bank data adopted as the more recent figure.",
    summaryAr:
      "تم التحقق من ٨ سجلات دين خارجي عبر ٤ مصادر. وُجد تباين طفيف (٠.٣ مليار دولار) بين بيانات البنك الدولي وتقرير صندوق النقد — تم اعتماد بيانات البنك الدولي باعتبارها الأحدث.",
    validationResults: [
      { textEn: "Total external debt consistent across two primary sources", textAr: "إجمالي الدين الخارجي متسق عبر المصدرين الرئيسيين", pass: true },
      { textEn: "Debt-to-GDP ratio within expected range (91.5% vs 92.1% projected)", textAr: "نسبة الدين للناتج المحلي ضمن النطاق المتوقع (٩١.٥٪ مقابل ٩٢.١٪ متوقع)", pass: true },
      { textEn: "Creditor breakdown correlates with historical data", textAr: "توزيع الدائنين يتوافق مع البيانات التاريخية", pass: true },
      { textEn: "$0.3B discrepancy between World Bank & IMF (reporting timing difference)", textAr: "تباين ٠.٣ مليار دولار بين البنك الدولي وصندوق النقد (فارق توقيت التقارير)", pass: false },
    ],
  },
  {
    titleEn: "Budget Data Verification",
    titleAr: "التحقق من بيانات الموازنة",
    dateEn: "April 2026",
    dateAr: "أبريل ٢٠٢٦",
    sourcesChecked: [
      { nameEn: "Ministry of Finance website", nameAr: "موقع وزارة المالية", accessible: true },
      { nameEn: "MOF Financial Statements PDF", nameAr: "ملف البيانات المالية — وزارة المالية", accessible: true },
      { nameEn: "World Bank Egypt Fiscal Data", nameAr: "البنك الدولي — البيانات المالية المصرية", accessible: true },
      { nameEn: "IMF Article IV Report", nameAr: "تقرير المادة الرابعة لصندوق النقد الدولي", accessible: false },
    ],
    findingsCount: 12,
    discrepancyCount: 0,
    summaryEn:
      "Verified 12 budget line items against official sources. All totals cross-validate correctly. IMF Article IV report was inaccessible during this session.",
    summaryAr:
      "تم التحقق من ١٢ بنداً من بنود الموازنة مقارنةً بالمصادر الرسمية. جميع الإجماليات صحيحة. تقرير المادة الرابعة لصندوق النقد لم يكن متاحاً خلال هذه الجلسة.",
    validationResults: [
      { textEn: "Total revenue = 1,474B EGP (confirmed from MOF)", textAr: "إجمالي الإيرادات = ١٤٧٤ مليار جنيه (مؤكد من وزارة المالية)", pass: true },
      { textEn: "Total expenditure = 2,095B EGP (confirmed from MOF)", textAr: "إجمالي المصروفات = ٢٠٩٥ مليار جنيه (مؤكد من وزارة المالية)", pass: true },
      { textEn: "Deficit = 621B EGP (calculated: expenditure − revenue — matches)", textAr: "العجز = ٦٢١ مليار جنيه (محسوب: المصروفات − الإيرادات — متطابق)", pass: true },
      { textEn: "Expenditure line items sum to total expenditure figure", textAr: "مجموع بنود المصروفات يساوي الإجمالي", pass: true },
    ],
  },
];

function ResearchReportsSection({ isAr }: { isAr: boolean }) {
  const [openReport, setOpenReport] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {RESEARCH_REPORTS.map((report, idx) => {
        const isOpen = openReport === idx;
        return (
          <Card key={idx} className="border-border/60">
            <CardContent className="p-0">
              <button
                onClick={() => setOpenReport(isOpen ? null : idx)}
                className="w-full flex items-start gap-3 px-5 py-4 hover:bg-muted/30 transition-colors text-start rounded-xl"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold">
                      {isAr ? report.titleAr : report.titleEn}
                    </span>
                    <Badge variant="outline" className="text-[0.6rem]">
                      {isAr ? report.dateAr : report.dateEn}
                    </Badge>
                    <Badge
                      className={cn(
                        "text-[0.6rem] border-0",
                        report.discrepancyCount === 0
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {report.discrepancyCount === 0
                        ? (isAr ? "لا تباين" : "No discrepancies")
                        : (isAr
                            ? `${report.discrepancyCount} تباين`
                            : `${report.discrepancyCount} discrepancy`)}
                    </Badge>
                  </div>
                  <p className="text-[0.65rem] text-muted-foreground mt-0.5">
                    {isAr
                      ? `${report.findingsCount} نتيجة · ${report.sourcesChecked.length} مصادر`
                      : `${report.findingsCount} findings · ${report.sourcesChecked.length} sources`}
                  </p>
                </div>
                {isOpen ? (
                  <ChevronDown size={14} className="text-muted-foreground shrink-0 mt-1" />
                ) : (
                  <ChevronRight size={14} className="text-muted-foreground shrink-0 mt-1" />
                )}
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-1 border-t border-border/40 space-y-4">
                  {/* Summary */}
                  <p className="text-xs text-muted-foreground">
                    {isAr ? report.summaryAr : report.summaryEn}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Sources checked */}
                    <div>
                      <p className="text-[0.625rem] uppercase font-semibold text-muted-foreground tracking-wider mb-2">
                        {isAr ? "المصادر المفحوصة" : "Sources Checked"}
                      </p>
                      <div className="space-y-1">
                        {report.sourcesChecked.map((src, si) => (
                          <div
                            key={si}
                            className="flex items-center gap-2 text-xs"
                          >
                            {src.accessible ? (
                              <CheckCircle2
                                size={11}
                                className="text-emerald-500 shrink-0"
                              />
                            ) : (
                              <XCircle
                                size={11}
                                className="text-red-500 shrink-0"
                              />
                            )}
                            <span
                              className={
                                src.accessible
                                  ? "text-foreground"
                                  : "text-muted-foreground line-through"
                              }
                            >
                              {isAr ? src.nameAr : src.nameEn}
                            </span>
                            <span className="text-[0.6rem] text-muted-foreground">
                              {src.accessible
                                ? (isAr ? "متاح" : "accessible")
                                : (isAr ? "غير متاح" : "NOT accessible")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Validation results */}
                    <div>
                      <p className="text-[0.625rem] uppercase font-semibold text-muted-foreground tracking-wider mb-2">
                        {isAr ? "نتائج التحقق" : "Validation Results"}
                      </p>
                      <div className="space-y-1">
                        {report.validationResults.map((result, ri) => (
                          <div
                            key={ri}
                            className="flex items-start gap-2 text-xs"
                          >
                            <span
                              className={cn("shrink-0 mt-px", {
                                "text-emerald-500": result.pass,
                                "text-amber-500": !result.pass,
                              })}
                            >
                              {result.pass ? "✓" : "⚠"}
                            </span>
                            <span className="text-muted-foreground">
                              {isAr ? result.textAr : result.textEn}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TransparencyPage() {
  const { lang, dir } = useLanguage();
  const isAr = lang === "ar";

  // Convex queries
  const convexActivity = useQuery(api.transparency.getRecentActivity, {
    limit: 10,
  });
  const convexCategoryHealth = useQuery(api.transparency.getCategoryHealth);
  const convexSources = useQuery(api.sources.getAll);
  const convexDataOverview = useQuery(api.adminDashboard.getDataOverview);

  const isLoading =
    convexActivity === undefined ||
    convexCategoryHealth === undefined ||
    convexSources === undefined ||
    convexDataOverview === undefined;

  const activityLogs = isLoading
    ? null
    : (convexActivity as unknown as ConvexRefreshLog[]);

  const categoryHealth = isLoading
    ? null
    : (convexCategoryHealth as unknown as ConvexCategoryHealth[]);

  const sources = isLoading
    ? null
    : (convexSources as unknown as ConvexDataSource[]);

  const dataOverview = isLoading
    ? null
    : (convexDataOverview as unknown as Record<string, DataCategoryOverview>);

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page">
        {/* ─── Header ─── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Shield size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest">
                {isAr ? "الشفافية" : "Transparency"}
              </p>
              <h1 className="text-2xl md:text-3xl font-black">
                {isAr
                  ? "لوحة شفافية البيانات"
                  : "Data Transparency Dashboard"}
              </h1>
            </div>
          </div>
          <p className="text-sm text-muted-foreground max-w-xl">
            {isAr
              ? "عرض موحد لصحة البيانات، المصادر، وسجل التحديثات الآلية. يعمل وكيل الذكاء الاصطناعي كل ٦ ساعات للتحقق من المصادر الرسمية وتحديث السجلات."
              : "A unified view of data health, tracked sources, and the automated refresh audit trail. The AI agent runs every 6 hours to validate official sources and update records."}
          </p>
        </div>

        {/* ─── Row 1: Overall Health + Latest Activity ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <OverallHealthCard
            isAr={isAr}
            categoryHealth={categoryHealth}
            isLoading={isLoading}
          />
          <LatestActivityCard
            isAr={isAr}
            activityLogs={activityLogs}
            isLoading={isLoading}
          />
        </div>

        {/* ─── Row 2: Data Sources + Category Details ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <DataSourcesCard
            isAr={isAr}
            sources={sources}
            isLoading={isLoading}
          />
          <CategoryDetailsCard
            isAr={isAr}
            categoryHealth={categoryHealth}
            dataOverview={dataOverview}
            sources={sources}
            isLoading={isLoading}
          />
        </div>

        <Separator className="my-6" />

        {/* ─── Row 3: Sanad Levels ─── */}
        <div className="mb-6">
          <h2 className="text-sm font-bold mb-3">
            {isAr ? "مستويات السند" : "Sanad Levels"}
          </h2>
          <ConfidenceLevels isAr={isAr} />
        </div>

        {/* ─── Row 3: Research Reports ─── */}
        <div className="mb-8">
          <h2 className="text-sm font-bold mb-3">
            {isAr ? "تقارير التحقق" : "Research Reports"}
          </h2>
          <ResearchReportsSection isAr={isAr} />
        </div>

        {/* ─── Footer Note ─── */}
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 pb-4">
          <Activity size={11} className="shrink-0" />
          {isAr
            ? "هذه الصفحة تعرض سجلاً شفافاً لجميع عمليات التحديث الآلية. لا يتم تعديل أي بيانات بدون تسجيل."
            : "This page shows a transparent log of all automated updates. No data is modified without logging."}
        </p>
      </div>
    </div>
  );
}
