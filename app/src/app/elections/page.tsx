"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Check } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useLanguage } from "@/components/providers";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Candidate {
  nameAr: string;
  nameEn: string;
  votes: number;
  pct: number;
  winner?: boolean;
}

interface PresidentialElection {
  year: number;
  dateAr: string;
  dateEn: string;
  turnout: number;
  totalVotes: number;
  candidates: Candidate[];
}

interface GovernorateResult {
  id: string;
  nameAr: string;
  nameEn: string;
  turnout: number;
  winnerPct: number;
  row: number;
  col: number;
}

// ─── Demo Data ────────────────────────────────────────────────────────────────




// Grid layout (row, col) — approximate geographic position
const governorateResults: GovernorateResult[] = [
  { id: "matrouh", nameAr: "مطروح", nameEn: "Matrouh", turnout: 71, winnerPct: 91, row: 0, col: 0 },
  { id: "alex", nameAr: "الإسكندرية", nameEn: "Alexandria", turnout: 65, winnerPct: 90, row: 0, col: 1 },
  { id: "beheira", nameAr: "البحيرة", nameEn: "Beheira", turnout: 68, winnerPct: 88, row: 0, col: 2 },
  { id: "kafr", nameAr: "كفر الشيخ", nameEn: "Kafr el-Sheikh", turnout: 64, winnerPct: 87, row: 0, col: 3 },
  { id: "damietta", nameAr: "دمياط", nameEn: "Damietta", turnout: 62, winnerPct: 86, row: 0, col: 4 },
  { id: "portsaid", nameAr: "بورسعيد", nameEn: "Port Said", turnout: 59, winnerPct: 85, row: 0, col: 5 },

  { id: "newvalley", nameAr: "الوادي الجديد", nameEn: "New Valley", turnout: 74, winnerPct: 94, row: 1, col: 0 },
  { id: "giza", nameAr: "الجيزة", nameEn: "Giza", turnout: 68, winnerPct: 89, row: 1, col: 1 },
  { id: "monufia", nameAr: "المنوفية", nameEn: "Monufia", turnout: 67, winnerPct: 88, row: 1, col: 2 },
  { id: "gharbia", nameAr: "الغربية", nameEn: "Gharbia", turnout: 63, winnerPct: 87, row: 1, col: 3 },
  { id: "dakahlia", nameAr: "الدقهلية", nameEn: "Dakahlia", turnout: 61, winnerPct: 86, row: 1, col: 4 },
  { id: "ismailia", nameAr: "الإسماعيلية", nameEn: "Ismailia", turnout: 60, winnerPct: 84, row: 1, col: 5 },

  { id: "cairo", nameAr: "القاهرة", nameEn: "Cairo", turnout: 67, winnerPct: 88, row: 2, col: 1 },
  { id: "qalyubia", nameAr: "القليوبية", nameEn: "Qalyubia", turnout: 65, winnerPct: 87, row: 2, col: 2 },
  { id: "sharqia", nameAr: "الشرقية", nameEn: "Sharqia", turnout: 66, winnerPct: 89, row: 2, col: 3 },
  { id: "suez", nameAr: "السويس", nameEn: "Suez", turnout: 58, winnerPct: 83, row: 2, col: 5 },

  { id: "faiyum", nameAr: "الفيوم", nameEn: "Faiyum", turnout: 70, winnerPct: 91, row: 3, col: 0 },
  { id: "benisuef", nameAr: "بني سويف", nameEn: "Beni Suef", turnout: 72, winnerPct: 92, row: 3, col: 1 },
  { id: "minya", nameAr: "المنيا", nameEn: "Minya", turnout: 73, winnerPct: 93, row: 3, col: 2 },
  { id: "northsinai", nameAr: "شمال سيناء", nameEn: "North Sinai", turnout: 78, winnerPct: 95, row: 3, col: 5 },

  { id: "asyut", nameAr: "أسيوط", nameEn: "Asyut", turnout: 71, winnerPct: 92, row: 4, col: 1 },
  { id: "sohag", nameAr: "سوهاج", nameEn: "Sohag", turnout: 72, winnerPct: 93, row: 4, col: 2 },
  { id: "redsea", nameAr: "البحر الأحمر", nameEn: "Red Sea", turnout: 75, winnerPct: 93, row: 4, col: 4 },
  { id: "southsinai", nameAr: "جنوب سيناء", nameEn: "South Sinai", turnout: 77, winnerPct: 95, row: 4, col: 5 },

  { id: "qena", nameAr: "قنا", nameEn: "Qena", turnout: 74, winnerPct: 94, row: 5, col: 1 },
  { id: "luxor", nameAr: "الأقصر", nameEn: "Luxor", turnout: 73, winnerPct: 93, row: 5, col: 2 },
  { id: "aswan", nameAr: "أسوان", nameEn: "Aswan", turnout: 76, winnerPct: 94, row: 5, col: 3 },
];

