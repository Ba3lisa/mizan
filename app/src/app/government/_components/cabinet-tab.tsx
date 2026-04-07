"use client";

import { useState } from "react";
import { Search, Users, Building2 } from "lucide-react";
import { DataSourceFooter } from "@/components/data-source";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useLanguage } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { SanadBadge } from "@/components/sanad-badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Skeleton } from "boneyard-js/react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Official {
  id: string;
  nameAr: string;
  nameEn: string;
  titleAr: string;
  titleEn: string;
  appointedAr?: string;
  appointedEn?: string;
  level: "president" | "pm" | "minister";
  sanadLevel?: number;
  sourceUrl?: string;
}

interface Ministry {
  id: string;
  nameAr: string;
  nameEn: string;
  ministerAr: string;
  ministerEn: string;
  employees: number;
  sector: string;
}

// ─── UI Config ────────────────────────────────────────────────────────────────

const sectors = [
  { key: "all", ar: "الكل", en: "All" },
  { key: "sovereignty", ar: "سيادية", en: "Sovereignty", color: "#E5484D" },
  { key: "economic", ar: "اقتصادية", en: "Economic", color: "#C9A84C" },
  { key: "social", ar: "اجتماعية", en: "Social", color: "#6C8EEF" },
  { key: "infrastructure", ar: "بنية تحتية", en: "Infrastructure", color: "#2EC4B6" },
];

// ─── Org Chart Card ───────────────────────────────────────────────────────────

