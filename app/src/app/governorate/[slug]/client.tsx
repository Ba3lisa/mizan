"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useLanguage } from "@/components/providers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataSourceFooter } from "@/components/data-source";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ChevronRight, ArrowLeft, MapPin, Users, Ruler } from "lucide-react";

function slugToName(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPopulation(n: number, isAr: boolean): string {
  if (n >= 1_000_000) {
    return isAr
      ? `${(n / 1_000_000).toFixed(1)} مليون`
      : `${(n / 1_000_000).toFixed(1)}M`;
  }
  return n.toLocaleString();
}

function formatArea(n: number, isAr: boolean): string {
  return isAr ? `${n.toLocaleString()} كم²` : `${n.toLocaleString()} km²`;
}

export default function GovernoratePageClient({ slug }: { slug: string }) {
  const { lang, dir } = useLanguage();
  const isAr = lang === "ar";

  const governorate = useQuery(api.seo.getGovernorateBySlug, { slug });
  const isLoading = governorate === undefined;
  const notFound = !isLoading && governorate === null;

  const displayName = governorate
    ? isAr
      ? governorate.nameAr
      : governorate.nameEn
    : slugToName(slug);

  const capitalName = governorate
    ? isAr
      ? governorate.capitalAr
      : governorate.capitalEn
    : null;

  if (notFound) {
    return (
      <div className="page-content" dir={dir}>
        <div className="container-page text-center py-20">
          <p className="text-muted-foreground text-sm">
            {isAr ? "المحافظة غير موجودة" : "Governorate not found"}
          </p>
          <Link
            href="/governorate"
            className="text-primary hover:underline text-sm mt-4 inline-block"
          >
            {isAr ? "← العودة للمحافظات" : "← Back to Governorates"}
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
          <Link href="/governorate" className="hover:text-foreground">
            {isAr ? "المحافظات" : "Governorates"}
          </Link>
          <ChevronRight size={10} />
          <span className="text-foreground">{displayName}</span>
        </nav>

        <Skeleton name="governorate-profile" loading={isLoading}>
          {/* Direct-answer paragraph for GEO */}
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            {isAr
              ? `${displayName} هي محافظة مصرية${capitalName ? `، عاصمتها ${capitalName}` : ""}${governorate?.population ? `، يبلغ تعدادها السكاني ${formatPopulation(governorate.population, true)}` : ""}.`
              : `${displayName} is an Egyptian governorate${capitalName ? `, with its capital at ${capitalName}` : ""}${governorate?.population ? `, with a population of ${formatPopulation(governorate.population, false)}` : ""}.`}
          </p>

          {/* Header */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">
              {isAr ? "محافظة مصرية" : "Egyptian Governorate"}
            </p>
            <h1 className="text-3xl font-black">{displayName}</h1>
            {isAr && governorate?.nameEn && (
              <p className="text-muted-foreground text-sm mt-1">{governorate.nameEn}</p>
            )}
            {!isAr && governorate?.nameAr && (
              <p className="text-muted-foreground text-sm mt-1">{governorate.nameAr}</p>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {capitalName && (
              <Card className="border-border/60">
                <CardContent className="p-4 flex items-start gap-3">
                  <MapPin size={16} className="text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {isAr ? "العاصمة" : "Capital"}
                    </p>
                    <p className="font-semibold text-sm">{capitalName}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {governorate?.population && (
              <Card className="border-border/60">
                <CardContent className="p-4 flex items-start gap-3">
                  <Users size={16} className="text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {isAr ? "السكان" : "Population"}
                    </p>
                    <p className="font-semibold text-sm font-mono tabular-nums">
                      {formatPopulation(governorate.population, isAr)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {governorate?.area && (
              <Card className="border-border/60">
                <CardContent className="p-4 flex items-start gap-3">
                  <Ruler size={16} className="text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {isAr ? "المساحة" : "Area"}
                    </p>
                    <p className="font-semibold text-sm font-mono tabular-nums">
                      {formatArea(governorate.area, isAr)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Region badge */}
          {(governorate?.regionEn || governorate?.regionAr) && (
            <div className="mb-8">
              <Badge variant="secondary" className="text-xs">
                {isAr ? governorate.regionAr ?? governorate.regionEn : governorate.regionEn ?? governorate.regionAr}
              </Badge>
            </div>
          )}

          {/* Back link */}
          <Link
            href="/governorate"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft size={14} />
            {isAr ? "عرض كل المحافظات" : "View all governorates"}
          </Link>
        </Skeleton>

        <DataSourceFooter category="government" />
      </div>
    </div>
  );
}
