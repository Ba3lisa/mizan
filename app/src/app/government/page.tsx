"use client";

import { useState } from "react";
import { Search, Users, Building2, MapPin, ExternalLink } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useLanguage } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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
  governorAr: string;
  governorEn: string;
  capitalAr: string;
  capitalEn: string;
  population: number;
  regionAr: string;
  regionEn: string;
}

// ─── Fallback Data ───────────────────────────────────────────────────────────

const FALLBACK_PRESIDENT: Official = { id: "p", nameAr: "عبد الفتاح السيسي", nameEn: "Abdel Fattah el-Sisi", titleAr: "رئيس الجمهورية", titleEn: "President of Egypt", appointedAr: "يونيو ٢٠١٤", appointedEn: "Jun 2014", level: "president" };
const FALLBACK_PM: Official = { id: "pm", nameAr: "مصطفى مدبولي", nameEn: "Mostafa Madbouly", titleAr: "رئيس مجلس الوزراء", titleEn: "Prime Minister", appointedAr: "يونيو ٢٠١٨", appointedEn: "Jun 2018", level: "pm" };

const FALLBACK_MINISTRIES: Ministry[] = [
  { id: "1", nameAr: "وزارة الخارجية", nameEn: "Foreign Affairs", ministerAr: "بدر عبد العاطي", ministerEn: "Badr Abdelatty", employees: 8200, sector: "sovereignty" },
  { id: "2", nameAr: "وزارة الداخلية", nameEn: "Interior", ministerAr: "اللواء كمال الوزير", ministerEn: "Gen. Kamal el-Wazir", employees: 520000, sector: "sovereignty" },
  { id: "3", nameAr: "وزارة الدفاع", nameEn: "Defence", ministerAr: "الفريق عباس كامل", ministerEn: "Gen. Abbas Kamel", employees: 450000, sector: "sovereignty" },
  { id: "4", nameAr: "وزارة المالية", nameEn: "Finance", ministerAr: "أحمد كوجك", ministerEn: "Ahmed Kouchouk", employees: 78000, sector: "economic" },
  { id: "5", nameAr: "وزارة الاستثمار والتعاون الدولي", nameEn: "Investment & Intl. Cooperation", ministerAr: "هالة السعيد", ministerEn: "Hala el-Said", employees: 4500, sector: "economic" },
  { id: "6", nameAr: "وزارة التخطيط والتنمية الاقتصادية", nameEn: "Planning & Development", ministerAr: "رانيا المشاط", ministerEn: "Rania Al-Mashat", employees: 6000, sector: "economic" },
  { id: "7", nameAr: "وزارة التجارة والصناعة", nameEn: "Trade & Industry", ministerAr: "عمر سمرة", ministerEn: "Omar Samra", employees: 35000, sector: "economic" },
  { id: "8", nameAr: "وزارة التربية والتعليم", nameEn: "Education", ministerAr: "محمد عبد اللطيف", ministerEn: "Mohamed Abdelatif", employees: 1100000, sector: "social" },
  { id: "9", nameAr: "وزارة الصحة والسكان", nameEn: "Health & Population", ministerAr: "خالد عبد الغفار", ministerEn: "Khaled Abdel Ghaffar", employees: 420000, sector: "social" },
  { id: "10", nameAr: "وزارة التضامن الاجتماعي", nameEn: "Social Solidarity", ministerAr: "مايا مرسي", ministerEn: "Maya Morsy", employees: 32000, sector: "social" },
  { id: "11", nameAr: "وزارة الإسكان والمرافق", nameEn: "Housing & Utilities", ministerAr: "عاصم الجزار", ministerEn: "Assem el-Gazzar", employees: 45000, sector: "infrastructure" },
  { id: "12", nameAr: "وزارة الكهرباء والطاقة المتجددة", nameEn: "Electricity & Energy", ministerAr: "محمود عصمت", ministerEn: "Mahmoud Esmat", employees: 95000, sector: "infrastructure" },
  { id: "13", nameAr: "وزارة البترول والثروة المعدنية", nameEn: "Petroleum & Mining", ministerAr: "كريم بدوي", ministerEn: "Karim Badawi", employees: 115000, sector: "infrastructure" },
  { id: "14", nameAr: "وزارة الثقافة", nameEn: "Culture", ministerAr: "أحمد فؤاد هنو", ministerEn: "Ahmed Fouad Heno", employees: 62000, sector: "social" },
  { id: "15", nameAr: "وزارة الاتصالات", nameEn: "Communications & IT", ministerAr: "عمرو طلعت", ministerEn: "Amr Talaat", employees: 18000, sector: "economic" },
  { id: "16", nameAr: "وزارة الزراعة", nameEn: "Agriculture", ministerAr: "علاء فاروق", ministerEn: "Alaa Farouk", employees: 72000, sector: "economic" },
  { id: "17", nameAr: "وزارة النقل", nameEn: "Transport", ministerAr: "كمال الوزير", ministerEn: "Kamal el-Wazir", employees: 85000, sector: "infrastructure" },
  { id: "18", nameAr: "وزارة السياحة والآثار", nameEn: "Tourism & Antiquities", ministerAr: "أحمد عيسى", ministerEn: "Ahmed Issa", employees: 28000, sector: "social" },
];

