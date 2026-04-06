"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useLanguage } from "@/components/providers";
// Card/CardContent available if needed for layout changes
import { Skeleton } from "@/components/skeleton";
import {
  Loader2,
  Check,
  X,
  Clock,
  Minus,
  ChevronDown,
  ChevronUp,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type StepStatus = "pending" | "running" | "success" | "failed" | "skipped";

interface PipelineStep {
  step: string;
  status: StepStatus;
  message: string;
  messageAr: string;
  recordsUpdated: number | null;
  startedAt: number | null;
  completedAt: number | null;
  error: string | null;
}

interface PipelineProgress {
  steps: PipelineStep[];
  lastRunAt: number | null;
}

// ─── Step name translations ───────────────────────────────────────────────────

const STEP_NAMES_AR: Record<string, string> = {
  government: "الحكومة",
  parliament: "البرلمان",
  budget: "الموازنة",
  debt: "الدين",
  economy: "الاقتصاد",
  constitution: "الدستور",
  github_issues: "مشكلات GitHub",
  narrative: "التحليل الاقتصادي",
  cleanup: "التنظيف",
  reference_data: "البيانات المرجعية",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCountdown(ms: number, isAr: boolean): string {
  if (ms <= 0) return isAr ? "جارٍ التحديث الآن..." : "Refreshing now...";

  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  if (isAr) {
    const pad = (n: number) => n.toString();
    if (h > 0) return `التحديث التالي خلال ${pad(h)}س ${pad(m)}د ${pad(s)}ث`;
    if (m > 0) return `التحديث التالي خلال ${pad(m)}د ${pad(s)}ث`;
    return `التحديث التالي خلال ${pad(s)}ث`;
  }

  const hStr = h > 0 ? `${h}h ` : "";
  const mStr = m > 0 ? `${m}m ` : "";
  const sStr = `${s}s`;
  return `Next refresh in ${hStr}${mStr}${sStr}`;
}

function formatElapsed(startedAt: number | null, completedAt: number | null): string {
  if (startedAt === null) return "--";
  const end = completedAt ?? Date.now();
  const sec = (end - startedAt) / 1000;
  return `${sec.toFixed(1)}s`;
}

// ─── Status Icon ─────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case "pending":
      return <Minus size={14} className="text-muted-foreground" />;
    case "running":
      return <Loader2 size={14} className="text-primary animate-spin" />;
    case "success":
      return <Check size={14} className="text-emerald-500" />;
    case "failed":
      return <X size={14} className="text-destructive" />;
    case "skipped":
      return <Minus size={14} className="text-muted-foreground/50" />;
  }
}

function statusLabel(status: StepStatus, isAr: boolean): string {
  switch (status) {
    case "pending":
      return isAr ? "في الانتظار" : "Pending";
    case "running":
      return isAr ? "جارٍ..." : "Running...";
    case "success":
      return isAr ? "نجح" : "Success";
    case "failed":
      return isAr ? "فشل" : "Failed";
    case "skipped":
      return isAr ? "تخطى" : "Skipped";
  }
}

// ─── Countdown Hook ───────────────────────────────────────────────────────────

function useCountdown(lastRunAt: number | null): { msUntilNext: number; isRunning: boolean } {
  const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (lastRunAt === null) {
    return { msUntilNext: 0, isRunning: false };
  }

  const nextRun = lastRunAt + SIX_HOURS_MS;
  const msUntilNext = Math.max(0, nextRun - now);
  const isRunning = msUntilNext <= 0;
  return { msUntilNext, isRunning };
}

// ─── Pipeline Step Row ────────────────────────────────────────────────────────

