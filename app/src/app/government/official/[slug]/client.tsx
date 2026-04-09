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

function getRoleLabel(
  role: string | undefined,
  isAr: boolean
): string {
  if (role === "president") return isAr ? "رئيس الجمهورية" : "President";
  if (role === "prime_minister") return isAr ? "رئيس الوزراء" : "Prime Minister";
  if (role === "governor") return isAr ? "محافظ" : "Governor";
  if (role === "mp") return isAr ? "نائب" : "MP";
  if (role === "senator") return isAr ? "عضو مجلس الشيوخ" : "Senator";
  if (role === "speaker") return isAr ? "رئيس البرلمان" : "Speaker";
  return isAr ? "وزير" : "Minister";
}

export default function OfficialPageClient({ slug }: { slug: string }) {
  const { lang, dir } = useLanguage();
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

  const roleLabel = getRoleLabel(official?.role, isAr);

  if (notFound) {
    return (
      <div className="page-content" dir={dir}>
        <div className="container-page text-center py-20">
          <p className="text-muted-foreground text-sm">
            {isAr ? "لم يتم العثور على المسؤول" : "Official not found"}
          </p>
          <Link
            href="/government"
            className="text-primary hover:underline text-sm mt-4 inline-block"
          >
            {isAr ? "← العودة للحكومة" : "← Back to Government"}
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
            {isAr ? "الرئيسية" : "Home"}
          </Link>
          <ChevronRight size={10} />
          <Link href="/government" className="hover:text-foreground">
            {isAr ? "الحكومة" : "Government"}
          </Link>
          <ChevronRight size={10} />
          <span className="text-foreground">{displayName}</span>
        </nav>

        <Skeleton name="official-profile" loading={isLoading}>
          {/* Direct-answer paragraph for GEO (ChatGPT/Perplexity extraction) */}
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            {isAr
              ? `${displayName} هو ${displayTitle} في جمهورية مصر العربية${official?.appointmentDate ? `، تم تعيينه في ${official.appointmentDate}` : ""}.`
              : `${displayName} is the ${displayTitle} of the Arab Republic of Egypt${official?.appointmentDate ? `, appointed on ${official.appointmentDate}` : ""}.`}
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
                      {isAr ? "تاريخ التعيين:" : "Appointed:"}{" "}
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
                      {isAr ? "المصدر الرسمي" : "Official source"} ↗
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
            {isAr ? "عرض كل المسؤولين" : "View all officials"}
          </Link>
        </Skeleton>

        <DataSourceFooter category="government" />
      </div>
    </div>
  );
}