const FALLBACK_GOVERNORATES: Governorate[] = [
  { id: "1", nameAr: "القاهرة", nameEn: "Cairo", governorAr: "إبراهيم الشهابي", governorEn: "Ibrahim el-Shehabi", capitalAr: "القاهرة", capitalEn: "Cairo", population: 10142000, regionAr: "مصر السفلى", regionEn: "Lower Egypt" },
  { id: "2", nameAr: "الإسكندرية", nameEn: "Alexandria", governorAr: "محمد الشريف", governorEn: "Mohamed el-Sherif", capitalAr: "الإسكندرية", capitalEn: "Alexandria", population: 5200000, regionAr: "الساحل الشمالي", regionEn: "Northern Coast" },
  { id: "3", nameAr: "الجيزة", nameEn: "Giza", governorAr: "أحمد راشد", governorEn: "Ahmed Rashed", capitalAr: "الجيزة", capitalEn: "Giza", population: 9250000, regionAr: "مصر السفلى", regionEn: "Lower Egypt" },
  { id: "4", nameAr: "القليوبية", nameEn: "Qalyubia", governorAr: "محمد سامي", governorEn: "Mohamed Samy", capitalAr: "بنها", capitalEn: "Banha", population: 5800000, regionAr: "الدلتا", regionEn: "Delta" },
  { id: "5", nameAr: "الشرقية", nameEn: "Sharqia", governorAr: "هشام آمنة", governorEn: "Hesham Amna", capitalAr: "الزقازيق", capitalEn: "Zagazig", population: 7500000, regionAr: "الدلتا", regionEn: "Delta" },
  { id: "6", nameAr: "الدقهلية", nameEn: "Dakahlia", governorAr: "أيمن المنذر", governorEn: "Ayman el-Mandouh", capitalAr: "المنصورة", capitalEn: "Mansoura", population: 6500000, regionAr: "الدلتا", regionEn: "Delta" },
  { id: "7", nameAr: "البحيرة", nameEn: "Beheira", governorAr: "هشام أمنة", governorEn: "Hesham Amna", capitalAr: "دمنهور", capitalEn: "Damanhour", population: 5900000, regionAr: "الدلتا", regionEn: "Delta" },
  { id: "8", nameAr: "كفر الشيخ", nameEn: "Kafr el-Sheikh", governorAr: "جمال نور الدين", governorEn: "Gamal Nour el-Din", capitalAr: "كفر الشيخ", capitalEn: "Kafr el-Sheikh", population: 3500000, regionAr: "الدلتا", regionEn: "Delta" },
  { id: "9", nameAr: "الغربية", nameEn: "Gharbia", governorAr: "سامي سعد", governorEn: "Samy Saad", capitalAr: "طنطا", capitalEn: "Tanta", population: 5200000, regionAr: "الدلتا", regionEn: "Delta" },
  { id: "10", nameAr: "المنوفية", nameEn: "Monufia", governorAr: "أشرف بدر", governorEn: "Ashraf Badr", capitalAr: "شبين الكوم", capitalEn: "Shibin el-Kom", population: 3800000, regionAr: "الدلتا", regionEn: "Delta" },
  { id: "11", nameAr: "الفيوم", nameEn: "Faiyum", governorAr: "أيمن فريد", governorEn: "Ayman Farid", capitalAr: "الفيوم", capitalEn: "Faiyum", population: 3700000, regionAr: "مصر الوسطى", regionEn: "Middle Egypt" },
  { id: "12", nameAr: "بني سويف", nameEn: "Beni Suef", governorAr: "محمد هاني", governorEn: "Mohamed Hany", capitalAr: "بني سويف", capitalEn: "Beni Suef", population: 3200000, regionAr: "مصر الوسطى", regionEn: "Middle Egypt" },
  { id: "13", nameAr: "المنيا", nameEn: "Minya", governorAr: "أسامة الغزالي", governorEn: "Osama el-Ghazaly", capitalAr: "المنيا", capitalEn: "Minya", population: 5500000, regionAr: "مصر الوسطى", regionEn: "Middle Egypt" },
  { id: "14", nameAr: "أسيوط", nameEn: "Asyut", governorAr: "عصام سعد", governorEn: "Essam Saad", capitalAr: "أسيوط", capitalEn: "Asyut", population: 4200000, regionAr: "مصر العليا", regionEn: "Upper Egypt" },
  { id: "15", nameAr: "سوهاج", nameEn: "Sohag", governorAr: "سامح الدهشان", governorEn: "Sameh el-Dahshan", capitalAr: "سوهاج", capitalEn: "Sohag", population: 4800000, regionAr: "مصر العليا", regionEn: "Upper Egypt" },
  { id: "16", nameAr: "قنا", nameEn: "Qena", governorAr: "عز الدين منصور", governorEn: "Ezzeddine Mansour", capitalAr: "قنا", capitalEn: "Qena", population: 3400000, regionAr: "مصر العليا", regionEn: "Upper Egypt" },
  { id: "17", nameAr: "الأقصر", nameEn: "Luxor", governorAr: "مصطفى الصيرفي", governorEn: "Mostafa el-Sairafi", capitalAr: "الأقصر", capitalEn: "Luxor", population: 1200000, regionAr: "مصر العليا", regionEn: "Upper Egypt" },
  { id: "18", nameAr: "أسوان", nameEn: "Aswan", governorAr: "إسماعيل كمال", governorEn: "Ismail Kamal", capitalAr: "أسوان", capitalEn: "Aswan", population: 1500000, regionAr: "مصر العليا", regionEn: "Upper Egypt" },
  { id: "19", nameAr: "البحر الأحمر", nameEn: "Red Sea", governorAr: "عمرو حنفي", governorEn: "Amr Hanafi", capitalAr: "الغردقة", capitalEn: "Hurghada", population: 450000, regionAr: "البحر الأحمر", regionEn: "Red Sea" },
  { id: "20", nameAr: "الوادي الجديد", nameEn: "New Valley", governorAr: "عصام البديوي", governorEn: "Essam el-Bedeiwy", capitalAr: "الخارجة", capitalEn: "Kharga", population: 250000, regionAr: "الصحراء الغربية", regionEn: "Western Desert" },
  { id: "21", nameAr: "مطروح", nameEn: "Matrouh", governorAr: "خالد شريف", governorEn: "Khaled Sherif", capitalAr: "مرسى مطروح", capitalEn: "Mersa Matruh", population: 420000, regionAr: "الساحل الشمالي", regionEn: "Northern Coast" },
  { id: "22", nameAr: "شمال سيناء", nameEn: "North Sinai", governorAr: "محمد عبد الفضيل", governorEn: "Mohamed Abdel Fadil", capitalAr: "العريش", capitalEn: "El-Arish", population: 500000, regionAr: "سيناء", regionEn: "Sinai" },
  { id: "23", nameAr: "جنوب سيناء", nameEn: "South Sinai", governorAr: "اللواء خالد فودة", governorEn: "Gen. Khaled Fouda", capitalAr: "الطور", capitalEn: "El-Tur", population: 180000, regionAr: "سيناء", regionEn: "Sinai" },
  { id: "24", nameAr: "السويس", nameEn: "Suez", governorAr: "عمرو حنفي", governorEn: "Amr Hanafi", capitalAr: "السويس", capitalEn: "Suez", population: 800000, regionAr: "قناة السويس", regionEn: "Canal Zone" },
  { id: "25", nameAr: "الإسماعيلية", nameEn: "Ismailia", governorAr: "شريف فلحوط", governorEn: "Sherif Falahot", capitalAr: "الإسماعيلية", capitalEn: "Ismailia", population: 1200000, regionAr: "قناة السويس", regionEn: "Canal Zone" },
  { id: "26", nameAr: "بور سعيد", nameEn: "Port Said", governorAr: "عادل الغضبان", governorEn: "Adel el-Ghadban", capitalAr: "بور سعيد", capitalEn: "Port Said", population: 750000, regionAr: "قناة السويس", regionEn: "Canal Zone" },
  { id: "27", nameAr: "دمياط", nameEn: "Damietta", governorAr: "محمد الصاوي", governorEn: "Mohamed el-Sawy", capitalAr: "دمياط", capitalEn: "Damietta", population: 1500000, regionAr: "الدلتا", regionEn: "Delta" },
];