function OfficialCard({ official, size = "md" }: { official: Official; size?: "lg" | "md" }) {
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const isLg = size === "lg";

  return (
    <Card className={cn(
      "border-border/80 transition-all hover:border-primary/40",
      isLg ? "bg-card" : "bg-card/80"
    )}>
      <CardContent className={cn("flex items-center gap-4", isLg ? "p-5" : "p-4")}>
        <div className={cn(
          "rounded-full flex items-center justify-center flex-shrink-0 font-bold text-primary-foreground",
          isLg ? "w-12 h-12 text-lg" : "w-10 h-10 text-sm",
          official.level === "president" ? "bg-primary" : official.level === "pm" ? "bg-primary/80" : "bg-muted-foreground/30"
        )}>
          {(isAr ? official.nameAr : official.nameEn).charAt(0)}
        </div>
        <div className="min-w-0">
          <p className={cn("font-bold text-foreground truncate flex items-center gap-1", isLg ? "text-base" : "text-sm")}>
            {isAr ? official.nameAr : official.nameEn}
            {official.sanadLevel && <SanadBadge sanadLevel={official.sanadLevel} sourceUrl={official.sourceUrl} />}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {isAr ? official.titleAr : official.titleEn}
          </p>
          {official.appointedEn && (
            <p className="text-[0.625rem] text-muted-foreground/60 font-mono mt-0.5">
              {isAr ? official.appointedAr : official.appointedEn}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Cabinet Tab ──────────────────────────────────────────────────────────────

export function CabinetTab() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const [ministrySearch, setMinistrySearch] = useState("");

  // Live Convex data
  const liveHierarchy = useQuery(api.government.getGovernmentHierarchy);

  const isLoading = liveHierarchy === undefined;

  // Adapt Convex president/pm to Official shape
  const president: Official | null = liveHierarchy?.president
    ? {
        id: liveHierarchy.president._id,
        nameAr: liveHierarchy.president.nameAr,
        nameEn: liveHierarchy.president.nameEn,
        titleAr: liveHierarchy.president.titleAr,
        titleEn: liveHierarchy.president.titleEn,
        appointedAr: liveHierarchy.president.appointmentDate ?? undefined,
        appointedEn: liveHierarchy.president.appointmentDate ?? undefined,
        level: "president",
        sanadLevel: liveHierarchy.president.sanadLevel ?? undefined,
        sourceUrl: liveHierarchy.president.sourceUrl ?? undefined,
      }
    : null;

  const pm: Official | null = liveHierarchy?.primeMinister
    ? {
        id: liveHierarchy.primeMinister._id,
        nameAr: liveHierarchy.primeMinister.nameAr,
        nameEn: liveHierarchy.primeMinister.nameEn,
        titleAr: liveHierarchy.primeMinister.titleAr,
        titleEn: liveHierarchy.primeMinister.titleEn,
        appointedAr: liveHierarchy.primeMinister.appointmentDate ?? undefined,
        appointedEn: liveHierarchy.primeMinister.appointmentDate ?? undefined,
        level: "pm",
        sanadLevel: liveHierarchy.primeMinister.sanadLevel ?? undefined,
        sourceUrl: liveHierarchy.primeMinister.sourceUrl ?? undefined,
      }
    : null;

  // Adapt Convex ministries
  const ministries: Ministry[] = liveHierarchy?.ministries
    ? liveHierarchy.ministries.map((m) => ({
        id: m._id,
        nameAr: m.nameAr,
        nameEn: m.nameEn,
        ministerAr: m.minister?.nameAr ?? "—",
        ministerEn: m.minister?.nameEn ?? "—",
        employees: m.employeeCount ?? 0,
        sector: (m as unknown as { sector?: string }).sector ?? "other",
      }))
    : [];

  const maxEmployees = ministries.length > 0 ? Math.max(...ministries.map(m => m.employees), 1) : 1;

  const filteredMinistries = ministries.filter(m => {
    const q = ministrySearch.toLowerCase();
    return !q || m.nameAr.includes(q) || m.nameEn.toLowerCase().includes(q) || m.ministerAr.includes(q) || m.ministerEn.toLowerCase().includes(q);
  });

  return (
    <Tabs defaultValue="leadership">
      <TabsList className="mb-8">
        <TabsTrigger value="leadership">{isAr ? "القيادة" : "Leadership"}</TabsTrigger>
        <TabsTrigger value="ministries">{isAr ? "الوزارات" : "Ministries"}</TabsTrigger>
      </TabsList>

      {/* ═══ LEADERSHIP — Visual Org Chart ═══ */}
      <TabsContent value="leadership">
        <Skeleton name="gov-leadership" loading={isLoading}>
          <div className="flex flex-col items-center gap-0">
            {/* President */}
            {president ? (
              <div className="w-full max-w-md">
                <OfficialCard official={president} size="lg" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">{isAr ? "لا توجد بيانات" : "No data available"}</p>
            )}

            {/* Connector */}
            {president && pm && <div className="w-px h-8 bg-border" />}

            {/* PM */}
            {pm && (
              <div className="w-full max-w-md">
                <OfficialCard official={pm} size="lg" />
              </div>
            )}

            {/* Connector to ministers */}
            {ministries.length > 0 && (
              <>
                <div className="w-px h-8 bg-border" />
                <div className="w-3/4 max-w-2xl h-px bg-border" />
              </>
            )}

            {/* Ministers Grid */}
            {ministries.length > 0 && (
              <div className="w-full mt-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4 text-center">
                  {isAr ? `مجلس الوزراء — ${ministries.length} وزارة` : `Cabinet — ${ministries.length} Ministries`}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ministries.map(m => {
                    const sectorInfo = sectors.find(s => s.key === m.sector);
                    return (
                      <Card key={m.id} className="border-border/60 hover:border-primary/30 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-foreground truncate">{isAr ? m.nameAr : m.nameEn}</p>
                              <p className="text-xs text-muted-foreground truncate">{isAr ? m.ministerAr : m.ministerEn}</p>
                            </div>
                            {sectorInfo?.color && (
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: sectorInfo.color }} />
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-[0.625rem]">
                              {isAr ? sectorInfo?.ar : sectorInfo?.en}
                            </Badge>
                            {m.employees > 0 && (
                              <span className="font-mono text-[0.625rem] text-muted-foreground">
                                <Users size={10} className="inline me-1" />
                                {m.employees >= 1000000 ? `${(m.employees / 1000000).toFixed(1)}M` : m.employees >= 1000 ? `${Math.round(m.employees / 1000)}K` : m.employees}
                              </span>
                            )}
                          </div>
                          {/* Employee bar */}
                          {m.employees > 0 && (
                            <div className="h-1 bg-muted rounded-full mt-3 overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${(m.employees / maxEmployees) * 100}%`, background: sectorInfo?.color ?? "var(--primary)" }} />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {!president && !pm && ministries.length === 0 && (
              <p className="text-center text-muted-foreground py-20">{isAr ? "لا توجد بيانات متاحة" : "No data available"}</p>
            )}

            <DataSourceFooter category="government" />
          </div>
        </Skeleton>
      </TabsContent>

      {/* ═══ MINISTRIES — Filterable Grid ═══ */}
      <TabsContent value="ministries">
        <Skeleton name="gov-ministries" loading={isLoading}>
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input value={ministrySearch} onChange={e => setMinistrySearch(e.target.value)} placeholder={isAr ? "بحث بالاسم أو الوزير..." : "Search by name or minister..."} className="ps-9 text-sm" />
              </div>
              <span className="text-xs text-muted-foreground">
                {isAr ? `${ministries.length} وزارة` : `${ministries.length} ministries`}
              </span>
            </div>

            {/* Ministry cards */}
            {ministries.length === 0 ? (
              <p className="text-center text-muted-foreground py-20">{isAr ? "لا توجد بيانات متاحة" : "No data available"}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredMinistries.map(m => {
                  const sectorInfo = sectors.find(s => s.key === m.sector);
                  return (
                    <Card key={m.id} className="border-border/60 hover:border-primary/30 transition-colors">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${sectorInfo?.color}20`, color: sectorInfo?.color }}>
                          <Building2 size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-foreground truncate">{isAr ? m.nameAr : m.nameEn}</p>
                          <p className="text-xs text-muted-foreground">{isAr ? m.ministerAr : m.ministerEn}</p>
                        </div>
                        {m.employees > 0 && (
                          <div className="text-end flex-shrink-0">
                            <p className="font-mono text-sm font-bold text-foreground">{m.employees >= 1000000 ? `${(m.employees / 1000000).toFixed(1)}M` : `${Math.round(m.employees / 1000)}K`}</p>
                            <p className="text-[0.625rem] text-muted-foreground">{isAr ? "موظف" : "employees"}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
            {filteredMinistries.length === 0 && ministries.length > 0 && (
              <p className="text-sm text-muted-foreground py-12 text-center">{isAr ? "لا توجد نتائج" : "No results"}</p>
            )}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">{filteredMinistries.length} {isAr ? "وزارة" : "ministries"}</p>
            </div>
            <DataSourceFooter category="government" />
          </>
        </Skeleton>
      </TabsContent>
    </Tabs>
  );
}
