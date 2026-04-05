"use client";

import { useState, useMemo, useRef, Fragment } from "react";
import { Search, X, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useLanguage } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
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

interface Member {
  id: string;
  nameAr: string;
  nameEn: string;
  partyId: string;
  governorateAr: string;
  governorateEn: string;
  constituencyAr: string;
  constituencyEn: string;
  electionMethod: "individual" | "list" | "appointed";
  chamber: "house" | "senate";
  appointmentDate: string;
}

interface Committee {
  id: string;
  nameAr: string;
  nameEn: string;
  type: "standing" | "special" | "joint";
  memberCount: number;
  memberIds: string[];
}

// ─── Fallback / Demo Data ─────────────────────────────────────────────────────
// Sub-components use these module-level arrays directly. Live Convex data is
// used at the page level for stats and passed as props where sub-components
// have been updated to accept them.

const parties: Party[] = [
  { id: "nfp", nameAr: "مستقبل وطن", nameEn: "Nation's Future Party", color: "#1B4F72", houseSeats: 315, senateSeats: 147, ideologyAr: "قومية، وسط يمين", ideologyEn: "Nationalism, Centre-right" },
  { id: "rpp", nameAr: "الشعب الجمهوري", nameEn: "Republican People's Party", color: "#C0392B", houseSeats: 50, senateSeats: 22, ideologyAr: "ليبرالية محافظة", ideologyEn: "Liberal conservatism" },
  { id: "wafd", nameAr: "الوفد", nameEn: "Wafd Party", color: "#27AE60", houseSeats: 26, senateSeats: 12, ideologyAr: "ليبرالية، ديمقراطية اجتماعية", ideologyEn: "Liberalism, Social democracy" },
  { id: "esdp", nameAr: "الحزب المصري الديمقراطي الاجتماعي", nameEn: "Egyptian Social Democratic Party", color: "#8E44AD", houseSeats: 15, senateSeats: 7, ideologyAr: "ديمقراطية اجتماعية", ideologyEn: "Social democracy" },
  { id: "reform", nameAr: "حزب الإصلاح والتنمية", nameEn: "Reform & Development Party", color: "#E67E22", houseSeats: 12, senateSeats: 5, ideologyAr: "ليبرالية، تنمية", ideologyEn: "Liberalism, Development" },
  { id: "conference", nameAr: "حزب المؤتمر", nameEn: "Conference Party", color: "#16A085", houseSeats: 10, senateSeats: 4, ideologyAr: "قومية عربية", ideologyEn: "Arab nationalism" },
  { id: "ind", nameAr: "مستقلون", nameEn: "Independents", color: "#7F8C8D", houseSeats: 168, senateSeats: 103, ideologyAr: "مستقل", ideologyEn: "Independent" },
];

const houseGovernorates = [
  { ar: "القاهرة", en: "Cairo", constituencies: [{ ar: "مدينة نصر", en: "Nasr City" }, { ar: "الزيتون", en: "Zaytoun" }, { ar: "شبرا", en: "Shubra" }, { ar: "المعادي", en: "Maadi" }] },
  { ar: "الإسكندرية", en: "Alexandria", constituencies: [{ ar: "المنتزه", en: "Montaza" }, { ar: "العجمي", en: "Agami" }, { ar: "كرموز", en: "Karmouz" }, { ar: "العامرية", en: "Ameriya" }] },
  { ar: "الجيزة", en: "Giza", constituencies: [{ ar: "الدقي", en: "Dokki" }, { ar: "أكتوبر", en: "October" }, { ar: "الهرم", en: "Haram" }, { ar: "بولاق الدكرور", en: "Bolak Dakrur" }] },
  { ar: "الشرقية", en: "Sharqia", constituencies: [{ ar: "الزقازيق", en: "Zagazig" }, { ar: "بلبيس", en: "Bilbeis" }, { ar: "فاقوس", en: "Faqus" }] },
  { ar: "الدقهلية", en: "Dakahlia", constituencies: [{ ar: "المنصورة", en: "Mansoura" }, { ar: "طلخا", en: "Talka" }, { ar: "ميت غمر", en: "Mit Ghamr" }] },
  { ar: "أسيوط", en: "Asyut", constituencies: [{ ar: "أسيوط الجديدة", en: "New Asyut" }, { ar: "أبنوب", en: "Abnoub" }, { ar: "الغنايم", en: "Ghanaim" }] },
  { ar: "سوهاج", en: "Sohag", constituencies: [{ ar: "سوهاج الجديدة", en: "New Sohag" }, { ar: "طما", en: "Tama" }, { ar: "المراغة", en: "Maragha" }] },
  { ar: "الفيوم", en: "Faiyum", constituencies: [{ ar: "الفيوم الجديدة", en: "New Fayoum" }, { ar: "إطسا", en: "Itsa" }, { ar: "سنورس", en: "Sinnuris" }] },
  { ar: "البحيرة", en: "Beheira", constituencies: [{ ar: "دمنهور", en: "Damanhur" }, { ar: "كفر الدوار", en: "Kafr el-Dawar" }, { ar: "أبو حمص", en: "Abu Homs" }] },
  { ar: "الغربية", en: "Gharbia", constituencies: [{ ar: "طنطا", en: "Tanta" }, { ar: "المحلة الكبرى", en: "Mahalla al-Kubra" }, { ar: "كفر الزيات", en: "Kafr el-Zayat" }] },
];

