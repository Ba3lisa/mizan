"use client";

import { useState, useMemo } from "react";
import { Skeleton } from "boneyard-js/react";
import { Search, X, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useLanguage } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Party {
  id: string;
  nameAr: string;
  nameEn: string;
  color: string;
  houseSeats: number;
  senateSeats: number;
  ideologyAr: string;
  ideologyEn: string;
}

// ─── Interactive Hemicycle ────────────────────────────────────────────────────

interface SeatDot {
  color: string;
  partyId: string;
}

function InteractiveHemicycle({ chamber, parties }: { chamber: "house" | "senate"; parties: Party[] }) {
  const [hoveredSeat, setHoveredSeat] = useState<{ idx: number; x: number; y: number } | null>(null);
  const [hoveredParty, setHoveredParty] = useState<string | null>(null);
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const seats = useMemo<SeatDot[]>(() => {
    const arr: SeatDot[] = [];
    parties.forEach((p) => {
      const count = chamber === "house" ? p.houseSeats : p.senateSeats;
      for (let i = 0; i < count; i++) {
        arr.push({ color: p.color, partyId: p.id });
      }
    });
    return arr;
  }, [chamber, parties]);

  const width = 600;
  const height = 310;
  const cx = width / 2;
  const cy = height - 20;
  const rowCount = 6;
  const dotRadius = 4;
  const rowGap = 18;

  const dotPositions = useMemo(() => {
    const positions: { x: number; y: number; index: number }[] = [];
    let seatIndex = 0;

    for (let row = 0; row < rowCount; row++) {
      const r = 80 + row * rowGap;
      const dotsInRow = Math.round((seats.length / rowCount) * (1 + row * 0.1));
      const angleStep = Math.PI / (dotsInRow + 1);

      for (let i = 0; i < dotsInRow && seatIndex < seats.length; i++) {
        const angle = Math.PI - (i + 1) * angleStep;
        positions.push({
          x: cx + r * Math.cos(angle),
          y: cy - r * Math.sin(angle),
          index: seatIndex,
        });
        seatIndex++;
      }
    }

    while (seatIndex < seats.length) {
      const row = rowCount - 1;
      const r = 80 + row * rowGap;
      positions.push({ x: cx, y: cy - r, index: seatIndex });
      seatIndex++;
    }

    return positions;
  }, [seats.length, cx, cy]);

  const total = parties.reduce(
    (s, p) => s + (chamber === "house" ? p.houseSeats : p.senateSeats),
    0
  );

  const hoveredPartyData = hoveredSeat !== null ? parties.find(p => p.id === seats[hoveredSeat.idx]?.partyId) : null;

  if (seats.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-20">
        {isAr ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0645\u062a\u0627\u062d\u0629" : "No data available"}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="relative w-full" dir="ltr">
        <svg
          viewBox="100 80 400 240"
          className="w-full max-h-80 block"
          preserveAspectRatio="xMidYMid meet"
          suppressHydrationWarning
          onMouseLeave={() => setHoveredSeat(null)}
        >
          {dotPositions.map((pos, i) => {
            const seat = seats[pos.index];
            if (!seat) return null;
            const isHoveredParty = hoveredParty === seat.partyId;
            const isHoveredSeat = hoveredSeat?.idx === pos.index;
            return (
              <circle
                key={i}
                cx={pos.x}
                cy={pos.y}
                r={isHoveredSeat ? dotRadius + 2 : dotRadius}
                fill={seat.color}
                opacity={
                  hoveredParty
                    ? (isHoveredParty ? 1 : 0.12)
                    : hoveredSeat
                    ? (isHoveredSeat ? 1 : 0.5)
                    : 0.85
                }
                stroke={isHoveredSeat ? "white" : "none"}
                strokeWidth={1}
                className="transition-all duration-100 cursor-pointer"
                onMouseEnter={() => setHoveredSeat({ idx: pos.index, x: pos.x, y: pos.y })}
              />
            );
          })}
          <line x1={cx - 280} y1={cy} x2={cx + 280} y2={cy} stroke="currentColor" strokeWidth={1} className="text-border" />
          <rect x={cx - 20} y={cy - 8} width={40} height={8} rx={2} fill="currentColor" className="text-border" />
        </svg>

        {/* Hover tooltip */}
        {hoveredSeat !== null && hoveredPartyData && (
          <div
            className="absolute z-20 bg-popover border border-border rounded-lg shadow-xl px-3 py-2 pointer-events-none text-xs max-w-[200px]"
            style={{
              left: `${((hoveredSeat.x - 100) / 400) * 100}%`,
              top: `${((hoveredSeat.y - 80) / 240) * 100}%`,
              transform: "translate(-50%, calc(-100% - 12px))",
            }}
          >
            <p className="font-semibold text-foreground">{isAr ? hoveredPartyData.nameAr : hoveredPartyData.nameEn}</p>
            <p className="text-muted-foreground">{chamber === "house" ? hoveredPartyData.houseSeats : hoveredPartyData.senateSeats} {isAr ? "\u0645\u0642\u0639\u062f" : "seats"}</p>
          </div>
        )}
      </div>

      {/* Party legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {parties.map((p) => {
          const seatCount = chamber === "house" ? p.houseSeats : p.senateSeats;
          const pct = total > 0 ? ((seatCount / total) * 100).toFixed(0) : "0";
          return (
            <button
              key={p.id}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-opacity cursor-pointer",
                hoveredParty && hoveredParty !== p.id && "opacity-30"
              )}
              onMouseEnter={() => setHoveredParty(p.id)}
              onMouseLeave={() => setHoveredParty(null)}
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
              <span className="text-muted-foreground">{isAr ? p.nameAr : p.nameEn}</span>
              <span className="font-mono text-muted-foreground">{seatCount}</span>
              <span className="font-mono text-muted-foreground/60">({pct}%)</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Party Distribution Tab ───────────────────────────────────────────────────

function PartyDistribution({ chamber, parties, onPartyFilter }: { chamber: "house" | "senate"; parties: Party[]; onPartyFilter: (id: string) => void }) {
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const [hoveredParty, setHoveredParty] = useState<string | null>(null);

  const total = parties.reduce(
    (s, p) => s + (chamber === "house" ? p.houseSeats : p.senateSeats),
    0
  );

  if (parties.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-20">
        {isAr ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0645\u062a\u0627\u062d\u0629" : "No data available"}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stacked bar */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {isAr ? "\u0627\u0644\u062a\u0648\u0632\u064a\u0639 \u0627\u0644\u062d\u0632\u0628\u064a" : "Party Distribution"} -- <span className="font-mono">{total}</span> {isAr ? "\u0645\u0642\u0639\u062f" : "seats"}
        </p>
        <div className="w-full h-10 rounded-lg overflow-hidden flex">
          {parties.map((p) => {
            const seatCount = chamber === "house" ? p.houseSeats : p.senateSeats;
            const pct = total > 0 ? (seatCount / total) * 100 : 0;
            return (
              <div
                key={p.id}
                className="transition-all duration-150 cursor-pointer"
                style={{
                  width: `${pct}%`,
                  background: p.color,
                  opacity: hoveredParty ? (hoveredParty === p.id ? 1 : 0.3) : 0.85,
                }}
                onMouseEnter={() => setHoveredParty(p.id)}
                onMouseLeave={() => setHoveredParty(null)}
              />
            );
          })}
        </div>
      </div>

      {/* Party cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {parties.map((p) => {
          const seatCount = chamber === "house" ? p.houseSeats : p.senateSeats;
          const pct = total > 0 ? ((seatCount / total) * 100).toFixed(1) : "0.0";
          return (
            <button
              key={p.id}
              onClick={() => onPartyFilter(p.id)}
              className={cn(
                "text-start rounded-xl border border-border bg-card/60 p-4 transition-all hover:border-primary/50 hover:bg-card",
                hoveredParty && hoveredParty !== p.id && "opacity-50"
              )}
              onMouseEnter={() => setHoveredParty(p.id)}
              onMouseLeave={() => setHoveredParty(null)}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.color }} />
                <span className="text-sm font-semibold text-foreground truncate">{isAr ? p.nameAr : p.nameEn}</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <span className="font-mono text-2xl font-bold text-foreground tabular-nums">{seatCount}</span>
                  <span className="text-xs text-muted-foreground ms-1">{isAr ? "\u0645\u0642\u0639\u062f" : "seats"}</span>
                </div>
                <span className="font-mono text-sm text-muted-foreground">{pct}%</span>
              </div>
              <div className="mt-2 w-full h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.color }} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">{isAr ? p.ideologyAr : p.ideologyEn}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Member Directory ─────────────────────────────────────────────────────────

function MemberDirectory({
  chamber,
  parties,
}: {
  chamber: "house" | "senate";
  parties: Party[];
}) {
  const { lang, t } = useLanguage();
  const isAr = lang === "ar";
  const [globalFilter, setGlobalFilter] = useState("");

  // No Convex members query yet — show empty state with search UI stub
  const isAr2 = isAr;
  void chamber; void parties; void globalFilter; void isAr2;

  return (
    <div className="flex flex-col gap-4">
      {/* Search bar stub */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={`${t.search}...`}
            className="ps-9 pe-8 text-sm"
          />
          {globalFilter && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setGlobalFilter("")}
              className="absolute end-1 top-1/2 -translate-y-1/2 h-7 w-7"
            >
              <X size={14} />
            </Button>
          )}
        </div>
      </div>

      <p className="text-center text-muted-foreground py-12">
        {isAr ? "\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0623\u0639\u0636\u0627\u0621 \u063a\u064a\u0631 \u0645\u062a\u0627\u062d\u0629 \u0628\u0639\u062f" : "Member data not yet available"}
      </p>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {isAr ? "\u0639\u0631\u0636 0 \u0639\u0636\u0648" : "Showing 0 members"}
        </p>
        <a
          href="https://parliament.gov.eg"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline"
        >
          parliament.gov.eg
        </a>
      </div>
    </div>
  );
}

// ─── Committees Tab ───────────────────────────────────────────────────────────

function CommitteesTab() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const liveHouseCommittees = useQuery(api.parliament.listCommittees, { chamber: "house" });
  const isLoading = liveHouseCommittees === undefined;

  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <Skeleton name="parliament-committees" loading={isLoading}>
    <div className="flex flex-col gap-2">
      {!isLoading && (!liveHouseCommittees || liveHouseCommittees.length === 0) ? (
        <p className="text-center text-muted-foreground py-20">{isAr ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0645\u062a\u0627\u062d\u0629" : "No data available"}</p>
      ) : (
        (liveHouseCommittees ?? []).map((committee) => {
          const isExpanded = expandedId === committee._id;

          return (
            <div key={committee._id} className="border border-border rounded-xl overflow-hidden bg-card/60">
              <button
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors text-start"
                onClick={() => setExpandedId(isExpanded ? null : committee._id)}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-semibold text-sm text-foreground">{isAr ? committee.nameAr : committee.nameEn}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {committee.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">{""} {isAr ? "\u0639\u0636\u0648" : "members"}</span>
                    </div>
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={16} className="text-muted-foreground flex-shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground flex-shrink-0" />}
              </button>

              {isExpanded && (
                <div className="px-5 pb-4 border-t border-border bg-muted/10">
                  <p className="text-xs text-muted-foreground mt-3">
                    {isAr ? "\u0639\u062f\u062f \u0627\u0644\u0623\u0639\u0636\u0627\u0621:" : "Members:"} {""}
                  </p>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
    </Skeleton>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ParliamentPage() {
  const { t, lang, dir } = useLanguage();
  const isAr = lang === "ar";
  const [chamber, setChamber] = useState<"house" | "senate">("house");
  const [directoryPartyFilter, setDirectoryPartyFilter] = useState("all");
  const [subTab, setSubTab] = useState("hemicycle");

  // Live Convex data
  const liveParties = useQuery(api.parliament.listParties);
  const liveHouseStats = useQuery(api.parliament.getParliamentStats, { chamber: "house" });
  const liveSenateStats = useQuery(api.parliament.getParliamentStats, { chamber: "senate" });
  const liveHouseCommittees = useQuery(api.parliament.listCommittees, { chamber: "house" });

  const isLoading = liveParties === undefined || liveHouseStats === undefined || liveSenateStats === undefined || liveHouseCommittees === undefined;

  // Build seat counts from stats queries, then merge with party data
  const DEFAULT_COLORS = ["#1B4F72", "#C0392B", "#27AE60", "#8E44AD", "#E67E22", "#16A085", "#7F8C8D"];

  // Extract seat counts per party from stats
  const houseSeatsByParty: Record<string, number> = {};
  const senateSeatsByParty: Record<string, number> = {};
  if (liveHouseStats?.parties) {
    for (const p of liveHouseStats.parties) {
      if (p.party?._id) houseSeatsByParty[p.party._id] = p.count;
    }
  }
  if (liveSenateStats?.parties) {
    for (const p of liveSenateStats.parties) {
      if (p.party?._id) senateSeatsByParty[p.party._id] = p.count;
    }
  }

  // Also add independent counts
  const houseIndependents = liveHouseStats?.independentCount ?? 0;
  const senateIndependents = liveSenateStats?.independentCount ?? 0;

  const parties: Party[] = [
    ...(liveParties ?? []).map((p, i) => ({
      id: p._id,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      color: p.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
      houseSeats: houseSeatsByParty[p._id] ?? 0,
      senateSeats: senateSeatsByParty[p._id] ?? 0,
      ideologyAr: p.ideology ?? "",
      ideologyEn: p.ideology ?? "",
    })),
    // Add independents as a virtual party if any exist
    ...(houseIndependents > 0 || senateIndependents > 0
      ? [{
          id: "independent",
          nameAr: "مستقل",
          nameEn: "Independent",
          color: "#7F8C8D",
          houseSeats: houseIndependents,
          senateSeats: senateIndependents,
          ideologyAr: "",
          ideologyEn: "",
        }]
      : []),
  ];

  const houseSeats = liveHouseStats?.totalMembers ?? 0;
  const senateSeats = liveSenateStats?.totalMembers ?? 0;
  const houseParties = parties.filter((p) => p.houseSeats > 0).length;
  const houseCommitteeCount = liveHouseCommittees?.length ?? 0;
  const activeSeats = chamber === "house" ? houseSeats : senateSeats;

  const handlePartyFilter = (partyId: string) => {
    setDirectoryPartyFilter(partyId);
    setSubTab("directory");
  };
  void directoryPartyFilter;

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page flex flex-col gap-10">

        {/* Page header */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {isAr ? "\u0627\u0644\u0633\u0644\u0637\u0629 \u0627\u0644\u062a\u0634\u0631\u064a\u0639\u064a\u0629" : "Legislative Branch"}
          </p>
          <h1 className="text-3xl font-bold text-foreground mb-1">
            {isAr ? "\u0645\u062c\u0644\u0633 \u0627\u0644\u0646\u0648\u0627\u0628 \u0627\u0644\u0645\u0635\u0631\u064a" : "Egyptian Parliament"}
          </h1>
          <p className="text-muted-foreground">{t.parliamentDesc}</p>
        </div>

        {/* Chamber tabs */}
        <Tabs value={chamber} onValueChange={(v) => setChamber(v as "house" | "senate")}>
          <TabsList className="mb-2">
            <TabsTrigger value="house">
              {isAr ? "\u0645\u062c\u0644\u0633 \u0627\u0644\u0646\u0648\u0627\u0628" : "House"}{" "}
              {houseSeats > 0 && <span className="ms-1.5 font-mono text-xs opacity-60">{houseSeats}</span>}
            </TabsTrigger>
            <TabsTrigger value="senate">
              {isAr ? "\u0645\u062c\u0644\u0633 \u0627\u0644\u0634\u064a\u0648\u062e" : "Senate"}{" "}
              {senateSeats > 0 && <span className="ms-1.5 font-mono text-xs opacity-60">{senateSeats}</span>}
            </TabsTrigger>
          </TabsList>

          {/* Stats bar */}
          <Skeleton name="parliament-stats-bar" loading={isLoading}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-t border-b border-border mb-6">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t.totalSeats}</p>
              <p className="font-mono text-3xl font-bold text-foreground tabular-nums">{activeSeats > 0 ? activeSeats : "--"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t.numberOfParties}</p>
              <p className="font-mono text-3xl font-bold text-foreground tabular-nums">{houseParties > 0 ? houseParties : "--"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t.committees}</p>
              <p className="font-mono text-3xl font-bold text-foreground tabular-nums">{houseCommitteeCount > 0 ? houseCommitteeCount : "--"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{isAr ? "\u0627\u0644\u0623\u062d\u0632\u0627\u0628" : "Parties"}</p>
              <p className="font-mono text-3xl font-bold text-foreground tabular-nums">{parties.length > 0 ? parties.length : "--"}</p>
            </div>
          </div>
          </Skeleton>

          {parties.length === 0 && !isLoading ? (
            <p className="text-center text-muted-foreground py-20">{isAr ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0645\u062a\u0627\u062d\u0629" : "No data available"}</p>
          ) : (
            /* Sub-tabs */
            <Tabs value={subTab} onValueChange={setSubTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="hemicycle">{isAr ? "\u062e\u0631\u064a\u0637\u0629 \u0627\u0644\u0645\u0642\u0627\u0639\u062f" : "Seat Map"}</TabsTrigger>
                <TabsTrigger value="distribution">{isAr ? "\u0627\u0644\u062a\u0648\u0632\u064a\u0639 \u0627\u0644\u062d\u0632\u0628\u064a" : "Party Distribution"}</TabsTrigger>
                <TabsTrigger value="directory">{isAr ? "\u062f\u0644\u064a\u0644 \u0627\u0644\u0623\u0639\u0636\u0627\u0621" : "Member Directory"}</TabsTrigger>
                <TabsTrigger value="committees">{isAr ? "\u0627\u0644\u0644\u062c\u0627\u0646" : "Committees"}</TabsTrigger>
              </TabsList>

              <TabsContent value="hemicycle">
                <div className="max-w-3xl">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                    {chamber === "house" ? (isAr ? "\u0645\u062c\u0644\u0633 \u0627\u0644\u0646\u0648\u0627\u0628" : "House of Representatives") : (isAr ? "\u0645\u062c\u0644\u0633 \u0627\u0644\u0634\u064a\u0648\u062e" : "Senate")} --{" "}
                    <span className="font-mono">{activeSeats}</span>{" "}
                    {isAr ? "\u0645\u0642\u0639\u062f" : "seats"}
                  </p>
                  <Skeleton name="parliament-hemicycle" loading={isLoading}>
                    <InteractiveHemicycle chamber={chamber} parties={parties} />
                  </Skeleton>
                </div>
              </TabsContent>

              <TabsContent value="distribution">
                <Skeleton name="parliament-distribution" loading={isLoading}>
                  <PartyDistribution chamber={chamber} parties={parties} onPartyFilter={handlePartyFilter} />
                </Skeleton>
              </TabsContent>

              <TabsContent value="directory">
                <MemberDirectory chamber={chamber} parties={parties} />
              </TabsContent>

              <TabsContent value="committees">
                <CommitteesTab />
              </TabsContent>
            </Tabs>
          )}
        </Tabs>

      </div>
    </div>
  );
}