const parliamentaryParties = [
  { nameAr: "مستقبل وطن", nameEn: "Nation's Future Party", color: "#1B4F72", seats: 315 },
  { nameAr: "مستقلون", nameEn: "Independents", color: "#7F8C8D", seats: 168 },
  { nameAr: "الشعب الجمهوري", nameEn: "Republican People's Party", color: "#C0392B", seats: 50 },
  { nameAr: "الوفد", nameEn: "Wafd Party", color: "#27AE60", seats: 26 },
  { nameAr: "الحزب المصري الديمقراطي الاجتماعي", nameEn: "Egyptian Social Democratic", color: "#8E44AD", seats: 15 },
  { nameAr: "حزب الإصلاح والتنمية", nameEn: "Reform & Development", color: "#E67E22", seats: 12 },
  { nameAr: "حزب المؤتمر", nameEn: "Conference Party", color: "#16A085", seats: 10 },
];

// ─── Color helpers ────────────────────────────────────────────────────────────

function turnoutColor(pct: number): string {
  // 55% → light green, 80% → dark green
  const t = Math.max(0, Math.min(1, (pct - 55) / 25));
  const lightG = { r: 134, g: 239, b: 172 };
  const darkG = { r: 21, g: 128, b: 61 };
  const r = Math.round(lightG.r + (darkG.r - lightG.r) * t);
  const g = Math.round(lightG.g + (darkG.g - lightG.g) * t);
  const b = Math.round(lightG.b + (darkG.b - lightG.b) * t);
  return `rgb(${r},${g},${b})`;
}

function winnerColor(pct: number): string {
  // 80% → light gold, 97% → dark gold
  const t = Math.max(0, Math.min(1, (pct - 80) / 17));
  const lightG = { r: 253, g: 230, b: 138 };
  const darkG = { r: 161, g: 98, b: 7 };
  const r = Math.round(lightG.r + (darkG.r - lightG.r) * t);
  const g = Math.round(lightG.g + (darkG.g - lightG.g) * t);
  const b = Math.round(lightG.b + (darkG.b - lightG.b) * t);
  return `rgb(${r},${g},${b})`;
}

// ─── Egypt Map ────────────────────────────────────────────────────────────────