function generateMembers(): Member[] {
  const members: Member[] = [];
  let id = 1;

  const memberNames = [
    { ar: "أحمد محمد علي", en: "Ahmed Mohamed Ali" },
    { ar: "محمود عبد الرحمن", en: "Mahmoud Abdel Rahman" },
    { ar: "فاطمة السيد", en: "Fatima El-Sayed" },
    { ar: "كريم إبراهيم", en: "Karim Ibrahim" },
    { ar: "نادية حسن", en: "Nadia Hassan" },
    { ar: "عمر عبد الله", en: "Omar Abdullah" },
    { ar: "سارة خالد", en: "Sara Khaled" },
    { ar: "يوسف مصطفى", en: "Youssef Mostafa" },
    { ar: "منى الشافعي", en: "Mona el-Shafei" },
    { ar: "طارق نصر", en: "Tarek Nasr" },
    { ar: "هالة عطية", en: "Hala Atia" },
    { ar: "إيهاب سالم", en: "Ehab Salem" },
    { ar: "رانيا حافظ", en: "Rania Hafez" },
    { ar: "وائل بدر", en: "Wael Badr" },
    { ar: "شيرين العزبي", en: "Shirin el-Azaby" },
    { ar: "محمد الجنايني", en: "Mohamed el-Ganaini" },
    { ar: "دينا عوض", en: "Dina Awad" },
    { ar: "خالد منصور", en: "Khaled Mansour" },
    { ar: "أميرة فكري", en: "Amira Fikri" },
    { ar: "جمال السيد", en: "Gamal El-Sayed" },
  ];

  const dates = ["2021-01-10", "2021-01-12", "2021-01-15", "2021-01-20", "2021-02-01", "2021-02-05", "2021-02-10"];

  parties.forEach((party, partyIdx) => {
    const count = Math.min(party.houseSeats, 8);
    for (let i = 0; i < count; i++) {
      const govData = houseGovernorates[i % houseGovernorates.length];
      const constituency = govData.constituencies[i % govData.constituencies.length];
      const methods: Member["electionMethod"][] = ["individual", "list", "appointed"];
      const nameObj = memberNames[(id - 1) % memberNames.length];
      members.push({
        id: String(id++),
        nameAr: nameObj.ar,
        nameEn: nameObj.en,
        partyId: party.id,
        governorateAr: govData.ar,
        governorateEn: govData.en,
        constituencyAr: constituency.ar,
        constituencyEn: constituency.en,
        electionMethod: methods[(partyIdx + i) % 3],
        chamber: "house",
        appointmentDate: dates[i % dates.length],
      });
    }
  });

  // Add extra members to reach 50+
  const extraParties = ["nfp", "ind", "rpp", "wafd"];
  for (let i = 0; i < 14; i++) {
    const govData = houseGovernorates[i % houseGovernorates.length];
    const constituency = govData.constituencies[i % govData.constituencies.length];
    const nameObj = memberNames[(id - 1) % memberNames.length];
    members.push({
      id: String(id++),
      nameAr: nameObj.ar,
      nameEn: nameObj.en,
      partyId: extraParties[i % extraParties.length],
      governorateAr: govData.ar,
      governorateEn: govData.en,
      constituencyAr: constituency.ar,
      constituencyEn: constituency.en,
      electionMethod: i % 2 === 0 ? "individual" : "list",
      chamber: "house",
      appointmentDate: dates[i % dates.length],
    });
  }

  parties.slice(0, 4).forEach((party) => {
    const count = Math.min(party.senateSeats, 5);
    for (let i = 0; i < count; i++) {
      const govData = houseGovernorates[i % houseGovernorates.length];
      const constituency = govData.constituencies[i % govData.constituencies.length];
      const nameObj = memberNames[(id - 1) % memberNames.length];
      members.push({
        id: String(id++),
        nameAr: nameObj.ar,
        nameEn: nameObj.en,
        partyId: party.id,
        governorateAr: govData.ar,
        governorateEn: govData.en,
        constituencyAr: constituency.ar,
        constituencyEn: constituency.en,
        electionMethod: i === 0 ? "appointed" : "list",
        chamber: "senate",
        appointmentDate: dates[i % dates.length],
      });
    }
  });

  return members;
}

