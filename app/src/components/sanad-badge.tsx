"use client";

import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { SANAD_CONFIG } from "@/lib/sanad";
import { useLanguage } from "@/components/providers";

interface SanadBadgeProps {
  sanadLevel: number;
  sourceUrl?: string;
  sourceNameEn?: string;
  sourceNameAr?: string;
  showLabel?: boolean;
  className?: string;
}

export function SanadBadge({
  sanadLevel,
  sourceUrl,
  sourceNameEn,
  sourceNameAr,
  showLabel = false,
  className,
}: SanadBadgeProps) {
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const config = SANAD_CONFIG[sanadLevel] ?? SANAD_CONFIG[4];

  return (
    <span className={cn("inline-flex items-center gap-1 shrink-0", className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      {showLabel && (
        <span className="text-[0.55rem] text-muted-foreground">
          {isAr ? config.labelAr : config.labelEn}
        </span>
      )}
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={isAr ? (sourceNameAr ?? sourceNameEn) : (sourceNameEn ?? sourceNameAr)}
          className="text-muted-foreground/40 hover:text-primary transition-colors"
        >
          <ExternalLink size={9} />
        </a>
      )}
    </span>
  );
}
