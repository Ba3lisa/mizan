/**
 * Single source of truth for site navigation.
 * Both the header nav and the homepage feature grid consume this.
 * To add/remove/reorder pages, edit ONLY this file.
 */

import {
  Building2,
  Users,
  BookOpen,
  BarChart3,
  TrendingDown,
  TrendingUp,
  Landmark,
  LineChart,
  Heart,
  MapPin,
  Calculator,
  Bot,
  BookMarked,
  Home as HomeIcon,
  Vote,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  /** Translation key for nav label */
  labelKey: string;
  /** English label (nav + homepage) */
  en: string;
  /** Arabic label (nav + homepage) */
  ar: string;
  /** Icon for homepage cards */
  icon: LucideIcon;
  /** Homepage card description */
  descEn: string;
  descAr: string;
}

export interface NavGroup {
  /** Translation key for group label in nav */
  labelKey: string;
  en: string;
  ar: string;
  items: NavItem[];
}

/**
 * Navigation groups — used by header dropdowns AND homepage feature grid.
 * Order here = order in both nav and homepage.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: "navStateInstitutions",
    en: "State Institutions",
    ar: "مؤسسات الدولة",
    items: [
      { href: "/government", labelKey: "navGovernment", en: "Government", ar: "الحكومة", icon: Building2, descEn: "President · Ministers · Governorates", descAr: "الرئيس · الوزراء · المحافظات" },
      { href: "/parliament", labelKey: "navParliament", en: "Parliament", ar: "البرلمان", icon: Users, descEn: "596 House · 300 Senate · Parties", descAr: "٥٩٦ نائب · ٣٠٠ شيوخ · الأحزاب" },
      { href: "/constitution", labelKey: "navConstitution", en: "Constitution", ar: "الدستور", icon: BookOpen, descEn: "247 Articles · 2019 Amendments", descAr: "٢٤٧ مادة · تعديلات ٢٠١٩" },
      { href: "/elections", labelKey: "navElections", en: "Elections", ar: "الانتخابات", icon: Landmark, descEn: "Presidential & parliamentary results", descAr: "نتائج رئاسية وبرلمانية" },
      { href: "/governorate", labelKey: "navGovernorate", en: "Governorates", ar: "بيانات المحافظات", icon: MapPin, descEn: "Governor · MPs · Local stats", descAr: "المحافظ · النواب · الإحصاءات" },
    ],
  },
  {
    labelKey: "navEconomyFinance",
    en: "Economy & Finance",
    ar: "الاقتصاد والمالية",
    items: [
      { href: "/economy", labelKey: "navEconomy", en: "Economy", ar: "المؤشرات الاقتصادية", icon: LineChart, descEn: "GDP · Inflation · Exchange Rate", descAr: "الناتج المحلي · التضخم · سعر الصرف" },
      { href: "/budget", labelKey: "navBudget", en: "Budget", ar: "الموازنة العامة", icon: BarChart3, descEn: "Revenue · Expenditure · Deficit", descAr: "إيرادات · مصروفات · عجز" },
      { href: "/debt", labelKey: "navDebt", en: "Debt", ar: "الدين العام", icon: TrendingDown, descEn: "External & domestic debt", descAr: "الدين الخارجي والداخلي" },
    ],
  },
  {
    labelKey: "navTools",
    en: "Tools",
    ar: "أدوات",
    items: [
      { href: "/tools/tax-calculator", labelKey: "navTaxCalculator", en: "Tax Calculator", ar: "حاسبة الضريبة", icon: Calculator, descEn: "Where do your taxes go? — Interactive breakdown", descAr: "أين تذهب ضرائبك؟ — تقدير تفاعلي" },
      { href: "/tools/buy-vs-rent", labelKey: "navBuyVsRent", en: "Buy vs Rent", ar: "شراء أم إيجار؟", icon: HomeIcon, descEn: "Real estate decision calculator for Egypt", descAr: "حاسبة القرار العقاري في مصر" },
      { href: "/tools/invest", labelKey: "navInvest", en: "Investment Simulator", ar: "محاكي الاستثمار", icon: TrendingUp, descEn: "Gold · USD · Real Estate · Stocks — compare returns", descAr: "قارن بين الذهب · الدولار · العقار · البورصة" },
      { href: "/polls", labelKey: "navPolls", en: "Polls", ar: "استطلاعات الرأي", icon: Vote, descEn: "Weekly polls & community opinion", descAr: "استطلاعات أسبوعية ورأي المجتمع" },
    ],
  },
  {
    labelKey: "navAboutMizan",
    en: "About Mizan",
    ar: "عن ميزان",
    items: [
      { href: "/transparency", labelKey: "navTransparency", en: "Transparency", ar: "الشفافية", icon: Bot, descEn: "AI audit log · Data refresh reports", descAr: "سجل تحديث البيانات" },
      { href: "/methodology", labelKey: "navMethodology", en: "Methodology", ar: "المنهجية", icon: BookMarked, descEn: "How we gather & verify data", descAr: "كيف نجمع البيانات" },
      { href: "/funding", labelKey: "navFunding", en: "Funding", ar: "التمويل", icon: Heart, descEn: "Transparent funding", descAr: "التمويل الشفاف" },
    ],
  },
];

/** Flat list of all nav items */
export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