const allMembers = generateMembers();

const committees: Committee[] = [
  { id: "c1", nameAr: "لجنة الخطة والموازنة", nameEn: "Planning & Budget Committee", type: "standing", memberCount: 31, memberIds: allMembers.slice(0, 5).map(m => m.id) },
  { id: "c2", nameAr: "لجنة الشؤون الدستورية والتشريعية", nameEn: "Constitutional & Legislative Affairs", type: "standing", memberCount: 27, memberIds: allMembers.slice(5, 9).map(m => m.id) },
  { id: "c3", nameAr: "لجنة الشؤون الخارجية", nameEn: "Foreign Affairs Committee", type: "standing", memberCount: 23, memberIds: allMembers.slice(2, 6).map(m => m.id) },
  { id: "c4", nameAr: "لجنة الدفاع والأمن القومي", nameEn: "Defense & National Security", type: "standing", memberCount: 19, memberIds: allMembers.slice(8, 12).map(m => m.id) },
  { id: "c5", nameAr: "لجنة الشؤون الاقتصادية", nameEn: "Economic Affairs Committee", type: "standing", memberCount: 29, memberIds: allMembers.slice(1, 6).map(m => m.id) },
  { id: "c6", nameAr: "لجنة الصحة والسكان", nameEn: "Health & Population Committee", type: "standing", memberCount: 25, memberIds: allMembers.slice(3, 8).map(m => m.id) },
  { id: "c7", nameAr: "لجنة التعليم والبحث العلمي", nameEn: "Education & Scientific Research", type: "standing", memberCount: 28, memberIds: allMembers.slice(0, 4).map(m => m.id) },
  { id: "c8", nameAr: "لجنة حقوق الإنسان", nameEn: "Human Rights Committee", type: "standing", memberCount: 21, memberIds: allMembers.slice(6, 10).map(m => m.id) },
  { id: "c9", nameAr: "لجنة المرأة والطفل", nameEn: "Women & Child Committee", type: "special", memberCount: 17, memberIds: allMembers.slice(2, 6).map(m => m.id) },
  { id: "c10", nameAr: "لجنة الإسكان والمرافق", nameEn: "Housing & Utilities Committee", type: "standing", memberCount: 24, memberIds: allMembers.slice(4, 8).map(m => m.id) },
  { id: "c11", nameAr: "لجنة الاتصالات وتكنولوجيا المعلومات", nameEn: "Communications & IT Committee", type: "standing", memberCount: 20, memberIds: allMembers.slice(5, 9).map(m => m.id) },
  { id: "c12", nameAr: "لجنة مشتركة للشؤون المالية", nameEn: "Joint Financial Affairs Committee", type: "joint", memberCount: 15, memberIds: allMembers.slice(0, 3).map(m => m.id) },
];

// ─── Interactive Hemicycle ────────────────────────────────────────────────────

interface SeatDot {
  color: string;
  partyId: string;
  memberId: string | null;
}

