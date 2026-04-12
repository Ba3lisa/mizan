"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useLanguage } from "@/components/providers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SanadBadge } from "@/components/sanad-badge";
import { DataSourceFooter } from "@/components/data-source";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ChevronRight, ArrowLeft } from "lucide-react";

function slugToName(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type TranslationsMap = Record<string, string>;

function getRoleLabel(
  role: string | undefined,
  t: TranslationsMap
): string {
  if (role === "president") return t.official_rolePresident;
  if (role === "prime_minister") return t.official_rolePM;
  if (role === "governor") return t.official_roleGovernor;
  if (role === "mp") return t.official_roleMP;
  if (role === "senator") return t.official_roleSenator;
  if (role === "speaker") return t.official_roleSpeaker;
  return t.official_roleMinister;
}

export default function OfficialPageClient({ slug }: { slug: string }) {
  const { lang, dir, t } = useLanguage();
  const isAr = lang === "ar";

  const official = useQuery(api.seo.getOfficialBySlug, { slug });
  const isLoading = official === undefined;
  const notFound = !isLoading && official === null;

  const displayName = official
    ? isAr
      ? official.nameAr
      : official.nameEn
    : slugToName(slug);

  const displayTitle = official ? (isAr ? official.titleAr : official.titleEn) : "";

  const roleLabel = getRoleLabel(official?.role, t as unknown as TranslationsMap);

  if (notFound) {
    return (
      <div className="page-content" dir={dir}>
        <div className="container-page text-center py-20">
          <p className="text-muted-foreground text-sm">
            {t.official_notFound}
          </p>
          <Link
            href="/government"
            className="text-primary hover:underline text-sm mt-4 inline-block"
          >
            {t.official_backToGov}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page max-w-3xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-8">
          <Link href="/" className="hover:text-foreground">
            {t.navHome}
          </Link>
          <ChevronRight size={10} />
          <Link href="/government" className="hover:text-foreground">
            {t.navGovernment}
          </Link>
          <ChevronRight size={10} />
          <span className="text-foreground">{displayName}</span>
        </nav>

        <Skeleton name="official-profile" loading={isLoading}>
          {/* Direct-answer paragraph for GEO (ChatGPT/Perplexity extraction) */}
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            {displayName} {t.official_isThe} {displayTitle} {t.official_ofEgypt}
            {official?.appointmentDate ? `, ${t.official_appointedOn} ${official.appointmentDate}` : ""}.
          </p>

          {/* Profile card */}
          <Card className="border-border/60 mb-8">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold flex-shrink-0">
                  {displayName.charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-black mb-1">{displayName}</h1>
                  {displayTitle && (
                    <p className="text-muted-foreground text-sm">{displayTitle}</p>
                  )}

                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {roleLabel}
                    </Badge>
                    {official?.sanadLevel !== undefined && (
                      <SanadBadge
                        sanadLevel={official.sanadLevel}
                        sourceUrl={official.sourceUrl}
                        showLabel
                      />
                    )}
                  </div>

                  {official?.appointmentDate && (
                    <p className="text-xs text-muted-foreground mt-3 font-mono">
                      {t.official_appointedLabel}{" "}
                      {official.appointmentDate}
                    </p>
                  )}

                  {official?.sourceUrl && (
                    <a
                      href={official.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline mt-2 inline-block"
                    >
                      {t.official_officialSource} ↗
                    </a>
                  )}
                </div>
              </div>

              {/* Bio */}
              {official?.bioEn && !isAr && (
                <p className="mt-5 pt-5 border-t border-border text-sm text-muted-foreground leading-relaxed">
                  {official.bioEn}
                </p>
              )}
              {official?.bioAr && isAr && (
                <p className="mt-5 pt-5 border-t border-border text-sm text-muted-foreground leading-relaxed">
                  {official.bioAr}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Back link */}
          <Link
            href="/government"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft size={14} />
            {t.official_viewAll}
          </Link>
        </Skeleton>

        <DataSourceFooter category="government" />
      </div>
    </div>
  );
}