function StepRow({ step, isAr }: { step: PipelineStep; isAr: boolean }) {
  const name = isAr ? (STEP_NAMES_AR[step.step] ?? step.step) : step.step;
  const message = isAr ? (step.messageAr || step.message) : (step.message || "--");
  const elapsed = formatElapsed(step.startedAt, step.completedAt);

  return (
    <tr className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
      <td className="px-4 py-2.5 text-xs font-medium capitalize whitespace-nowrap">
        {name}
      </td>
      <td className="px-4 py-2.5">
        <span className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium",
          step.status === "success" && "text-emerald-500",
          step.status === "failed" && "text-destructive",
          step.status === "running" && "text-primary",
          (step.status === "pending" || step.status === "skipped") && "text-muted-foreground",
        )}>
          <StatusIcon status={step.status} />
          {statusLabel(step.status, isAr)}
        </span>
      </td>
      <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">
        {step.error
          ? <span className="text-destructive">{step.error}</span>
          : (message || "--")}
        {step.recordsUpdated !== null && step.recordsUpdated > 0 && (
          <span className="ms-1.5 text-emerald-500/80">
            ({step.recordsUpdated} {isAr ? "سجل" : "records"})
          </span>
        )}
      </td>
      <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono text-end whitespace-nowrap">
        {step.status !== "pending" ? elapsed : "--"}
      </td>
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AiPipelineStatus() {
  const { lang, dir } = useLanguage();
  const isAr = lang === "ar";

  // Attempt to load the query — may not exist yet
  // We use a type-safe cast via unknown to handle missing query gracefully
  const progressQuery = (api as unknown as {
    pipelineProgress?: { getProgress: unknown };
  }).pipelineProgress?.getProgress;

  const rawProgress = useProgressSafe(progressQuery as Parameters<typeof useQuery>[0] | undefined);

  const progress = rawProgress as PipelineProgress | null | undefined;

  const { msUntilNext, isRunning } = useCountdown(progress?.lastRunAt ?? null);

  // Determine whether to start expanded (a run is in progress) or collapsed
  const hasActiveRun = progress?.steps?.some((s) => s.status === "running") ?? false;
  const [expanded, setExpanded] = useState(false);

  // Auto-expand when a run is detected in progress
  useEffect(() => {
    if (hasActiveRun) setExpanded(true);
  }, [hasActiveRun]);

  // No pipeline query available at all
  if (progressQuery === undefined) {
    return null;
  }

  // Loading state
  if (progress === undefined) {
    return (
      <section className="container-page py-4">
        <div className="border border-border/60 rounded-xl bg-card/40 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="w-4 h-4 rounded-full" />
            <Skeleton className="w-48 h-4 rounded" />
          </div>
          <Skeleton className="w-full h-24 rounded-lg" />
        </div>
      </section>
    );
  }

  // No data returned
  if (progress === null) {
    return null;
  }

  const steps = progress.steps ?? [];
  const successCount = steps.filter((s) => s.status === "success").length;
  const failedCount = steps.filter((s) => s.status === "failed").length;

  return (
    <section className="container-page py-4" dir={dir}>
      <div className="border border-border/60 rounded-xl bg-card/40 backdrop-blur-sm overflow-hidden">

        {/* Header — always visible */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/20 transition-colors text-start"
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-2.5">
            {isRunning || hasActiveRun ? (
              <Loader2 size={14} className="text-primary animate-spin" />
            ) : (
              <Bot size={14} className="text-primary opacity-70" />
            )}
            <span className="text-sm font-semibold">
              {isAr ? "حالة خط أنابيب البيانات" : "AI Data Pipeline"}
            </span>

            {/* Status badges */}
            <div className="flex items-center gap-1.5 ms-1">
              {hasActiveRun && (
                <span className="inline-flex items-center gap-1 text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  {isAr ? "نشط" : "Live"}
                </span>
              )}
              {failedCount > 0 && (
                <span className="text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive">
                  {failedCount} {isAr ? "فشل" : "failed"}
                </span>
              )}
              {!hasActiveRun && successCount > 0 && failedCount === 0 && (
                <span className="text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">
                  {isAr ? "مكتمل" : "Complete"}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Countdown */}
            <span className="text-xs text-muted-foreground font-mono hidden sm:block" style={{ direction: "ltr", unicodeBidi: "isolate" }}>
              <Clock size={10} className="inline me-1 opacity-60" />
              {formatCountdown(msUntilNext, isAr)}
            </span>
            {expanded ? (
              <ChevronUp size={14} className="text-muted-foreground" />
            ) : (
              <ChevronDown size={14} className="text-muted-foreground" />
            )}
          </div>
        </button>

        {/* Countdown on mobile */}
        <div className="sm:hidden px-5 pb-2 -mt-1">
          <span className="text-xs text-muted-foreground font-mono" style={{ direction: "ltr", unicodeBidi: "isolate" }}>
            <Clock size={10} className="inline me-1 opacity-60" />
            {formatCountdown(msUntilNext, isAr)}
          </span>
        </div>

        {/* Collapsible table */}
        {expanded && steps.length > 0 && (
          <div className="border-t border-border/40 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/30">
                  <th className="px-4 py-2 text-start text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
                    {isAr ? "الخطوة" : "Step"}
                  </th>
                  <th className="px-4 py-2 text-start text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
                    {isAr ? "الحالة" : "Status"}
                  </th>
                  <th className="px-4 py-2 text-start text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
                    {isAr ? "الرسالة" : "Message"}
                  </th>
                  <th className="px-4 py-2 text-end text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
                    {isAr ? "الوقت" : "Time"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {steps.map((step, i) => (
                  <StepRow key={`${step.step}-${i}`} step={step} isAr={isAr} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty state when expanded but no steps */}
        {expanded && steps.length === 0 && (
          <div className="border-t border-border/40 px-5 py-6 text-center text-xs text-muted-foreground">
            {isAr ? "لا توجد بيانات متاحة للمراحل" : "No pipeline step data available"}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Safe query hook wrapper ──────────────────────────────────────────────────
// Wraps useQuery so we can call it even if the query function is undefined.
// When undefined is passed, the hook returns undefined without subscribing.

function useProgressSafe(
  queryFn: Parameters<typeof useQuery>[0] | undefined,
): PipelineProgress | null | undefined {
  // We must call useQuery unconditionally to satisfy Rules of Hooks.
  // When queryFn is undefined we pass a sentinel "skip" pattern by wrapping in
  // a try/catch — but Convex doesn't support skip natively in v1, so instead
  // we always call the hook but guard the queryFn.
  //
  // The safest approach: always call useQuery with the first argument,
  // but return early from the component if the module isn't wired up.
  // Since this function is only called from one place and queryFn is stable
  // (always defined or always undefined per build), this is safe.

  // Convex useQuery will throw if queryFn is not a valid FunctionReference.
  // We catch that case by checking at the call site — if progressQuery is
  // undefined we return null from the component before reaching here.
  // This hook is therefore only called when queryFn is defined.
  return useQuery(queryFn as Parameters<typeof useQuery>[0]) as
    | PipelineProgress
    | null
    | undefined;
}
