"use client";

import { useState } from "react";
import { Search, Users, Building2, MapPin, ExternalLink } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useLanguage } from "@/components/providers";
import { Badge } from "@/components/ui/badge";

import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Skeleton } from "boneyard-js/react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Official {
  id: string;
  nameAr: string;
  nameEn: string;
  titleAr: string;
  titleEn: string;
  appointedAr?: string;
  appointedEn?: string;
  level: "president" | "pm" | "minister";
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

interface Governorate {
  id: string;
  nameAr: string;
  nameEn: string;
  capitalAr: string;
  capitalEn: string;
  population: number;
  regionAr: string;
  regionEn: string;
}

// ─── UI Config ───────────────────────────────────────────────────────────────

const sectors = [
  { key: "all", ar: "\u0627\u0644\u0643\u0644", en: "All" },
  { key: "sovereignty", ar: "\u0633\u064a\u0627\u062f\u064a\u0629", en: "Sovereignty", color: "#E5484D" },
  { key: "economic", ar: "\u0627\u0642\u062a\u0635\u0627\u062f\u064a\u0629", en: "Economic", color: "#C9A84C" },
  { key: "social", ar: "\u0627\u062c\u062a\u0645\u0627\u0639\u064a\u0629", en: "Social", color: "#6C8EEF" },
  { key: "infrastructure", ar: "\u0628\u0646\u064a\u0629 \u062a\u062d\u062a\u064a\u0629", en: "Infrastructure", color: "#2EC4B6" },
];

// ─── Org Chart Card ──────────────────────────────────────────────────────────

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
          <p className={cn("font-bold text-foreground truncate", isLg ? "text-base" : "text-sm")}>
            {isAr ? official.nameAr : official.nameEn}
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

// ─── Page ────────────────────────────────────────────────────────────────────