function EgyptMap() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const [metric, setMetric] = useState<"turnout" | "winner">("turnout");
  const [hovered, setHovered] = useState<GovernorateResult | null>(null);
  const [selected, setSelected] = useState<GovernorateResult | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const COLS = 6;
  const ROWS = 6;
  const CELL_W = 90;
  const CELL_H = 60;
  const GAP = 4;
  const PAD = 8;

  const svgW = COLS * (CELL_W + GAP) + PAD * 2;
  const svgH = ROWS * (CELL_H + GAP) + PAD * 2;

  const getColor = (gov: GovernorateResult) => {
    if (metric === "turnout") return turnoutColor(gov.turnout);
    return winnerColor(gov.winnerPct);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Metric toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {isAr ? "تلوين بحسب" : "Color by"}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMetric("turnout")}
            className={cn(
              "text-xs px-3 py-1.5 rounded-lg border transition-all",
              metric === "turnout"
                ? "border-green-500 bg-green-500/10 text-green-400 font-semibold"
                : "border-border text-muted-foreground hover:border-border/80"
            )}
          >
            {isAr ? "نسبة المشاركة" : "Voter Turnout"}
          </button>
          <button
            onClick={() => setMetric("winner")}
            className={cn(
              "text-xs px-3 py-1.5 rounded-lg border transition-all",
              metric === "winner"
                ? "border-yellow-500 bg-yellow-500/10 text-yellow-400 font-semibold"
                : "border-border text-muted-foreground hover:border-border/80"
            )}
          >
            {isAr ? "نسبة الفائز" : "Winner Vote %"}
          </button>
        </div>
      </div>

      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full max-w-2xl"
          style={{ minWidth: "360px" }}
          onMouseLeave={() => setHovered(null)}
        >
          {governorateResults.map((gov) => {
            const x = PAD + gov.col * (CELL_W + GAP);
            const y = PAD + gov.row * (CELL_H + GAP);
            const color = getColor(gov);
            const isHovered = hovered?.id === gov.id;
            const isSelected = selected?.id === gov.id;

            return (
              <g key={gov.id}>
                <rect
                  x={x}
                  y={y}
                  width={CELL_W}
                  height={CELL_H}
                  rx={6}
                  fill={color}
                  opacity={isHovered || isSelected ? 1 : 0.85}
                  stroke={isSelected ? "white" : isHovered ? "rgba(255,255,255,0.6)" : "none"}
                  strokeWidth={isSelected ? 2 : 1}
                  className="cursor-pointer transition-opacity duration-100"
                  onMouseEnter={(e) => {
                    setHovered(gov);
                    const rect = (e.target as SVGRectElement).closest("svg")?.getBoundingClientRect();
                    if (rect) {
                      setTooltipPos({
                        x: ((x + CELL_W / 2) / svgW) * 100,
                        y: (y / svgH) * 100,
                      });
                    }
                  }}
                  onClick={() => setSelected(selected?.id === gov.id ? null : gov)}
                />
                <text
                  x={x + CELL_W / 2}
                  y={y + CELL_H / 2 - 5}
                  textAnchor="middle"
                  className="pointer-events-none fill-black/80 dark:fill-black/70"
                  style={{ fontSize: "7.5px", fontWeight: 600, fontFamily: "var(--font-noto-kufi-arabic, sans-serif)" }}
                >
                  {isAr ? gov.nameAr : gov.nameEn}
                </text>
                <text
                  x={x + CELL_W / 2}
                  y={y + CELL_H / 2 + 8}
                  textAnchor="middle"
                  className="pointer-events-none fill-black/70 dark:fill-black/60"
                  style={{ fontSize: "7px", fontFamily: "JetBrains Mono, monospace" }}
                >
                  {metric === "turnout" ? `${gov.turnout}%` : `${gov.winnerPct}%`}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hovered && (
          <div
            className="absolute z-20 bg-popover border border-border rounded-lg shadow-xl px-3 py-2 pointer-events-none text-xs"
            style={{
              left: `${tooltipPos.x}%`,
              top: `${tooltipPos.y}%`,
              transform: "translate(-50%, -115%)",
            }}
          >
            <p className="font-semibold text-foreground">{isAr ? hovered.nameAr : hovered.nameEn}</p>
            <div className="mt-1 space-y-0.5 text-muted-foreground">
              <p>{isAr ? "نسبة المشاركة:" : "Turnout:"} <span className="font-mono text-foreground">{hovered.turnout}%</span></p>
              <p>{isAr ? "نسبة الفائز:" : "Winner %:"} <span className="font-mono text-foreground">{hovered.winnerPct}%</span></p>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-24 h-3 rounded-full" style={{ background: metric === "turnout" ? "linear-gradient(to right, rgb(134,239,172), rgb(21,128,61))" : "linear-gradient(to right, rgb(253,230,138), rgb(161,98,7))" }} />
          <span className="text-xs text-muted-foreground">
            {metric === "turnout" ? (isAr ? "55% → 80%" : "55% → 80%") : (isAr ? "80% → 97%" : "80% → 97%")}
          </span>
        </div>
        {metric === "turnout" && (
          <span className="text-xs text-muted-foreground">{isAr ? "أفتح = أقل مشاركة" : "Lighter = lower turnout"}</span>
        )}
        {metric === "winner" && (
          <span className="text-xs text-muted-foreground">{isAr ? "أغمق = نسبة أعلى" : "Darker = higher %"}</span>
        )}
      </div>

      {/* Selected governorate detail */}
      {selected && (
        <div className="border border-border rounded-xl p-5 bg-card/60 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-base text-foreground">{isAr ? selected.nameAr : selected.nameEn}</h3>
            <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground transition-colors">
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{isAr ? "نسبة المشاركة" : "Voter Turnout"}</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-2xl font-bold text-foreground">{selected.turnout}%</span>
              </div>
              <div className="mt-1.5 w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-green-500" style={{ width: `${selected.turnout}%` }} />
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{isAr ? "نسبة أصوات الفائز" : "Winner Vote Share"}</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-2xl font-bold text-foreground">{selected.winnerPct}%</span>
              </div>
              <div className="mt-1.5 w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${selected.winnerPct}%`, background: "#C9A84C" }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Presidential Election Card ───────────────────────────────────────────────

function ElectionCard({ election }: { election: PresidentialElection }) {
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="font-mono text-2xl font-bold text-foreground">{election.year}</span>
            <p className="text-xs text-muted-foreground mt-0.5">{isAr ? election.dateAr : election.dateEn}</p>
          </div>
          <div className="text-end">
            <p className="text-xs text-muted-foreground">{isAr ? "نسبة المشاركة" : "Turnout"}</p>
            <p className="font-mono text-lg font-bold text-foreground">{election.turnout}%</p>
          </div>
        </div>

        {/* Bar chart */}
        <div className="flex flex-col gap-3">
          {election.candidates.map((c) => (
            <div key={c.nameEn} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  {c.winner && (
                    <span className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                      <Check size={10} strokeWidth={3} />
                    </span>
                  )}
                  <span className={cn("font-medium", c.winner ? "text-foreground" : "text-muted-foreground")}>
                    {isAr ? c.nameAr : c.nameEn}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-muted-foreground">{c.votes.toLocaleString()}</span>
                  <span className={cn("font-bold", c.winner ? "text-primary" : "text-muted-foreground")}>{c.pct}%</span>
                </div>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", c.winner ? "bg-primary" : "bg-muted-foreground/40")}
                  style={{ width: `${c.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-border flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{isAr ? "إجمالي الأصوات الصحيحة:" : "Valid votes:"}</span>
          <span className="font-mono text-xs text-foreground">{election.totalVotes.toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Parliamentary Summary ────────────────────────────────────────────────────

function ParliamentarySummary() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const [hovered, setHovered] = useState<string | null>(null);

  const total = parliamentaryParties.reduce((s, p) => s + p.seats, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          {isAr ? "انتخابات مجلس النواب 2020" : "House of Representatives Election 2020"}
        </h3>
        <p className="text-xs text-muted-foreground">
          {isAr
            ? "نتائج انتخابات مجلس النواب المصري في نوفمبر–ديسمبر 2020"
            : "Results of the Egyptian House of Representatives election, November–December 2020"}
        </p>
      </div>

      {/* Stacked bar */}
      <div className="w-full h-10 rounded-lg overflow-hidden flex">
        {parliamentaryParties.map((p) => {
          const pct = (p.seats / total) * 100;
          return (
            <div
              key={p.nameEn}
              className="transition-all duration-150 cursor-pointer"
              style={{
                width: `${pct}%`,
                background: p.color,
                opacity: hovered ? (hovered === p.nameEn ? 1 : 0.3) : 0.85,
              }}
              onMouseEnter={() => setHovered(p.nameEn)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
      </div>

      {/* Party list */}
      <div className="flex flex-col gap-1">
        {parliamentaryParties.map((p) => {
          const pct = ((p.seats / total) * 100).toFixed(1);
          return (
            <div
              key={p.nameEn}
              className={cn(
                "flex items-center gap-3 py-2 px-3 rounded-lg transition-all cursor-default",
                hovered === p.nameEn ? "bg-muted/40" : hovered ? "opacity-40" : ""
              )}
              onMouseEnter={() => setHovered(p.nameEn)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.color }} />
              <span className="text-sm flex-1 text-muted-foreground truncate">{isAr ? p.nameAr : p.nameEn}</span>
              <span className="font-mono text-sm text-foreground tabular-nums">{p.seats}</span>
              <span className="font-mono text-xs text-muted-foreground tabular-nums w-12 text-end">{pct}%</span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground font-mono">
        {isAr ? `الإجمالي: ${total} مقعد` : `Total: ${total} seats`}
      </p>
    </div>
  );
}

// ─── Referendums Tab ─────────────────────────────────────────────────────────

function ReferendumsTab() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const referendums = [
    {
      yearAr: "أبريل 2019",
      yearEn: "April 2019",
      titleAr: "التعديلات الدستورية 2019",
      titleEn: "Constitutional Amendments 2019",
      yesAr: "نعم",
      yesEn: "Yes",
      yesPct: 88.83,
      noAr: "لا",
      noEn: "No",
      noPct: 11.17,
      turnout: 44.3,
      descAr: "تضمنت التعديلات تمديد فترة الرئاسة وإعادة تشكيل السلطة القضائية وإنشاء مجلس الشيوخ.",
      descEn: "Amendments included extending presidential terms, restructuring the judiciary, and creating the Senate.",
    },
    {
      yearAr: "يناير 2014",
      yearEn: "January 2014",
      titleAr: "دستور 2014",
      titleEn: "Constitution of 2014",
      yesAr: "نعم",
      yesEn: "Yes",
      yesPct: 98.1,
      noAr: "لا",
      noEn: "No",
      noPct: 1.9,
      turnout: 38.6,
      descAr: "استفتاء على دستور جديد في أعقاب ثورة يونيو 2013.",
      descEn: "Referendum on a new constitution following the June 2013 revolution.",
    },
    {
      yearAr: "ديسمبر 2012",
      yearEn: "December 2012",
      titleAr: "دستور 2012",
      titleEn: "Constitution of 2012",
      yesAr: "نعم",
      yesEn: "Yes",
      yesPct: 63.8,
      noAr: "لا",
      noEn: "No",
      noPct: 36.2,
      turnout: 32.9,
      descAr: "استفتاء على دستور وُضع في عهد الرئيس محمد مرسي.",
      descEn: "Referendum on a constitution drafted under President Mohamed Morsi.",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {referendums.map((r) => (
        <Card key={r.titleEn} className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{isAr ? r.yearAr : r.yearEn}</p>
                <h3 className="font-bold text-base text-foreground">{isAr ? r.titleAr : r.titleEn}</h3>
              </div>
              <div className="text-end">
                <p className="text-xs text-muted-foreground">{isAr ? "المشاركة" : "Turnout"}</p>
                <p className="font-mono text-sm font-bold text-foreground">{r.turnout}%</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{isAr ? r.descAr : r.descEn}</p>
            <div className="flex flex-col gap-2">
              {[
                { label: isAr ? r.yesAr : r.yesEn, pct: r.yesPct, color: "#22C55E" },
                { label: isAr ? r.noAr : r.noEn, pct: r.noPct, color: "#EF4444" },
              ].map((opt) => (
                <div key={opt.label} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{opt.label}</span>
                    <span className="font-mono font-bold" style={{ color: opt.color }}>{opt.pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${opt.pct}%`, background: opt.color }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// ─── Type for Convex presidential elections ──────────────────────────────────

interface ConvexElectionResult {
  candidateNameEn: string;
  candidateNameAr: string;
  votes: number;
  percentage: number;
  isWinner: boolean;
}

interface ConvexElection {
  _id: string;
  year: number;
  dateHeld: string;
  turnoutPercentage?: number;
  totalVotesCast?: number;
  results: ConvexElectionResult[];
}

export default function ElectionsPage() {
  const { lang, dir } = useLanguage();
  const isAr = lang === "ar";

  // ─── Wire to Convex ───────────────────────────────────────────────────────
  const convexPresidential = useQuery(api.elections.listPresidentialElections);

  const isLoading = convexPresidential === undefined;

  // Use live Convex data — show empty state when Convex returns empty
  const activePresidentialElections: PresidentialElection[] | null = isLoading
    ? null
    : (convexPresidential as unknown as ConvexElection[]).map((e) => ({
        year: e.year,
        dateAr: e.dateHeld,
        dateEn: e.dateHeld,
        turnout: e.turnoutPercentage ?? 0,
        totalVotes: e.totalVotesCast ?? 0,
        candidates: (e.results ?? []).map((r) => ({
          nameAr: r.candidateNameAr,
          nameEn: r.candidateNameEn,
          votes: r.votes,
          pct: r.percentage,
          winner: r.isWinner,
        })),
      }));

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page flex flex-col gap-10">

        {/* Page header */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {isAr ? "الديمقراطية المصرية" : "Egyptian Democracy"}
          </p>
          <h1 className="text-3xl font-bold text-foreground mb-1">
            {isAr ? "الانتخابات المصرية" : "Egyptian Elections"}
          </h1>
          <p className="text-muted-foreground">
            {isAr
              ? "نتائج الانتخابات الرئاسية والبرلمانية والاستفتاءات"
              : "Presidential & parliamentary election results and referendums"}
          </p>
        </div>

        {/* Main tabs */}
        <Tabs defaultValue="presidential">
          <TabsList className="mb-6">
            <TabsTrigger value="presidential">{isAr ? "الرئاسية" : "Presidential"}</TabsTrigger>
            <TabsTrigger value="parliamentary">{isAr ? "البرلمانية" : "Parliamentary"}</TabsTrigger>
            <TabsTrigger value="referendums">{isAr ? "الاستفتاءات" : "Referendums"}</TabsTrigger>
          </TabsList>

          {/* Presidential tab */}
          <TabsContent value="presidential">
            <div className="flex flex-col gap-8">
              {/* Elections timeline */}
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  {isAr ? "الانتخابات الرئاسية" : "Presidential Elections"} — 2014 · 2018 · 2024
                </h2>
                <Skeleton name="elections-cards" loading={isLoading}>
                  {activePresidentialElections && activePresidentialElections.length === 0 ? (
                    <p className="text-center text-muted-foreground py-20">{isAr ? "لا توجد بيانات متاحة" : "No data available"}</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {activePresidentialElections?.map((election) => (
                        <ElectionCard key={election.year} election={election} />
                      ))}
                    </div>
                  )}
                </Skeleton>
              </div>

              {/* Egypt map */}
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {isAr ? "النتائج حسب المحافظة — 2024" : "Results by Governorate — 2024"}
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
                  {isAr
                    ? "انقر على محافظة لعرض تفاصيلها · مرر الفأرة للمعاينة"
                    : "Click a governorate for details · hover to preview"}
                </p>
                <EgyptMap />
              </div>
            </div>
          </TabsContent>

          {/* Parliamentary tab */}
          <TabsContent value="parliamentary">
            <div className="flex flex-col gap-8">
              <ParliamentarySummary />
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  {isAr ? "الخريطة الانتخابية البرلمانية — 2020" : "Parliamentary Electoral Map — 2020"}
                </h2>
                <EgyptMap />
              </div>
            </div>
          </TabsContent>

          {/* Referendums tab */}
          <TabsContent value="referendums">
            <div className="flex flex-col gap-4">
              <div className="mb-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {isAr ? "الاستفتاءات الدستورية" : "Constitutional Referendums"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isAr ? "جميع الاستفتاءات الدستورية منذ 2011" : "All constitutional referendums since 2011"}
                </p>
              </div>
              <ReferendumsTab />
            </div>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}
