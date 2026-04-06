"use client";

import { useState } from "react";
import { Check, AlertTriangle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { SANAD_CONFIG, detectConsensus, type SanadEntry } from "@/lib/sanad";
import { useLanguage } from "@/components/providers";

interface SanadValueProps {
  entries: SanadEntry[];
  formatValue: (value: number) => string;
  mode?: "compact" | "expanded";
  className?: string;
}

export function SanadValue({
  entries,
  formatValue,
  mode = "compact",
  className,
}: SanadValueProps) {
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const [isExpanded, setIsExpanded] = useState(mode === "expanded");

  if (entries.length === 0) return null;

  const { isConsensus, consensusScore, consensusValue, agreeingSources, conflictingSources } =
    detectConsensus(entries);

  // ─── Single source ──────────────────────────────────────────────────────────
  if (entries.length === 1) {
    const entry = entries[0];
    const config = SANAD_CONFIG[entry.sanadLevel] ?? SANAD_CONFIG[4];
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span className="font-mono text-lg font-black tracking-tight text-foreground">
          {formatValue(entry.value)}
        </span>
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dot)} />
        {entry.sourceUrl && (
          <a
            href={entry.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/40 hover:text-primary"
          >
            <ExternalLink size={9} />
          </a>
        )}
      </div>
    );
  }

  // ─── Consensus (weighted score ≥ 6, sources agree) ──────────────────────────
  if (isConsensus && consensusValue !== undefined) {
    return (
      <div className={cn("space-y-1", className)}>
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-black tracking-tight text-foreground">
            {formatValue(consensusValue)}
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[0.6rem] font-medium hover:bg-emerald-500/20 transition-colors"
          >
            <Check size={9} />
            {isAr
              ? `مؤكد من ${agreeingSources.length} مصادر`
              : `${agreeingSources.length} sources agree`}
            {isExpanded ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
          </button>
          {/* Score indicator */}
          <span className="text-[0.5rem] font-mono text-muted-foreground/50">
            s:{consensusScore}
          </span>
        </div>

        {isExpanded && (
          <div className="pl-1 space-y-1">
            {agreeingSources.map((s, i) => {
              const config = SANAD_CONFIG[s.sanadLevel] ?? SANAD_CONFIG[4];
              return (
                <div key={i} className="flex items-center gap-1.5 text-[0.6rem] text-muted-foreground">
                  <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
                  <span>{isAr ? config.labelAr : config.labelEn}</span>
                  {s.sourceUrl && (
                    <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer"
                      className="text-muted-foreground/40 hover:text-primary">
                      <ExternalLink size={8} />
                    </a>
                  )}
                </div>
              );
            })}
            {conflictingSources.length > 0 && (
              <>
                <p className="text-[0.55rem] text-amber-600 dark:text-amber-400 flex items-center gap-1 pt-1">
                  <AlertTriangle size={8} />
                  {isAr ? "مصادر أخرى تختلف:" : "Other sources differ:"}
                </p>
                {conflictingSources.map((s, i) => {
                  const config = SANAD_CONFIG[s.sanadLevel] ?? SANAD_CONFIG[4];
                  return (
                    <div key={`c-${i}`} className="flex items-center gap-1.5 text-[0.6rem] text-muted-foreground/60">
                      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
                      <span className="font-mono">{formatValue(s.value)}</span>
                      <span>{isAr ? config.labelAr : config.labelEn}</span>
                      {s.sourceUrl && (
                        <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer"
                          className="text-muted-foreground/40 hover:text-primary">
                          <ExternalLink size={8} />
                        </a>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── Conflict (sources disagree or weak consensus) ──────────────────────────
  const sorted = [...entries].sort((a, b) => a.sanadLevel - b.sanadLevel);
  return (
    <div className={cn("space-y-1", className)}>
      {sorted.map((entry, i) => {
        const config = SANAD_CONFIG[entry.sanadLevel] ?? SANAD_CONFIG[4];
        return (
          <div
            key={i}
            className={cn(
              "flex items-center justify-between gap-2",
              i > 0 && "pt-1 border-t border-border/30"
            )}
          >
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-lg font-black tracking-tight text-foreground">
                {formatValue(entry.value)}
              </span>
              {entry.year && (
                <span className="text-[0.6rem] text-muted-foreground font-mono">
                  {entry.year}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
              <span className="text-[0.55rem] text-muted-foreground">
                {isAr ? config.labelAr : config.labelEn}
              </span>
              {entry.sourceUrl && (
                <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="text-muted-foreground/40 hover:text-primary">
                  <ExternalLink size={9} />
                </a>
              )}
            </div>
          </div>
        );
      })}
      <p className="text-[0.55rem] text-amber-600 dark:text-amber-400 flex items-center gap-1">
        <AlertTriangle size={8} />
        {isAr ? "مصادر متعددة — القيم تختلف" : "Multiple sources — values differ"}
      </p>
    </div>
  );
}
