"use client";

import { useState } from "react";
import { useLanguage } from "@/components/providers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Hospital, School, MapPin, TrendingDown } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MP {
  nameAr: string;
  nameEn: string;
  partyAr: string;
  partyEn: string;
  chamberAr: string;
  chamberEn: string;
}

interface GovernorateDetail {
  id: string;
  nameAr: string;
  nameEn: string;
  capitalAr: string;
  capitalEn: string;
  governorAr: string;
  governorEn: string;
  appointedAr: string;
  appointedEn: string;
  population: number;
  regionAr: string;
  regionEn: string;
  povertyRate: number;
  literacyRate: number;
  hospitalBedsPer10K: number;
  schools: number;
  budgetAllocationBn: number | null;
  mps: MP[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const governorates: GovernorateDetail[] = [
  {
    id: "cairo",
    nameAr: "القاهرة",
    nameEn: "Cairo",
    capitalAr: "القاهرة",
    capitalEn: "Cairo",
    governorAr: "إبراهيم الشهابي",
    governorEn: "Ibrahim el-Shehabi",
    appointedAr: "مارس ٢٠٢٤",
    appointedEn: "Mar 2024",
    population: 10142000,
    regionAr: "مصر السفلى",
    regionEn: "Lower Egypt",
    povertyRate: 18.5,
    literacyRate: 88.4,
    hospitalBedsPer10K: 14.2,
    schools: 4120,
    budgetAllocationBn: 28.4,
    mps: [
      { nameAr: "هشام الجندي", nameEn: "Hisham el-Gindi", partyAr: "مستقبل وطن", partyEn: "Mostaqbal Watan", chamberAr: "النواب", chamberEn: "House" },
      { nameAr: "نادية هنري", nameEn: "Nadia Henry", partyAr: "مستقبل وطن", partyEn: "Mostaqbal Watan", chamberAr: "النواب", chamberEn: "House" },
      { nameAr: "سامي بهنساوي", nameEn: "Samy Bahensawy", partyAr: "مستقبل وطن", partyEn: "Mostaqbal Watan", chamberAr: "الشيوخ", chamberEn: "Senate" },
    ],
  },
  {
    id: "alexandria",
    nameAr: "الإسكندرية",
    nameEn: "Alexandria",
    capitalAr: "الإسكندرية",
    capitalEn: "Alexandria",
    governorAr: "محمد الشريف",
    governorEn: "Mohamed el-Sherif",
    appointedAr: "أبريل ٢٠٢٢",
    appointedEn: "Apr 2022",
    population: 5200000,
    regionAr: "الساحل الشمالي",
    regionEn: "Northern Coast",
    povertyRate: 16.2,
    literacyRate: 86.1,
    hospitalBedsPer10K: 13.8,
    schools: 2200,
    budgetAllocationBn: 14.1,
    mps: [
      { nameAr: "أحمد سعيد", nameEn: "Ahmed Said", partyAr: "مستقبل وطن", partyEn: "Mostaqbal Watan", chamberAr: "النواب", chamberEn: "House" },
      { nameAr: "فريدة الشوباشي", nameEn: "Farida el-Shobakshi", partyAr: "مستقبل وطن", partyEn: "Mostaqbal Watan", chamberAr: "الشيوخ", chamberEn: "Senate" },
    ],
  },
  {
    id: "giza",
    nameAr: "الجيزة",
    nameEn: "Giza",
    capitalAr: "الجيزة",
    capitalEn: "Giza",
    governorAr: "أحمد راشد",
    governorEn: "Ahmed Rashed",
    appointedAr: "يونيو ٢٠٢٣",
    appointedEn: "Jun 2023",
    population: 9250000,
    regionAr: "مصر السفلى",
    regionEn: "Lower Egypt",
    povertyRate: 22.3,
    literacyRate: 83.7,
    hospitalBedsPer10K: 11.5,
    schools: 3650,
    budgetAllocationBn: 21.2,
    mps: [
      { nameAr: "طارق رضوان", nameEn: "Tarek Radwan", partyAr: "مستقبل وطن", partyEn: "Mostaqbal Watan", chamberAr: "النواب", chamberEn: "House" },
    ],
  },
  {
    id: "sharqia",
    nameAr: "الشرقية",
    nameEn: "Sharqia",
    capitalAr: "الزقازيق",
    capitalEn: "Zagazig",
    governorAr: "هشام آمنة",
    governorEn: "Hesham Amna",
    appointedAr: "أغسطس ٢٠٢١",
    appointedEn: "Aug 2021",
    population: 7500000,
    regionAr: "الدلتا",
    regionEn: "Delta",
    povertyRate: 29.1,
    literacyRate: 78.4,
    hospitalBedsPer10K: 9.2,
    schools: 3100,
    budgetAllocationBn: 16.5,
    mps: [
      { nameAr: "محمود حسين", nameEn: "Mahmoud Hussein", partyAr: "مستقبل وطن", partyEn: "Mostaqbal Watan", chamberAr: "النواب", chamberEn: "House" },
    ],
  },
  {
    id: "dakahlia",
    nameAr: "الدقهلية",
    nameEn: "Dakahlia",
    capitalAr: "المنصورة",
    capitalEn: "Mansoura",
    governorAr: "أيمن المنذر",
    governorEn: "Ayman el-Mandouh",
    appointedAr: "مايو ٢٠٢٣",
    appointedEn: "May 2023",
    population: 6500000,
    regionAr: "الدلتا",
    regionEn: "Delta",
    povertyRate: 31.4,
    literacyRate: 76.2,
    hospitalBedsPer10K: 8.7,
    schools: 2800,
    budgetAllocationBn: 14.2,
    mps: [],
  },
  {
    id: "beheira",
    nameAr: "البحيرة",
    nameEn: "Beheira",
    capitalAr: "دمنهور",
    capitalEn: "Damanhour",
    governorAr: "هشام أمنة",
    governorEn: "Hesham Amna",
    appointedAr: "يوليو ٢٠٢١",
    appointedEn: "Jul 2021",
    population: 5900000,
    regionAr: "الدلتا",
    regionEn: "Delta",
    povertyRate: 33.2,
    literacyRate: 74.1,
    hospitalBedsPer10K: 8.1,
    schools: 2500,
    budgetAllocationBn: 12.8,
    mps: [],
  },
  {
    id: "qalyubia",
    nameAr: "القليوبية",
    nameEn: "Qalyubia",
    capitalAr: "بنها",
    capitalEn: "Banha",
    governorAr: "محمد سامي",
    governorEn: "Mohamed Samy",
    appointedAr: "يناير ٢٠٢٢",
    appointedEn: "Jan 2022",
    population: 5800000,
    regionAr: "الدلتا",
    regionEn: "Delta",
    povertyRate: 24.5,
    literacyRate: 81.3,
    hospitalBedsPer10K: 10.4,
    schools: 2420,
    budgetAllocationBn: 12.1,
    mps: [],
  },
  {
    id: "minya",
    nameAr: "المنيا",
    nameEn: "Minya",
    capitalAr: "المنيا",
    capitalEn: "Minya",
    governorAr: "أسامة الغزالي",
    governorEn: "Osama el-Ghazaly",
    appointedAr: "فبراير ٢٠٢٢",
    appointedEn: "Feb 2022",
    population: 5500000,
    regionAr: "مصر الوسطى",
    regionEn: "Middle Egypt",
    povertyRate: 51.2,
    literacyRate: 63.4,
    hospitalBedsPer10K: 7.3,
    schools: 2150,
    budgetAllocationBn: 9.6,
    mps: [],
  },
  {
    id: "sohag",
    nameAr: "سوهاج",
    nameEn: "Sohag",
    capitalAr: "سوهاج",
    capitalEn: "Sohag",
    governorAr: "سامح الدهشان",
    governorEn: "Sameh el-Dahshan",
    appointedAr: "مارس ٢٠٢٣",
    appointedEn: "Mar 2023",
    population: 4800000,
    regionAr: "مصر العليا",
    regionEn: "Upper Egypt",
    povertyRate: 55.7,
    literacyRate: 60.1,
    hospitalBedsPer10K: 6.9,
    schools: 1900,
    budgetAllocationBn: 8.4,
    mps: [],
  },
  {
    id: "asyut",
    nameAr: "أسيوط",
    nameEn: "Asyut",
    capitalAr: "أسيوط",
    capitalEn: "Asyut",
    governorAr: "عصام سعد",
    governorEn: "Essam Saad",
    appointedAr: "أبريل ٢٠٢٣",
    appointedEn: "Apr 2023",
    population: 4200000,
    regionAr: "مصر العليا",
    regionEn: "Upper Egypt",
    povertyRate: 53.1,
    literacyRate: 62.8,
    hospitalBedsPer10K: 7.1,
    schools: 1650,
    budgetAllocationBn: 7.9,
    mps: [],
  },
  {
    id: "kafr_elsheikh",
    nameAr: "كفر الشيخ",
    nameEn: "Kafr el-Sheikh",
    capitalAr: "كفر الشيخ",
    capitalEn: "Kafr el-Sheikh",
    governorAr: "جمال نور الدين",
    governorEn: "Gamal Nour el-Din",
    appointedAr: "مايو ٢٠٢٢",
    appointedEn: "May 2022",
    population: 3500000,
    regionAr: "الدلتا",
    regionEn: "Delta",
    povertyRate: 36.8,
    literacyRate: 72.3,
    hospitalBedsPer10K: 8.4,
    schools: 1420,
    budgetAllocationBn: 7.1,
    mps: [],
  },
  {
    id: "gharbia",
    nameAr: "الغربية",
    nameEn: "Gharbia",
    capitalAr: "طنطا",
    capitalEn: "Tanta",
    governorAr: "سامي سعد",
    governorEn: "Samy Saad",
    appointedAr: "يونيو ٢٠٢٢",
    appointedEn: "Jun 2022",
    population: 5200000,
    regionAr: "الدلتا",
    regionEn: "Delta",
    povertyRate: 27.4,
    literacyRate: 79.6,
    hospitalBedsPer10K: 9.8,
    schools: 2180,
    budgetAllocationBn: 10.5,
    mps: [],
  },
  {
    id: "monufia",
    nameAr: "المنوفية",
    nameEn: "Monufia",
    capitalAr: "شبين الكوم",
    capitalEn: "Shibin el-Kom",
    governorAr: "أشرف بدر",
    governorEn: "Ashraf Badr",
    appointedAr: "يناير ٢٠٢٣",
    appointedEn: "Jan 2023",
    population: 3800000,
    regionAr: "الدلتا",
    regionEn: "Delta",
    povertyRate: 28.9,
    literacyRate: 81.2,
    hospitalBedsPer10K: 9.5,
    schools: 1600,
    budgetAllocationBn: 8.1,
    mps: [],
  },
  {
    id: "faiyum",
    nameAr: "الفيوم",
    nameEn: "Faiyum",
    capitalAr: "الفيوم",
    capitalEn: "Faiyum",
    governorAr: "أيمن فريد",
    governorEn: "Ayman Farid",
    appointedAr: "مارس ٢٠٢٢",
    appointedEn: "Mar 2022",
    population: 3700000,
    regionAr: "مصر الوسطى",
    regionEn: "Middle Egypt",
    povertyRate: 45.3,
    literacyRate: 68.4,
    hospitalBedsPer10K: 7.8,
    schools: 1480,
    budgetAllocationBn: 7.3,
    mps: [],
  },
  {
    id: "beni_suef",
    nameAr: "بني سويف",
    nameEn: "Beni Suef",
    capitalAr: "بني سويف",
    capitalEn: "Beni Suef",
    governorAr: "محمد هاني",
    governorEn: "Mohamed Hany",
    appointedAr: "فبراير ٢٠٢٣",
    appointedEn: "Feb 2023",
    population: 3200000,
    regionAr: "مصر الوسطى",
    regionEn: "Middle Egypt",
    povertyRate: 47.1,
    literacyRate: 67.2,
    hospitalBedsPer10K: 7.5,
    schools: 1320,
    budgetAllocationBn: 6.8,
    mps: [],
  },
  {
    id: "qena",
    nameAr: "قنا",
    nameEn: "Qena",
    capitalAr: "قنا",
    capitalEn: "Qena",
    governorAr: "عز الدين منصور",
    governorEn: "Ezzeddine Mansour",
    appointedAr: "أبريل ٢٠٢٢",
    appointedEn: "Apr 2022",
    population: 3400000,
    regionAr: "مصر العليا",
    regionEn: "Upper Egypt",
    povertyRate: 49.6,
    literacyRate: 64.8,
    hospitalBedsPer10K: 7.0,
    schools: 1380,
    budgetAllocationBn: 6.5,
    mps: [],
  },
  {
    id: "luxor",
    nameAr: "الأقصر",
    nameEn: "Luxor",
    capitalAr: "الأقصر",
    capitalEn: "Luxor",
    governorAr: "مصطفى الصيرفي",
    governorEn: "Mostafa el-Sairafi",
    appointedAr: "يونيو ٢٠٢٣",
    appointedEn: "Jun 2023",
    population: 1200000,
    regionAr: "مصر العليا",
    regionEn: "Upper Egypt",
    povertyRate: 43.2,
    literacyRate: 69.4,
    hospitalBedsPer10K: 8.3,
    schools: 510,
    budgetAllocationBn: 3.2,
    mps: [],
  },
  {
    id: "aswan",
    nameAr: "أسوان",
    nameEn: "Aswan",
    capitalAr: "أسوان",
    capitalEn: "Aswan",
    governorAr: "إسماعيل كمال",
    governorEn: "Ismail Kamal",
    appointedAr: "مارس ٢٠٢٣",
    appointedEn: "Mar 2023",
    population: 1500000,
    regionAr: "مصر العليا",
    regionEn: "Upper Egypt",
    povertyRate: 39.7,
    literacyRate: 71.8,
    hospitalBedsPer10K: 9.1,
    schools: 640,
    budgetAllocationBn: 4.1,
    mps: [],
  },
  {
    id: "red_sea",
    nameAr: "البحر الأحمر",
    nameEn: "Red Sea",
    capitalAr: "الغردقة",
    capitalEn: "Hurghada",
    governorAr: "عمرو حنفي",
    governorEn: "Amr Hanafi",
    appointedAr: "يناير ٢٠٢٢",
    appointedEn: "Jan 2022",
    population: 450000,
    regionAr: "البحر الأحمر",
    regionEn: "Red Sea",
    povertyRate: 12.4,
    literacyRate: 88.9,
    hospitalBedsPer10K: 15.2,
    schools: 210,
    budgetAllocationBn: 2.8,
    mps: [],
  },
  {
    id: "new_valley",
    nameAr: "الوادي الجديد",
    nameEn: "New Valley",
    capitalAr: "الخارجة",
    capitalEn: "Kharga",
    governorAr: "عصام البديوي",
    governorEn: "Essam el-Bedeiwy",
    appointedAr: "مايو ٢٠٢١",
    appointedEn: "May 2021",
    population: 250000,
    regionAr: "الصحراء الغربية",
    regionEn: "Western Desert",
    povertyRate: 22.1,
    literacyRate: 84.3,
    hospitalBedsPer10K: 12.6,
    schools: 120,
    budgetAllocationBn: 1.9,
    mps: [],
  },
  {
    id: "matrouh",
    nameAr: "مطروح",
    nameEn: "Matrouh",
    capitalAr: "مرسى مطروح",
    capitalEn: "Mersa Matruh",
    governorAr: "خالد شريف",
    governorEn: "Khaled Sherif",
    appointedAr: "أغسطس ٢٠٢٢",
    appointedEn: "Aug 2022",
    population: 420000,
    regionAr: "الساحل الشمالي",
    regionEn: "Northern Coast",
    povertyRate: 19.8,
    literacyRate: 85.6,
    hospitalBedsPer10K: 11.2,
    schools: 195,
    budgetAllocationBn: 2.4,
    mps: [],
  },
  {
    id: "north_sinai",
    nameAr: "شمال سيناء",
    nameEn: "North Sinai",
    capitalAr: "العريش",
    capitalEn: "El-Arish",
    governorAr: "محمد عبد الفضيل",
    governorEn: "Mohamed Abdel Fadil",
    appointedAr: "أبريل ٢٠٢١",
    appointedEn: "Apr 2021",
    population: 500000,
    regionAr: "سيناء",
    regionEn: "Sinai",
    povertyRate: 28.6,
    literacyRate: 80.4,
    hospitalBedsPer10K: 10.1,
    schools: 230,
    budgetAllocationBn: 3.6,
    mps: [],
  },
  {
    id: "south_sinai",
    nameAr: "جنوب سيناء",
    nameEn: "South Sinai",
    capitalAr: "الطور",
    capitalEn: "El-Tur",
    governorAr: "اللواء خالد فودة",
    governorEn: "Gen. Khaled Fouda",
    appointedAr: "مارس ٢٠٢٠",
    appointedEn: "Mar 2020",
    population: 180000,
    regionAr: "سيناء",
    regionEn: "Sinai",
    povertyRate: 14.2,
    literacyRate: 86.7,
    hospitalBedsPer10K: 16.8,
    schools: 95,
    budgetAllocationBn: 2.1,
    mps: [],
  },
  {
    id: "suez",
    nameAr: "السويس",
    nameEn: "Suez",
    capitalAr: "السويس",
    capitalEn: "Suez",
    governorAr: "عمرو حنفي",
    governorEn: "Amr Hanafi",
    appointedAr: "يناير ٢٠٢٢",
    appointedEn: "Jan 2022",
    population: 800000,
    regionAr: "قناة السويس",
    regionEn: "Canal Zone",
    povertyRate: 16.9,
    literacyRate: 87.2,
    hospitalBedsPer10K: 14.1,
    schools: 360,
    budgetAllocationBn: 4.5,
    mps: [],
  },
  {
    id: "ismailia",
    nameAr: "الإسماعيلية",
    nameEn: "Ismailia",
    capitalAr: "الإسماعيلية",
    capitalEn: "Ismailia",
    governorAr: "شريف فلحوط",
    governorEn: "Sherif Falahot",
    appointedAr: "فبراير ٢٠٢٢",
    appointedEn: "Feb 2022",
    population: 1200000,
    regionAr: "قناة السويس",
    regionEn: "Canal Zone",
    povertyRate: 18.3,
    literacyRate: 85.9,
    hospitalBedsPer10K: 13.4,
    schools: 520,
    budgetAllocationBn: 5.2,
    mps: [],
  },
  {
    id: "port_said",
    nameAr: "بور سعيد",
    nameEn: "Port Said",
    capitalAr: "بور سعيد",
    capitalEn: "Port Said",
    governorAr: "عادل الغضبان",
    governorEn: "Adel el-Ghadban",
    appointedAr: "مارس ٢٠٢١",
    appointedEn: "Mar 2021",
    population: 750000,
    regionAr: "قناة السويس",
    regionEn: "Canal Zone",
    povertyRate: 13.8,
    literacyRate: 89.1,
    hospitalBedsPer10K: 15.6,
    schools: 310,
    budgetAllocationBn: 4.0,
    mps: [],
  },
  {
    id: "damietta",
    nameAr: "دمياط",
    nameEn: "Damietta",
    capitalAr: "دمياط",
    capitalEn: "Damietta",
    governorAr: "محمد الصاوي",
    governorEn: "Mohamed el-Sawy",
    appointedAr: "يونيو ٢٠٢٣",
    appointedEn: "Jun 2023",
    population: 1500000,
    regionAr: "الدلتا",
    regionEn: "Delta",
    povertyRate: 21.4,
    literacyRate: 83.6,
    hospitalBedsPer10K: 10.9,
    schools: 630,
    budgetAllocationBn: 5.8,
    mps: [],
  },
];

// ─── Stat tile ─────────────────────────────────────────────────────────────────

function StatTile({
  icon: Icon,
  labelAr,
  labelEn,
  value,
  isAr,
  highlight,
}: {
  icon: typeof Users;
  labelAr: string;
  labelEn: string;
  value: string;
  isAr: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl p-4 border ${highlight ? "border-[#C9A84C]/30 bg-[#C9A84C]/5" : "border-border/60 bg-card/60"}`}>
      <Icon size={14} className={`mb-2 ${highlight ? "text-[#C9A84C]" : "text-muted-foreground"}`} />
      <p className={`font-mono text-xl font-black tracking-tight ${highlight ? "text-[#C9A84C]" : "text-foreground"}`}>{value}</p>
      <p className="text-[0.625rem] text-muted-foreground mt-0.5 uppercase tracking-widest">
        {isAr ? labelAr : labelEn}
      </p>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function GovernoratePage() {
  const { lang, dir } = useLanguage();
  const isAr = lang === "ar";
  const [selectedId, setSelectedId] = useState<string>("");

  const selected = governorates.find((g) => g.id === selectedId) ?? null;

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">
            {isAr ? "بياناتك المحلية" : "Your Local Data"}
          </p>
          <h1 className="text-3xl md:text-4xl font-black mb-2">
            {isAr ? "محافظتك" : "Your Governorate"}
          </h1>
          <p className="text-muted-foreground text-sm max-w-lg">
            {isAr
              ? "اختر محافظتك لعرض البيانات المحلية — المحافظ، النواب، الإحصاءات الاجتماعية والاقتصادية"
              : "Select your governorate to see local data — governor, MPs, social and economic stats"}
          </p>
        </div>

        {/* Select */}
        <div className="max-w-sm mb-8">
          <Select value={selectedId} onValueChange={setSelectedId} dir={dir}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={isAr ? "اختر المحافظة..." : "Select a governorate..."} />
            </SelectTrigger>
            <SelectContent>
              {governorates.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {isAr ? g.nameAr : g.nameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selected && (
          <Card className="border-border/60 bg-card/60">
            <CardContent className="p-12 text-center text-muted-foreground">
              <MapPin size={24} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">{isAr ? "اختر محافظة من القائمة أعلاه" : "Select a governorate from the list above"}</p>
            </CardContent>
          </Card>
        )}

        {selected && (
          <div className="space-y-6">
            {/* Governor card */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-black flex-shrink-0">
                    {(isAr ? selected.nameAr : selected.nameEn).charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h2 className="text-2xl font-black text-foreground leading-tight">
                          {isAr ? selected.nameAr : selected.nameEn}
                        </h2>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin size={10} />
                          {isAr ? selected.capitalAr : selected.capitalEn} ·{" "}
                          {isAr ? selected.regionAr : selected.regionEn}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {(selected.population / 1_000_000).toFixed(1)}M {isAr ? "نسمة" : "people"}
                      </Badge>
                    </div>

                    <Separator className="my-4" />

                    <div className="flex items-center gap-3 flex-wrap">
                      <div>
                        <p className="text-[0.625rem] text-muted-foreground uppercase tracking-widest">
                          {isAr ? "المحافظ" : "Governor"}
                        </p>
                        <p className="text-sm font-bold text-foreground">
                          {isAr ? selected.governorAr : selected.governorEn}
                        </p>
                        <p className="text-[0.625rem] text-muted-foreground font-mono">
                          {isAr ? "عُيِّن:" : "Appointed:"}{" "}
                          {isAr ? selected.appointedAr : selected.appointedEn}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key stats grid */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                {isAr ? "المؤشرات الرئيسية" : "Key Indicators"}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatTile
                  icon={Users}
                  labelAr="السكان"
                  labelEn="Population"
                  value={`${(selected.population / 1_000_000).toFixed(1)}M`}
                  isAr={isAr}
                />
                <StatTile
                  icon={TrendingDown}
                  labelAr="معدل الفقر"
                  labelEn="Poverty Rate"
                  value={`${selected.povertyRate}%`}
                  isAr={isAr}
                  highlight={selected.povertyRate > 40}
                />
                <StatTile
                  icon={Hospital}
                  labelAr="أسرة لكل ١٠ آلاف"
                  labelEn="Beds / 10K"
                  value={`${selected.hospitalBedsPer10K}`}
                  isAr={isAr}
                />
                <StatTile
                  icon={School}
                  labelAr="عدد المدارس"
                  labelEn="Schools"
                  value={selected.schools.toLocaleString()}
                  isAr={isAr}
                />
              </div>
            </div>

            {/* Literacy + budget */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="border-border/60 bg-card/60">
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">
                    {isAr ? "معدل محو الأمية" : "Literacy Rate"}
                  </p>
                  <p className="font-mono text-4xl font-black text-foreground">{selected.literacyRate}%</p>
                  <div className="h-2 bg-muted rounded-full mt-3 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${selected.literacyRate}%`,
                        background: selected.literacyRate >= 80 ? "#3FC380" : selected.literacyRate >= 65 ? "#C9A84C" : "#E5484D",
                      }}
                    />
                  </div>
                  <p className="text-[0.625rem] text-muted-foreground mt-2">{isAr ? "المصدر: الجهاز المركزي للتعبئة والإحصاء" : "Source: CAPMAS"}</p>
                </CardContent>
              </Card>

              {selected.budgetAllocationBn !== null && (
                <Card className="border-border/60 bg-card/60">
                  <CardContent className="p-5">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">
                      {isAr ? "تخصيص الموازنة" : "Budget Allocation"}
                    </p>
                    <p className="font-mono text-4xl font-black text-foreground">
                      {selected.budgetAllocationBn}B
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{isAr ? "جنيه مصري — ٢٠٢٤/٢٠٢٥" : "EGP — FY 2024/2025"}</p>
                    <p className="text-[0.625rem] text-muted-foreground mt-2">{isAr ? "المصدر: وزارة المالية (تقديري)" : "Source: Ministry of Finance (est.)"}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* MPs / Senators */}
            {selected.mps.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                  {isAr ? "ممثلو المحافظة في البرلمان" : "Parliamentary Representatives"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {selected.mps.map((mp) => (
                    <Card key={mp.nameEn} className="border-border/60 bg-card/60">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {(isAr ? mp.nameAr : mp.nameEn).charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">
                            {isAr ? mp.nameAr : mp.nameEn}
                          </p>
                          <p className="text-[0.65rem] text-muted-foreground truncate">
                            {isAr ? mp.partyAr : mp.partyEn}
                          </p>
                          <Badge variant="outline" className="text-[0.6rem] mt-0.5">
                            {isAr ? mp.chamberAr : mp.chamberEn}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
