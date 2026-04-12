"use client";

import { ExternalLink } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useLanguage } from "@/components/providers";

type SourceCategory = "government" | "parliament" | "constitution" | "budget" | "debt" | "elections" | "economy" | "industry" | "general";

export function DataSourceFooter({ category }: { category: SourceCategory }) {
  const { t, lang } = useLanguage();
  const isAr = lang === "ar";
  const sources = useQuery(api.sources.getByCategory, { category });

  if (!sources || sources.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-6 pt-4 border-t border-border">
      <span className="text-xs text-muted-foreground">
        {t.dataSource_sources}
      </span>
      {sources.map((s) => (
        <a
          key={s._id}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
        >
          <ExternalLink size={10} />
          {isAr ? s.nameAr : s.nameEn}
        </a>
      ))}
    </div>
  );
}