export default function GovernmentPage() {
  const { lang, dir } = useLanguage();
  const isAr = lang === "ar";
  const [ministrySearch, setMinistrySearch] = useState("");
  // Sector filter removed -- pipeline doesn't classify sectors
  const [govSearch, setGovSearch] = useState("");

  // Live Convex data
  const liveHierarchy = useQuery(api.government.getGovernmentHierarchy);
  const liveGovernorates = useQuery(api.government.listGovernorates);

  const isLoading = liveHierarchy === undefined || liveGovernorates === undefined;

  // Adapt Convex president/pm to Official shape — show nothing when loading or missing
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
      }
    : null;

  // Adapt Convex ministries — use sector field from Convex schema
  const ministries: Ministry[] = liveHierarchy?.ministries
    ? liveHierarchy.ministries.map((m) => ({
        id: m._id,
        nameAr: m.nameAr,
        nameEn: m.nameEn,
        ministerAr: m.minister?.nameAr ?? "\u2014",
        ministerEn: m.minister?.nameEn ?? "\u2014",
        employees: m.employeeCount ?? 0,
        sector: (m as unknown as { sector?: string }).sector ?? "other",
      }))
    : [];

  // Adapt Convex governorates
  const governorates: Governorate[] = liveGovernorates
    ? liveGovernorates.map((g) => ({
        id: g._id,
        nameAr: g.nameAr,
        nameEn: g.nameEn,
        capitalAr: g.capitalAr,
        capitalEn: g.capitalEn,
        population: g.population ?? 0,
        regionAr: g.regionAr ?? "",
        regionEn: g.regionEn ?? "",
      }))
    : [];

  const maxEmployees = ministries.length > 0 ? Math.max(...ministries.map(m => m.employees), 1) : 1;

  const filteredMinistries = ministries.filter(m => {
    const q = ministrySearch.toLowerCase();
    const matchSearch = !q || m.nameAr.includes(q) || m.nameEn.toLowerCase().includes(q) || m.ministerAr.includes(q) || m.ministerEn.toLowerCase().includes(q);
    const matchSector = true; // Sector filter removed -- pipeline doesn't classify sectors yet
    return matchSearch && matchSector;
  });

  const filteredGovernorates = governorates.filter(g => {
    const q = govSearch.toLowerCase();
    return !q || g.nameAr.includes(q) || g.nameEn.toLowerCase().includes(q);
  });

  const regionGroups = filteredGovernorates.reduce<Record<string, { label: string; govs: Governorate[] }>>((acc, gov) => {
    const key = gov.regionEn || "Other";
    if (!acc[key]) acc[key] = { label: isAr ? (gov.regionAr || "\u0623\u062e\u0631\u0649") : (gov.regionEn || "Other"), govs: [] };
    acc[key].govs.push(gov);
    return acc;
  }, {});

  // sectorCounts removed -- sector classification not in pipeline yet

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">
            {isAr ? "\u0627\u0644\u0633\u0644\u0637\u0629 \u0627\u0644\u062a\u0646\u0641\u064a\u0630\u064a\u0629" : "Executive Branch"}
          </p>
          <h1 className="text-3xl md:text-4xl font-black mb-2">
            {isAr ? "\u0627\u0644\u062d\u0643\u0648\u0645\u0629 \u0627\u0644\u0645\u0635\u0631\u064a\u0629" : "Egyptian Government"}
          </h1>
          <p className="text-muted-foreground text-sm max-w-lg">
            {isAr
              ? "\u0627\u0644\u0647\u064a\u0643\u0644 \u0627\u0644\u062a\u0646\u0638\u064a\u0645\u064a \u0644\u0644\u0633\u0644\u0637\u0629 \u0627\u0644\u062a\u0646\u0641\u064a\u0630\u064a\u0629 \u0641\u064a \u062c\u0645\u0647\u0648\u0631\u064a\u0629 \u0645\u0635\u0631 \u0627\u0644\u0639\u0631\u0628\u064a\u0629"
              : "Organizational structure of the executive branch of the Arab Republic of Egypt"}
          </p>
        </div>

        <Tabs defaultValue="leadership">
          <TabsList className="mb-8">
            <TabsTrigger value="leadership">{isAr ? "\u0627\u0644\u0642\u064a\u0627\u062f\u0629" : "Leadership"}</TabsTrigger>
            <TabsTrigger value="ministries">{isAr ? "\u0627\u0644\u0648\u0632\u0627\u0631\u0627\u062a" : "Ministries"}</TabsTrigger>
            <TabsTrigger value="governorates">{isAr ? "\u0627\u0644\u0645\u062d\u0627\u0641\u0638\u0627\u062a" : "Governorates"}</TabsTrigger>
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
                <p className="text-sm text-muted-foreground py-4">{isAr ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a" : "No data available"}</p>
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
                    {isAr ? `\u0645\u062c\u0644\u0633 \u0627\u0644\u0648\u0632\u0631\u0627\u0621 \u2014 ${ministries.length} \u0648\u0632\u0627\u0631\u0629` : `Cabinet \u2014 ${ministries.length} Ministries`}
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
                <p className="text-center text-muted-foreground py-20">{isAr ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0645\u062a\u0627\u062d\u0629" : "No data available"}</p>
              )}

              <p className="text-xs text-muted-foreground mt-8">
                <a href="https://english.ahram.org.eg/News/562168.aspx" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  <ExternalLink size={10} /> ahram.org.eg
                </a>
              </p>
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
                <Input value={ministrySearch} onChange={e => setMinistrySearch(e.target.value)} placeholder={isAr ? "\u0628\u062d\u062b \u0628\u0627\u0644\u0627\u0633\u0645 \u0623\u0648 \u0627\u0644\u0648\u0632\u064a\u0631..." : "Search by name or minister..."} className="ps-9 text-sm" />
              </div>
              <span className="text-xs text-muted-foreground">
                {isAr ? `${ministries.length} وزارة` : `${ministries.length} ministries`}
              </span>
            </div>

            {/* Ministry cards */}
            {ministries.length === 0 ? (
              <p className="text-center text-muted-foreground py-20">{isAr ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0645\u062a\u0627\u062d\u0629" : "No data available"}</p>
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
                            <p className="text-[0.625rem] text-muted-foreground">{isAr ? "\u0645\u0648\u0638\u0641" : "employees"}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
            {filteredMinistries.length === 0 && ministries.length > 0 && <p className="text-sm text-muted-foreground py-12 text-center">{isAr ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0646\u062a\u0627\u0626\u062c" : "No results"}</p>}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">{filteredMinistries.length} {isAr ? "\u0648\u0632\u0627\u0631\u0629" : "ministries"}</p>
              <a href="https://english.ahram.org.eg/News/562168.aspx" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1"><ExternalLink size={10} /> ahram.org.eg</a>
            </div>
            </>
            </Skeleton>
          </TabsContent>

          {/* ═══ GOVERNORATES ═══ */}
          <TabsContent value="governorates">
            <Skeleton name="gov-governorates" loading={isLoading}>
            <>
            <div className="relative max-w-sm mb-8">
              <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input value={govSearch} onChange={e => setGovSearch(e.target.value)} placeholder={isAr ? "\u0628\u062d\u062b \u0641\u064a \u0627\u0644\u0645\u062d\u0627\u0641\u0638\u0627\u062a..." : "Search governorates..."} className="ps-9 text-sm" />
            </div>

            {governorates.length === 0 ? (
              <p className="text-center text-muted-foreground py-20">{isAr ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0645\u062a\u0627\u062d\u0629" : "No data available"}</p>
            ) : (
              Object.entries(regionGroups).map(([key, { label, govs }]) => (
                <div key={key} className="mb-10">
                  <h3 className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">{label}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {govs.map(g => (
                      <Card key={g.id} className="border-border/60 hover:border-primary/30 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-sm font-bold text-foreground">{isAr ? g.nameAr : g.nameEn}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin size={10} /> {isAr ? g.capitalAr : g.capitalEn}
                              </p>
                            </div>
                            {g.population > 0 && (
                              <span className="font-mono text-xs text-muted-foreground">{(g.population / 1_000_000).toFixed(1)}M</span>
                            )}
                          </div>
                          <Separator className="my-2" />
                          <p className="text-xs text-muted-foreground">
                            <span className="text-muted-foreground/60">{isAr ? "\u0627\u0644\u0645\u062d\u0627\u0641\u0638\u0629:" : "Region:"}</span>{" "}
                            <span className="text-foreground font-medium">{isAr ? g.regionAr : g.regionEn}</span>
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))
            )}

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">{filteredGovernorates.length} {isAr ? "\u0645\u062d\u0627\u0641\u0638\u0629" : "governorates"}</p>
              <a href="https://capmas.gov.eg" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1"><ExternalLink size={10} /> capmas.gov.eg</a>
            </div>
            </>
            </Skeleton>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
