"use client";

import { useState } from "react";
import { useLanguage } from "@/components/providers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, CheckCircle2, Clock, PauseCircle, Database } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type PromiseStatus = "completed" | "in_progress" | "stalled";

interface GovPromise {
  nameAr: string;
  nameEn: string;
  status: PromiseStatus;
  progress: number;
  dateAr: string;
  dateEn: string;
  descAr: string;
  descEn: string;
  source: string;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  PromiseStatus,
  {
    labelAr: string;
    labelEn: string;
    color: string;
    bgClass: string;
    borderClass: string;
    Icon: typeof CheckCircle2;
  }
> = {
  completed: {
    labelAr: "مكتمل",
    labelEn: "Completed",
    color: "#3FC380",
    bgClass: "bg-green-500/10",
    borderClass: "border-green-500/20",
    Icon: CheckCircle2,
  },
  in_progress: {
    labelAr: "جارٍ",
    labelEn: "In Progress",
    color: "#6C8EEF",
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500/20",
    Icon: Clock,
  },
  stalled: {
    labelAr: "متوقف",
    labelEn: "Stalled",
    color: "#C9A84C",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/20",
    Icon: PauseCircle,
  },
};

type FilterStatus = PromiseStatus | "all";

const FILTERS: { key: FilterStatus; labelAr: string; labelEn: string }[] = [
  { key: "all", labelAr: "الكل", labelEn: "All" },
  { key: "completed", labelAr: "مكتمل", labelEn: "Completed" },
  { key: "in_progress", labelAr: "جارٍ", labelEn: "In Progress" },
  { key: "stalled", labelAr: "متوقف", labelEn: "Stalled" },
];

// ─── Promise Card ─────────────────────────────────────────────────────────────

function PromiseCard({ promise, isAr }: { promise: GovPromise; isAr: boolean }) {
  const cfg = STATUS_CONFIG[promise.status];
  const Icon = cfg.Icon;

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur-sm hover:border-primary/30 transition-all">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground mb-0.5 leading-tight">
              {isAr ? promise.nameAr : promise.nameEn}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isAr ? promise.descAr : promise.descEn}
            </p>
          </div>
          <Badge
            variant="outline"
            className={`text-[0.65rem] flex-shrink-0 flex items-center gap-1 ${cfg.bgClass} ${cfg.borderClass}`}
            style={{ color: cfg.color }}
          >
            <Icon size={10} />
            {isAr ? cfg.labelAr : cfg.labelEn}
          </Badge>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-[0.625rem] text-muted-foreground">
              {isAr ? "التقدم" : "Progress"}
            </span>
            <span className="font-mono text-xs font-bold" style={{ color: cfg.color }}>
              {promise.progress}%
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${promise.progress}%`, background: cfg.color }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[0.625rem] text-muted-foreground">
            {isAr ? "بدأ:" : "Started:"}{" "}
            <span className="text-foreground font-medium">
              {isAr ? promise.dateAr : promise.dateEn}
            </span>
          </span>
          {promise.source && (
            <a
              href={promise.source}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[0.625rem] text-primary/60 hover:text-primary no-underline hover:underline transition-colors"
            >
              <ExternalLink size={9} />
              {isAr ? "المصدر" : "Source"}
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ isAr }: { isAr: boolean }) {
  return (
    <Card className="border-border/60 bg-card/60">
      <CardContent className="p-12 text-center">
        <Database size={24} className="mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-sm font-medium text-foreground mb-1">
          {isAr ? "لا توجد بيانات بعد" : "No data available yet"}
        </p>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          {isAr
            ? "سيتم تحميل بيانات الوعود الحكومية بواسطة وكيل البيانات. تحقق من صفحة الشفافية لمعرفة حالة التحديثات."
            : "Government promises data will be loaded by the data agent. Check the transparency page for update status."}
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PromisesPage() {
  const { lang, dir } = useLanguage();
  const isAr = lang === "ar";
  const [filter, setFilter] = useState<FilterStatus>("all");

  // No Convex table for governmentPromises yet.
  // When the data agent loads promises into Convex, wire this to useQuery.
  const promises: GovPromise[] = [];

  const filtered =
    filter === "all" ? promises : promises.filter((p) => p.status === filter);

  const counts = {
    total: promises.length,
    completed: promises.filter((p) => p.status === "completed").length,
    in_progress: promises.filter((p) => p.status === "in_progress").length,
    stalled: promises.filter((p) => p.status === "stalled").length,
  };

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">
            {isAr ? "المساءلة" : "Accountability"}
          </p>
          <h1 className="text-3xl md:text-4xl font-black mb-2">
            {isAr ? "تتبع الوعود الحكومية" : "Promises Tracker"}
          </h1>
          <p className="text-muted-foreground text-sm max-w-lg">
            {isAr
              ? "الالتزامات الكبرى للحكومة المصرية والمشاريع العملاقة — الحالة والتقدم"
              : "Major government commitments and megaprojects — status and progress"}
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { labelAr: "إجمالي الوعود", labelEn: "Total Promises", value: counts.total, color: "text-foreground" },
            { labelAr: "مكتمل", labelEn: "Completed", value: counts.completed, color: "text-green-400" },
            { labelAr: "جارٍ", labelEn: "In Progress", value: counts.in_progress, color: "text-blue-400" },
            { labelAr: "متوقف", labelEn: "Stalled", value: counts.stalled, color: "text-amber-400" },
          ].map((stat) => (
            <Card key={stat.labelEn} className="border-border/60 bg-card/60">
              <CardContent className="p-4 text-center">
                <p className={`font-mono text-3xl font-black ${stat.color}`}>{stat.value}</p>
                <p className="text-[0.625rem] text-muted-foreground mt-1 uppercase tracking-widest">
                  {isAr ? stat.labelAr : stat.labelEn}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 flex-wrap mb-6">
          {FILTERS.map((f) => (
            <Button
              key={f.key}
              variant={filter === f.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f.key)}
              className="text-xs h-8 rounded-full"
            >
              {isAr ? f.labelAr : f.labelEn}
              {f.key !== "all" && (
                <span className="ms-1.5 text-muted-foreground">
                  ({counts[f.key as keyof typeof counts]})
                </span>
              )}
            </Button>
          ))}
        </div>

        {/* Promise cards or empty state */}
        {promises.length === 0 ? (
          <EmptyState isAr={isAr} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((p) => (
              <PromiseCard key={p.nameEn} promise={p} isAr={isAr} />
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-12 col-span-2">
                {isAr ? "لا توجد نتائج" : "No results"}
              </p>
            )}
          </div>
        )}

        <p className="text-[0.625rem] text-muted-foreground/60 mt-8">
          {isAr
            ? "البيانات مستقاة من تصريحات الحكومة والتقارير الرسمية. التقدم تقديري."
            : "Data sourced from government statements and official reports. Progress is approximate."}
        </p>
      </div>
    </div>
  );
}