function InteractiveHemicycle({ chamber }: { chamber: "house" | "senate" }) {
  const [hoveredSeat, setHoveredSeat] = useState<{ idx: number; x: number; y: number } | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [hoveredParty, setHoveredParty] = useState<string | null>(null);
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const svgRef = useRef<SVGSVGElement>(null);

  const chamberMembers = useMemo(
    () => allMembers.filter((m) => m.chamber === chamber),
    [chamber]
  );

  const memberByParty = useMemo(() => {
    const map: Record<string, Member[]> = {};
    chamberMembers.forEach((m) => {
      if (!map[m.partyId]) map[m.partyId] = [];
      map[m.partyId].push(m);
    });
    return map;
  }, [chamberMembers]);

  const seats = useMemo<SeatDot[]>(() => {
    const arr: SeatDot[] = [];
    parties.forEach((p) => {
      const count = chamber === "house" ? p.houseSeats : p.senateSeats;
      const partyMembers = memberByParty[p.id] ?? [];
      for (let i = 0; i < count; i++) {
        arr.push({
          color: p.color,
          partyId: p.id,
          memberId: partyMembers[i % partyMembers.length]?.id ?? null,
        });
      }
    });
    return arr;
  }, [chamber, memberByParty]);

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

  const hoveredMember = hoveredSeat !== null
    ? (seats[hoveredSeat.idx]?.memberId ? allMembers.find(m => m.id === seats[hoveredSeat.idx]?.memberId) : null)
    : null;
  const hoveredPartyData = hoveredSeat !== null ? parties.find(p => p.id === seats[hoveredSeat.idx]?.partyId) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="relative w-full" dir="ltr">
        <svg
          ref={svgRef}
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
                onClick={() => {
                  if (seat.memberId) {
                    const member = allMembers.find(m => m.id === seat.memberId);
                    setSelectedMember(member ?? null);
                  }
                }}
              />
            );
          })}
          <line x1={cx - 280} y1={cy} x2={cx + 280} y2={cy} stroke="currentColor" strokeWidth={1} className="text-border" />
          <rect x={cx - 20} y={cy - 8} width={40} height={8} rx={2} fill="currentColor" className="text-border" />
        </svg>

        {/* Hover tooltip */}
        {hoveredSeat !== null && (hoveredMember || hoveredPartyData) && (
          <div
            className="absolute z-20 bg-popover border border-border rounded-lg shadow-xl px-3 py-2 pointer-events-none text-xs max-w-[200px]"
            style={{
              left: `${((hoveredSeat.x - 100) / 400) * 100}%`,
              top: `${((hoveredSeat.y - 80) / 240) * 100}%`,
              transform: "translate(-50%, calc(-100% - 12px))",
            }}
          >
            {hoveredMember ? (
              <>
                <p className="font-semibold text-foreground">{isAr ? hoveredMember.nameAr : hoveredMember.nameEn}</p>
                <p className="text-muted-foreground mt-0.5">{hoveredPartyData ? (isAr ? hoveredPartyData.nameAr : hoveredPartyData.nameEn) : ""}</p>
                <p className="text-muted-foreground">{isAr ? hoveredMember.governorateAr : hoveredMember.governorateEn}</p>
                <p className="text-primary/70 text-[0.65rem] mt-1">{isAr ? "انقر للتفاصيل" : "Click for details"}</p>
              </>
            ) : hoveredPartyData ? (
              <>
                <p className="font-semibold text-foreground">{isAr ? hoveredPartyData.nameAr : hoveredPartyData.nameEn}</p>
                <p className="text-muted-foreground">{chamber === "house" ? hoveredPartyData.houseSeats : hoveredPartyData.senateSeats} {isAr ? "مقعد" : "seats"}</p>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Selected member detail */}
      {selectedMember && (() => {
        const party = parties.find(p => p.id === selectedMember.partyId);
        return (
          <div className="border border-border rounded-xl p-5 bg-card/60 backdrop-blur-sm relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 end-3 h-7 w-7 text-muted-foreground"
              onClick={() => setSelectedMember(null)}
            >
              <X size={14} />
            </Button>
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg flex-shrink-0">
                {(isAr ? selectedMember.nameAr : selectedMember.nameEn).charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base text-foreground">{isAr ? selectedMember.nameAr : selectedMember.nameEn}</h3>
                {party && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: party.color }} />
                    <span className="text-sm text-muted-foreground">{isAr ? party.nameAr : party.nameEn}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-3 text-xs text-muted-foreground">
                  <span><span className="font-medium text-foreground">{isAr ? "المحافظة:" : "Governorate:"}</span> {isAr ? selectedMember.governorateAr : selectedMember.governorateEn}</span>
                  <span><span className="font-medium text-foreground">{isAr ? "الدائرة:" : "Constituency:"}</span> {isAr ? selectedMember.constituencyAr : selectedMember.constituencyEn}</span>
                  <span><span className="font-medium text-foreground">{isAr ? "طريقة الانتخاب:" : "Method:"}</span>{" "}
                    {selectedMember.electionMethod === "individual" ? (isAr ? "فردي" : "Individual") :
                     selectedMember.electionMethod === "list" ? (isAr ? "قائمة" : "List") :
                     (isAr ? "معيّن" : "Appointed")}
                  </span>
                  <span><span className="font-medium text-foreground">{isAr ? "تاريخ الأداء:" : "Since:"}</span> {selectedMember.appointmentDate}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Party legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {parties.map((p) => {
          const seatCount = chamber === "house" ? p.houseSeats : p.senateSeats;
          const pct = ((seatCount / total) * 100).toFixed(0);
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

function PartyDistribution({ chamber, onPartyFilter }: { chamber: "house" | "senate"; onPartyFilter: (id: string) => void }) {
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const [hoveredParty, setHoveredParty] = useState<string | null>(null);

  const total = parties.reduce(
    (s, p) => s + (chamber === "house" ? p.houseSeats : p.senateSeats),
    0
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Stacked bar */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {isAr ? "التوزيع الحزبي" : "Party Distribution"} — <span className="font-mono">{total}</span> {isAr ? "مقعد" : "seats"}
        </p>
        <div className="w-full h-10 rounded-lg overflow-hidden flex">
          {parties.map((p) => {
            const seatCount = chamber === "house" ? p.houseSeats : p.senateSeats;
            const pct = (seatCount / total) * 100;
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
          const pct = ((seatCount / total) * 100).toFixed(1);
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
                  <span className="text-xs text-muted-foreground ms-1">{isAr ? "مقعد" : "seats"}</span>
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
  partyFilterProp,
}: {
  chamber: "house" | "senate";
  partyFilterProp?: string;
}) {
  const { lang, t } = useLanguage();
  const isAr = lang === "ar";
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [partyFilter, setPartyFilter] = useState(partyFilterProp ?? "all");
  const [govFilter, setGovFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const partyById = useMemo(
    () => Object.fromEntries(parties.map((p) => [p.id, p])),
    []
  );

  const chamberMembers = useMemo(
    () => allMembers.filter((m) => m.chamber === chamber),
    [chamber]
  );

  const uniqueGovernorates = useMemo(() => {
    const set = new Set(chamberMembers.map((m) => isAr ? m.governorateAr : m.governorateEn));
    return Array.from(set).sort();
  }, [chamberMembers, isAr]);

  const filteredData = useMemo(() => {
    return chamberMembers.filter((m) => {
      if (partyFilter !== "all" && m.partyId !== partyFilter) return false;
      const gName = isAr ? m.governorateAr : m.governorateEn;
      if (govFilter !== "all" && gName !== govFilter) return false;
      if (methodFilter !== "all" && m.electionMethod !== methodFilter) return false;
      if (globalFilter) {
        const q = globalFilter.toLowerCase();
        const name = (isAr ? m.nameAr : m.nameEn).toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    });
  }, [chamberMembers, partyFilter, govFilter, methodFilter, globalFilter, isAr]);

  const columns = useMemo<ColumnDef<Member, unknown>[]>(
    () => [
      {
        id: "name",
        accessorFn: (row) => isAr ? row.nameAr : row.nameEn,
        header: isAr ? "الاسم" : "Name",
        cell: (info) => (
          <span className="font-medium text-foreground text-sm">
            {String(info.getValue())}
          </span>
        ),
      },
      {
        id: "party",
        accessorFn: (row) => row.partyId,
        header: t.party,
        cell: (info) => {
          const party = partyById[String(info.getValue())];
          return party ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: party.color }} />
              <span className="text-sm text-muted-foreground truncate max-w-[140px]">
                {isAr ? party.nameAr : party.nameEn}
              </span>
            </div>
          ) : null;
        },
      },
      {
        id: "governorate",
        accessorFn: (row) => isAr ? row.governorateAr : row.governorateEn,
        header: t.governorate,
        cell: (info) => (
          <span className="text-sm text-muted-foreground">{String(info.getValue())}</span>
        ),
      },
      {
        id: "constituency",
        accessorFn: (row) => isAr ? row.constituencyAr : row.constituencyEn,
        header: isAr ? "الدائرة" : "Constituency",
        cell: (info) => (
          <span className="text-sm text-muted-foreground">{String(info.getValue())}</span>
        ),
      },
      {
        id: "electionMethod",
        accessorFn: (row) => row.electionMethod,
        header: t.electionMethod,
        cell: (info) => {
          const method = String(info.getValue());
          const labels: Record<string, string> = {
            individual: t.individual,
            list: t.list,
            appointed: t.appointed,
          };
          return (
            <Badge
              variant={method === "appointed" ? "secondary" : "outline"}
              className="text-xs"
            >
              {labels[method]}
            </Badge>
          );
        },
      },
    ],
    [isAr, t, partyById]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Search + filters */}
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

        <Select value={partyFilter} onValueChange={setPartyFilter}>
          <SelectTrigger className="w-44 text-sm">
            <SelectValue placeholder={isAr ? "كل الأحزاب" : "All parties"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? "كل الأحزاب" : "All parties"}</SelectItem>
            {parties.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-sm">
                {isAr ? p.nameAr : p.nameEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={govFilter} onValueChange={setGovFilter}>
          <SelectTrigger className="w-44 text-sm">
            <SelectValue placeholder={isAr ? "كل المحافظات" : "All governorates"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? "كل المحافظات" : "All governorates"}</SelectItem>
            {uniqueGovernorates.map((g) => (
              <SelectItem key={g} value={g} className="text-sm">{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-44 text-sm">
            <SelectValue placeholder={isAr ? "طريقة الانتخاب" : "Election Method"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? "الكل" : "All"}</SelectItem>
            <SelectItem value="individual">{t.individual}</SelectItem>
            <SelectItem value="list">{t.list}</SelectItem>
            <SelectItem value="appointed">{t.appointed}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-muted/50">
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === "asc" ? " ↑" : header.column.getIsSorted() === "desc" ? " ↓" : ""}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <Fragment key={row.id}>
                <TableRow
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setExpandedRow(expandedRow === row.original.id ? null : row.original.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
                {expandedRow === row.original.id && (() => {
                  const member = row.original;
                  const party = parties.find(p => p.id === member.partyId);
                  return (
                    <TableRow key={`${row.id}-expanded`} className="bg-muted/20">
                      <TableCell colSpan={columns.length} className="py-4 px-5">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0">
                            {(isAr ? member.nameAr : member.nameEn).charAt(0)}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 flex-1 text-xs text-muted-foreground">
                            <div><span className="font-medium text-foreground block">{isAr ? "الحزب" : "Party"}</span>{party ? (isAr ? party.nameAr : party.nameEn) : "—"}</div>
                            <div><span className="font-medium text-foreground block">{isAr ? "المحافظة" : "Governorate"}</span>{isAr ? member.governorateAr : member.governorateEn}</div>
                            <div><span className="font-medium text-foreground block">{isAr ? "الدائرة" : "Constituency"}</span>{isAr ? member.constituencyAr : member.constituencyEn}</div>
                            <div><span className="font-medium text-foreground block">{isAr ? "طريقة الانتخاب" : "Election Method"}</span>{member.electionMethod === "individual" ? (isAr ? "فردي" : "Individual") : member.electionMethod === "list" ? (isAr ? "قائمة" : "List") : (isAr ? "معيّن" : "Appointed")}</div>
                            <div><span className="font-medium text-foreground block">{isAr ? "تاريخ الأداء" : "Since"}</span>{member.appointmentDate}</div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })()}
              </Fragment>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-sm text-muted-foreground">
                  {t.noResults}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-2 md:hidden">
        {filteredData.length === 0 && (
          <p className="text-center py-8 text-sm text-muted-foreground">{t.noResults}</p>
        )}
        {filteredData.map((member) => {
          const party = parties.find(p => p.id === member.partyId);
          const isExpanded = expandedRow === member.id;
          return (
            <Card key={member.id} className="border-border/60 bg-card/60">
              <CardContent className="p-4">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedRow(isExpanded ? null : member.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {(isAr ? member.nameAr : member.nameEn).charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">{isAr ? member.nameAr : member.nameEn}</p>
                      {party && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: party.color }} />
                          <span className="text-xs text-muted-foreground">{isAr ? party.nameAr : party.nameEn}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                </div>
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div><span className="font-medium text-foreground block">{isAr ? "المحافظة" : "Governorate"}</span>{isAr ? member.governorateAr : member.governorateEn}</div>
                    <div><span className="font-medium text-foreground block">{isAr ? "الدائرة" : "Constituency"}</span>{isAr ? member.constituencyAr : member.constituencyEn}</div>
                    <div><span className="font-medium text-foreground block">{isAr ? "الانتخاب" : "Method"}</span>{member.electionMethod === "individual" ? (isAr ? "فردي" : "Individual") : member.electionMethod === "list" ? (isAr ? "قائمة" : "List") : (isAr ? "معيّن" : "Appointed")}</div>
                    <div><span className="font-medium text-foreground block">{isAr ? "منذ" : "Since"}</span>{member.appointmentDate}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {isAr
            ? `عرض ${filteredData.length} عضو`
            : `Showing ${filteredData.length} members`}
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const typeLabels: Record<Committee["type"], { ar: string; en: string; variant: "default" | "secondary" | "outline" }> = {
    standing: { ar: "دائمة", en: "Standing", variant: "default" },
    special: { ar: "خاصة", en: "Special", variant: "secondary" },
    joint: { ar: "مشتركة", en: "Joint", variant: "outline" },
  };

  return (
    <div className="flex flex-col gap-2">
      {committees.map((committee) => {
        const isExpanded = expandedId === committee.id;
        const typeLabel = typeLabels[committee.type];
        const committeeMembers = allMembers.filter(m => committee.memberIds.includes(m.id));

        return (
          <div key={committee.id} className="border border-border rounded-xl overflow-hidden bg-card/60">
            <button
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors text-start"
              onClick={() => setExpandedId(isExpanded ? null : committee.id)}
            >
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-semibold text-sm text-foreground">{isAr ? committee.nameAr : committee.nameEn}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={typeLabel.variant} className="text-xs">
                      {isAr ? typeLabel.ar : typeLabel.en}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">{committee.memberCount} {isAr ? "عضو" : "members"}</span>
                  </div>
                </div>
              </div>
              {isExpanded ? <ChevronUp size={16} className="text-muted-foreground flex-shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground flex-shrink-0" />}
            </button>

            {isExpanded && (
              <div className="px-5 pb-4 border-t border-border bg-muted/10">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-3 mb-2">
                  {isAr ? "أعضاء اللجنة (عينة)" : "Committee Members (sample)"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {committeeMembers.map((m) => {
                    const party = parties.find(p => p.id === m.partyId);
                    return (
                      <div key={m.id} className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1.5">
                        <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[0.6rem] font-bold flex-shrink-0">
                          {(isAr ? m.nameAr : m.nameEn).charAt(0)}
                        </div>
                        <span className="text-xs text-foreground">{isAr ? m.nameAr : m.nameEn}</span>
                        {party && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: party.color }} />}
                      </div>
                    );
                  })}
                  {committee.memberCount > committeeMembers.length && (
                    <span className="text-xs text-muted-foreground px-2.5 py-1.5">
                      +{committee.memberCount - committeeMembers.length} {isAr ? "آخرون" : "more"}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ParliamentPage() {
  const { t, lang, dir } = useLanguage();
  const isAr = lang === "ar";
  const [chamber, setChamber] = useState<"house" | "senate">("house");
  const [directoryPartyFilter, setDirectoryPartyFilter] = useState("all");
  const [subTab, setSubTab] = useState("hemicycle");

  // Live Convex data — used for stats and party list
  const liveParties = useQuery(api.parliament.listParties);
  const liveHouseStats = useQuery(api.parliament.getParliamentStats, { chamber: "house" });
  const liveSenateStats = useQuery(api.parliament.getParliamentStats, { chamber: "senate" });
  const liveHouseCommittees = useQuery(api.parliament.listCommittees, { chamber: "house" });

  // Stats — use live data when available, fallback to hardcoded
  const houseSeats = liveHouseStats?.totalMembers ?? parties.reduce((s, p) => s + p.houseSeats, 0);
  const senateSeats = liveSenateStats?.totalMembers ?? parties.reduce((s, p) => s + p.senateSeats, 0);
  const houseParties = liveParties?.length ?? parties.filter((p) => p.houseSeats > 0).length;
  const houseCommitteeCount = liveHouseCommittees?.length ?? committees.length;
  const houseWomen = Math.round(houseSeats * 0.152);

  const activeSeats = chamber === "house" ? houseSeats : senateSeats;

  const handlePartyFilter = (partyId: string) => {
    setDirectoryPartyFilter(partyId);
    setSubTab("directory");
  };

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page flex flex-col gap-10">

        {/* Page header */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {isAr ? "السلطة التشريعية" : "Legislative Branch"}
          </p>
          <h1 className="text-3xl font-bold text-foreground mb-1">
            {isAr ? "مجلس النواب المصري" : "Egyptian Parliament"}
          </h1>
          <p className="text-muted-foreground">{t.parliamentDesc}</p>
        </div>

        {/* Chamber tabs */}
        <Tabs value={chamber} onValueChange={(v) => setChamber(v as "house" | "senate")}>
          <TabsList className="mb-2">
            <TabsTrigger value="house">
              {isAr ? "مجلس النواب" : "House"}{" "}
              <span className="ms-1.5 font-mono text-xs opacity-60">{houseSeats}</span>
            </TabsTrigger>
            <TabsTrigger value="senate">
              {isAr ? "مجلس الشيوخ" : "Senate"}{" "}
              <span className="ms-1.5 font-mono text-xs opacity-60">{senateSeats}</span>
            </TabsTrigger>
          </TabsList>

          {/* Stats bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-t border-b border-border mb-6">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t.totalSeats}</p>
              <p className="font-mono text-3xl font-bold text-foreground tabular-nums">{activeSeats}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t.numberOfParties}</p>
              <p className="font-mono text-3xl font-bold text-foreground tabular-nums">{houseParties}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t.committees}</p>
              <p className="font-mono text-3xl font-bold text-foreground tabular-nums">{houseCommitteeCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{isAr ? "نسبة المرأة" : "Women %"}</p>
              <p className="font-mono text-3xl font-bold text-foreground tabular-nums">
                {((houseWomen / houseSeats) * 100).toFixed(0)}%
              </p>
            </div>
          </div>

          {/* Sub-tabs */}
          <Tabs value={subTab} onValueChange={setSubTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="hemicycle">{isAr ? "خريطة المقاعد" : "Seat Map"}</TabsTrigger>
              <TabsTrigger value="distribution">{isAr ? "التوزيع الحزبي" : "Party Distribution"}</TabsTrigger>
              <TabsTrigger value="directory">{isAr ? "دليل الأعضاء" : "Member Directory"}</TabsTrigger>
              <TabsTrigger value="committees">{isAr ? "اللجان" : "Committees"}</TabsTrigger>
            </TabsList>

            <TabsContent value="hemicycle">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  {chamber === "house" ? (isAr ? "مجلس النواب" : "House of Representatives") : (isAr ? "مجلس الشيوخ" : "Senate")} —{" "}
                  <span className="font-mono">{activeSeats}</span>{" "}
                  {isAr ? "مقعد" : "seats"}
                </p>
                <InteractiveHemicycle chamber={chamber} />
              </div>
            </TabsContent>

            <TabsContent value="distribution">
              <PartyDistribution chamber={chamber} onPartyFilter={handlePartyFilter} />
            </TabsContent>

            <TabsContent value="directory">
              <MemberDirectory chamber={chamber} partyFilterProp={directoryPartyFilter} />
            </TabsContent>

            <TabsContent value="committees">
              <CommitteesTab />
            </TabsContent>
          </Tabs>
        </Tabs>

      </div>
    </div>
  );
}