const sectors = [
  { key: "all", ar: "الكل", en: "All" },
  { key: "sovereignty", ar: "سيادية", en: "Sovereignty", color: "#E5484D" },
  { key: "economic", ar: "اقتصادية", en: "Economic", color: "#C9A84C" },
  { key: "social", ar: "اجتماعية", en: "Social", color: "#6C8EEF" },
  { key: "infrastructure", ar: "بنية تحتية", en: "Infrastructure", color: "#2EC4B6" },
];

// maxEmployees is computed dynamically in the component from live or fallback data

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
  const [sectorFilter, setSectorFilter] = useState("all");
  const [govSearch, setGovSearch] = useState("");

  // Live Convex data
  const liveHierarchy = useQuery(api.government.getGovernmentHierarchy);
  const liveGovernorates = useQuery(api.government.listGovernorates);

  // Adapt Convex officials to UI Official shape
  const president: Official = liveHierarchy?.president
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
    : FALLBACK_PRESIDENT;

  const pm: Official = liveHierarchy?.primeMinister
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
    : FALLBACK_PM;

  // Adapt Convex ministries — Convex schema has no sector field, default to "other"
  const ministries: Ministry[] = liveHierarchy?.ministries && liveHierarchy.ministries.length > 0
    ? liveHierarchy.ministries.map((m) => ({
        id: m._id,
        nameAr: m.nameAr,
        nameEn: m.nameEn,
        ministerAr: m.minister?.nameAr ?? "—",
        ministerEn: m.minister?.nameEn ?? "—",
        employees: m.employeeCount ?? 0,
        sector: "other" as Ministry["sector"],
      }))
    : FALLBACK_MINISTRIES;

  // Adapt Convex governorates
  const governorates: Governorate[] = liveGovernorates && liveGovernorates.length > 0
    ? liveGovernorates.map((g) => ({
        id: g._id,
        nameAr: g.nameAr,
        nameEn: g.nameEn,
        governorAr: "—",
        governorEn: "—",
        capitalAr: g.capitalAr,
        capitalEn: g.capitalEn,
        population: g.population ?? 0,
        regionAr: g.regionAr ?? "",
        regionEn: g.regionEn ?? "",
      }))
    : FALLBACK_GOVERNORATES;

  const maxEmployees = ministries.length > 0 ? Math.max(...ministries.map(m => m.employees), 1) : 1;

  const filteredMinistries = ministries.filter(m => {
    const q = ministrySearch.toLowerCase();
    const matchSearch = !q || m.nameAr.includes(q) || m.nameEn.toLowerCase().includes(q) || m.ministerAr.includes(q) || m.ministerEn.toLowerCase().includes(q);
    const matchSector = sectorFilter === "all" || m.sector === sectorFilter;
    return matchSearch && matchSector;
  });

  const filteredGovernorates = governorates.filter(g => {
    const q = govSearch.toLowerCase();
    return !q || g.nameAr.includes(q) || g.nameEn.toLowerCase().includes(q) || g.governorAr.includes(q) || g.governorEn.toLowerCase().includes(q);
  });

  const regionGroups = filteredGovernorates.reduce<Record<string, { label: string; govs: Governorate[] }>>((acc, gov) => {
    const key = gov.regionEn || "Other";
    if (!acc[key]) acc[key] = { label: isAr ? (gov.regionAr || "أخرى") : (gov.regionEn || "Other"), govs: [] };
    acc[key].govs.push(gov);
    return acc;
  }, {});

  const sectorCounts = sectors.filter(s => s.key !== "all").map(s => ({
    ...s,
    count: ministries.filter(m => m.sector === s.key).length,
  }));

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">
            {isAr ? "السلطة التنفيذية" : "Executive Branch"}
          </p>
          <h1 className="text-3xl md:text-4xl font-black mb-2">
            {isAr ? "الحكومة المصرية" : "Egyptian Government"}
          </h1>
          <p className="text-muted-foreground text-sm max-w-lg">
            {isAr
              ? "الهيكل التنظيمي للسلطة التنفيذية في جمهورية مصر العربية"
              : "Organizational structure of the executive branch of the Arab Republic of Egypt"}
          </p>
        </div>

        <Tabs defaultValue="leadership">
          <TabsList className="mb-8">
            <TabsTrigger value="leadership">{isAr ? "القيادة" : "Leadership"}</TabsTrigger>
            <TabsTrigger value="ministries">{isAr ? "الوزارات" : "Ministries"}</TabsTrigger>
            <TabsTrigger value="governorates">{isAr ? "المحافظات" : "Governorates"}</TabsTrigger>
          </TabsList>

          {/* ═══ LEADERSHIP — Visual Org Chart ═══ */}
          <TabsContent value="leadership">
            <div className="flex flex-col items-center gap-0">
              {/* President */}
              <div className="w-full max-w-md">
                <OfficialCard official={president} size="lg" />
              </div>

              {/* Connector */}
              <div className="w-px h-8 bg-border" />

              {/* PM */}
              <div className="w-full max-w-md">
                <OfficialCard official={pm} size="lg" />
              </div>

              {/* Connector to ministers */}
              <div className="w-px h-8 bg-border" />
              <div className="w-3/4 max-w-2xl h-px bg-border" />

              {/* Ministers Grid */}
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
                            <span className="font-mono text-[0.625rem] text-muted-foreground">
                              <Users size={10} className="inline me-1" />
                              {m.employees >= 1000000 ? `${(m.employees / 1000000).toFixed(1)}M` : m.employees >= 1000 ? `${Math.round(m.employees / 1000)}K` : m.employees}
                            </span>
                          </div>
                          {/* Employee bar */}
                          <div className="h-1 bg-muted rounded-full mt-3 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${(m.employees / maxEmployees) * 100}%`, background: sectorInfo?.color ?? "var(--primary)" }} />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-8">
                <a href="https://cabinet.gov.eg" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  <ExternalLink size={10} /> cabinet.gov.eg
                </a>
              </p>
            </div>
          </TabsContent>

          {/* ═══ MINISTRIES — Filterable Grid ═══ */}
          <TabsContent value="ministries">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input value={ministrySearch} onChange={e => setMinistrySearch(e.target.value)} placeholder={isAr ? "بحث بالاسم أو الوزير..." : "Search by name or minister..."} className="ps-9 text-sm" />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {sectors.map(s => (
                  <Button key={s.key} variant={sectorFilter === s.key ? "default" : "outline"} size="sm" onClick={() => setSectorFilter(s.key)}
                    className={cn("text-xs h-8 rounded-full gap-1.5", sectorFilter === s.key && "shadow-sm")}>
                    {s.color && <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />}
                    {isAr ? s.ar : s.en}
                    {s.key !== "all" && <span className="text-muted-foreground ms-0.5">({sectorCounts.find(sc => sc.key === s.key)?.count})</span>}
                  </Button>
                ))}
              </div>
            </div>

            {/* Ministry cards */}
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
                      <div className="text-end flex-shrink-0">
                        <p className="font-mono text-sm font-bold text-foreground">{m.employees >= 1000000 ? `${(m.employees / 1000000).toFixed(1)}M` : `${Math.round(m.employees / 1000)}K`}</p>
                        <p className="text-[0.625rem] text-muted-foreground">{isAr ? "موظف" : "employees"}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {filteredMinistries.length === 0 && <p className="text-sm text-muted-foreground py-12 text-center">{isAr ? "لا توجد نتائج" : "No results"}</p>}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">{filteredMinistries.length} {isAr ? "وزارة" : "ministries"}</p>
              <a href="https://cabinet.gov.eg" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1"><ExternalLink size={10} /> cabinet.gov.eg</a>
            </div>
          </TabsContent>

          {/* ═══ GOVERNORATES ═══ */}
          <TabsContent value="governorates">
            <div className="relative max-w-sm mb-8">
              <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input value={govSearch} onChange={e => setGovSearch(e.target.value)} placeholder={isAr ? "بحث في المحافظات..." : "Search governorates..."} className="ps-9 text-sm" />
            </div>

            {Object.entries(regionGroups).map(([key, { label, govs }]) => (
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
                          <span className="font-mono text-xs text-muted-foreground">{(g.population / 1_000_000).toFixed(1)}M</span>
                        </div>
                        <Separator className="my-2" />
                        <p className="text-xs text-muted-foreground">
                          <span className="text-muted-foreground/60">{isAr ? "المحافظ:" : "Governor:"}</span>{" "}
                          <span className="text-foreground font-medium">{isAr ? g.governorAr : g.governorEn}</span>
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">{filteredGovernorates.length} {isAr ? "محافظة" : "governorates"}</p>
              <a href="https://capmas.gov.eg" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1"><ExternalLink size={10} /> capmas.gov.eg</a>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
