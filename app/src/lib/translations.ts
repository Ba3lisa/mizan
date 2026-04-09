// Mizan — Bilingual Translation Strings
// Arabic is the primary language

export type Lang = "ar" | "en";

export type TranslationKey = keyof typeof translations.ar;

const translations = {
  ar: {
    // Site
    siteName: "ميزان",
    siteTagline: "الحكومة المصرية، مرئية للجميع.",
    siteDescription:
      "منصة شفافية مدنية تتيح الوصول إلى بيانات الحكومة المصرية — الوزارات، البرلمان، الدستور، الميزانية، والديون — من مصادرها الرسمية.",

    // Navigation
    navHome: "الرئيسية",
    navGovernment: "الحكومة",
    navParliament: "البرلمان",
    navConstitution: "الدستور",
    navBudget: "الميزانية",
    navDebt: "الدين العام",
    navElections: "الانتخابات",
    navTransparency: "الشفافية",
    navEconomy: "الاقتصاد",
    navGovernorate: "محافظتك",
    navTaxCalculator: "حاسبة الضريبة",
    navBuyVsRent: "الشراء أم الإيجار",
    navInvest: "محاكي الاستثمار",
    navMashroaak: "مشروعك",
    navData: "البيانات",
    navTools: "أدوات",
    navAbout: "عن المشروع",
    navFunding: "التمويل",
    navMore: "المزيد",
    navAdmin: "الإدارة",
    navMethodology: "المنهجية",
    navStateInstitutions: "مؤسسات الدولة",
    navEconomyFinance: "الاقتصاد والمالية",
    navDataTools: "بيانات وأدوات",
    navAboutMizan: "عن ميزان",

    // Theme/Language
    toggleTheme: "تبديل السمة",
    toggleLang: "En",
    darkMode: "الوضع الليلي",
    lightMode: "الوضع النهاري",

    // Common
    search: "بحث",
    filter: "تصفية",
    all: "الكل",
    viewAll: "عرض الكل",
    source: "المصدر",
    updated: "آخر تحديث",
    loading: "جارٍ التحميل...",
    noResults: "لا توجد نتائج",
    members: "عضو",
    seats: "مقعد",
    articles: "مادة",
    governorates: "محافظة",
    ministry: "وزارة",
    minister: "الوزير",
    employees: "موظف",

    // Hero
    heroTitle: "ميزان",
    heroSubtitle: "Egypt's government, made visible.",
    heroDescription:
      "بيانات مفتوحة وموثّقة عن مؤسسات الحكومة المصرية — البرلمان والوزارات والدستور والميزانية والديون الخارجية.",
    heroCta1: "استكشاف الحكومة",
    heroCta2: "قراءة الدستور",

    // Stats
    stat596: "عضو في مجلس النواب",
    stat27: "محافظة مصرية",
    stat247: "مادة دستورية",
    stat155: "مليار دولار ديون خارجية",

    // Features
    feat1Title: "الحكومة",
    feat1Desc: "الهيكل التنظيمي للسلطة التنفيذية — الرئيس، ومجلس الوزراء، والمحافظون.",
    feat2Title: "البرلمان",
    feat2Desc: "تتبع مجلسَي النواب والشيوخ — الأعضاء، الأحزاب، التشريعات.",
    feat3Title: "الدستور",
    feat3Desc: "دستور 2014 مع تعديلات 2019 — قابل للبحث والتصفح والتحليل.",
    feat4Title: "الميزانية",
    feat4Desc: "إيرادات ومصروفات الدولة — مُصوَّرة وقابلة للمقارنة عبر السنوات.",
    feat5Title: "الدين العام",
    feat5Desc: "الدين الخارجي والداخلي — المصادر، الاتجاهات، السياق الإقليمي.",

    // Data sources banner
    dataSourcesTitle: "جميع البيانات من مصادر رسمية",
    dataSourcesDesc:
      "وزارة المالية · الجهاز المركزي للتعبئة والإحصاء · البنك المركزي المصري · مجلسا النواب والشيوخ · البنك الدولي",

    // Government page
    governmentTitle: "الحكومة المصرية",
    governmentDesc: "الهيكل التنظيمي للسلطة التنفيذية في جمهورية مصر العربية",
    orgChart: "الهيكل التنظيمي",
    ministries: "الوزارات",
    governoratesSection: "المحافظات",
    searchMinistries: "البحث في الوزارات...",
    searchGovernorates: "البحث في المحافظات...",
    population: "السكان",
    region: "الإقليم",
    governor: "المحافظ",
    president: "رئيس الجمهورية",
    primeMinister: "رئيس مجلس الوزراء",
    employees_label: "عدد الموظفين",

    // Parliament page
    parliamentTitle: "البرلمان المصري",
    parliamentDesc: "مجلسا النواب والشيوخ — التشكيل والأعضاء والتوزيع الحزبي",
    houseOfReps: "مجلس النواب",
    senate: "مجلس الشيوخ",
    hemicycle: "خريطة المقاعد",
    partyDistribution: "التوزيع الحزبي",
    memberDirectory: "دليل الأعضاء",
    party: "الحزب",
    governorate: "المحافظة",
    electionMethod: "طريقة الانتخاب",
    individual: "فردي",
    list: "قائمة",
    appointed: "معيّن",
    totalSeats: "إجمالي المقاعد",
    numberOfParties: "عدد الأحزاب",
    committees: "اللجان",

    // Constitution page
    constitutionTitle: "الدستور المصري",
    constitutionDesc: "دستور جمهورية مصر العربية 2014 مع تعديلات 2019",
    tableOfContents: "فهرس المحتويات",
    articleNumber: "المادة",
    amended: "معدّلة 2019",
    original: "الأصل 2014",
    articleSearch: "البحث في مواد الدستور...",
    connections: "الروابط",
    part: "الباب",
    chapter: "الفصل",
    fullText: "النص الكامل",
    summary: "الملخص",
    crossRefs: "المراجع المتقاطعة",
    compareAmendment: "مقارنة التعديل",
    before: "قبل التعديل",
    after: "بعد التعديل",

    // Budget page
    budgetTitle: "ميزانية الدولة",
    budgetDesc: "الموازنة العامة للدولة — الإيرادات والمصروفات",
    fiscalYear: "السنة المالية",
    totalRevenue: "إجمالي الإيرادات",
    totalExpenditure: "إجمالي المصروفات",
    deficit: "العجز",
    surplus: "الفائض",
    revenueBreakdown: "تفصيل الإيرادات",
    expenditureBreakdown: "تفصيل المصروفات",
    billionEGP: "مليار جنيه",
    yearComparison: "المقارنة السنوية",
    treemapView: "خريطة الإنفاق",
    sankeyView: "مسار التدفق",

    // Debt page
    debtTitle: "الدين الخارجي",
    debtDesc: "الدين الخارجي لجمهورية مصر العربية — الحجم والمصادر والاتجاهات",
    externalDebt: "الدين الخارجي",
    debtToGDP: "الدين إلى الناتج المحلي",
    debtTimeline: "مسار الدين عبر الزمن",
    creditorBreakdown: "تفصيل الدائنين",
    regionalComparison: "المقارنة الإقليمية",
    multilateral: "دائنون متعددون",
    bilateral: "دائنون ثنائيون",
    commercial: "سندات تجارية",
    other: "أخرى",
    billion: "مليار",
    debtClock: "عداد الدين",

    // Footer
    footerAbout: "عن المنصة",
    footerData: "مصادر البيانات",
    footerCite: "جميع البيانات مستقاة من منشورات رسمية للحكومة المصرية",
    footerRights: "بيانات مفتوحة للمساءلة المدنية",
  },

  en: {
    // Site
    siteName: "Mizan",
    siteTagline: "Egypt's government, made visible.",
    siteDescription:
      "A civic transparency platform providing access to Egyptian government data — ministries, parliament, constitution, budget, and debt — from official sources.",

    // Navigation
    navHome: "Home",
    navGovernment: "Government",
    navParliament: "Parliament",
    navConstitution: "Constitution",
    navBudget: "Budget",
    navDebt: "Debt",
    navElections: "Elections",
    navTransparency: "Transparency",
    navEconomy: "Economy",
    navGovernorate: "Your Governorate",
    navTaxCalculator: "Tax Calculator",
    navBuyVsRent: "Buy vs Rent",
    navInvest: "Invest",
    navMashroaak: "Mashrou'ak",
    navData: "Data",
    navTools: "Tools",
    navAbout: "About",
    navFunding: "Funding",
    navMore: "More",
    navAdmin: "Admin",
    navMethodology: "Methodology",
    navStateInstitutions: "State Institutions",
    navEconomyFinance: "Economy & Finance",
    navDataTools: "Data & Tools",
    navAboutMizan: "About Mizan",

    // Theme/Language
    toggleTheme: "Toggle Theme",
    toggleLang: "ع",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",

    // Common
    search: "Search",
    filter: "Filter",
    all: "All",
    viewAll: "View All",
    source: "Source",
    updated: "Last Updated",
    loading: "Loading...",
    noResults: "No results found",
    members: "Members",
    seats: "Seats",
    articles: "Articles",
    governorates: "Governorates",
    ministry: "Ministry",
    minister: "Minister",
    employees: "Employees",

    // Hero
    heroTitle: "Mizan",
    heroSubtitle: "Egypt's government, made visible.",
    heroDescription:
      "Open, sourced data on Egyptian government institutions — parliament, ministries, constitution, budget, and external debt.",
    heroCta1: "Explore Government",
    heroCta2: "Read the Constitution",

    // Stats
    stat596: "Members of Parliament",
    stat27: "Egyptian Governorates",
    stat247: "Constitutional Articles",
    stat155: "Billion USD External Debt",

    // Features
    feat1Title: "Government",
    feat1Desc: "Executive branch org chart — President, Cabinet, and Governors across 27 governorates.",
    feat2Title: "Parliament",
    feat2Desc: "Track both chambers — members, parties, seat distribution, and legislation.",
    feat3Title: "Constitution",
    feat3Desc: "The 2014 Constitution with 2019 amendments — searchable, browsable, and analyzable.",
    feat4Title: "Budget",
    feat4Desc: "State revenues and expenditures — visualized and comparable across fiscal years.",
    feat5Title: "Debt",
    feat5Desc: "External and domestic debt — creditors, trends, and regional context.",

    // Data sources banner
    dataSourcesTitle: "All data from official sources",
    dataSourcesDesc:
      "Ministry of Finance · Central Agency for Public Mobilization and Statistics · Central Bank of Egypt · Parliament · World Bank",

    // Government page
    governmentTitle: "Egyptian Government",
    governmentDesc: "Organizational structure of the executive branch of the Arab Republic of Egypt",
    orgChart: "Org Chart",
    ministries: "Ministries",
    governoratesSection: "Governorates",
    searchMinistries: "Search ministries...",
    searchGovernorates: "Search governorates...",
    population: "Population",
    region: "Region",
    governor: "Governor",
    president: "President",
    primeMinister: "Prime Minister",
    employees_label: "Employees",

    // Parliament page
    parliamentTitle: "Egyptian Parliament",
    parliamentDesc: "House of Representatives & Senate — composition, members, and party distribution",
    houseOfReps: "House of Representatives",
    senate: "Senate",
    hemicycle: "Seat Map",
    partyDistribution: "Party Distribution",
    memberDirectory: "Member Directory",
    party: "Party",
    governorate: "Governorate",
    electionMethod: "Election Method",
    individual: "Individual",
    list: "List",
    appointed: "Appointed",
    totalSeats: "Total Seats",
    numberOfParties: "Number of Parties",
    committees: "Committees",

    // Constitution page
    constitutionTitle: "Egyptian Constitution",
    constitutionDesc: "Constitution of the Arab Republic of Egypt 2014 with 2019 Amendments",
    tableOfContents: "Table of Contents",
    articleNumber: "Article",
    amended: "Amended 2019",
    original: "Original 2014",
    articleSearch: "Search constitutional articles...",
    connections: "Connections",
    part: "Part",
    chapter: "Chapter",
    fullText: "Full Text",
    summary: "Summary",
    crossRefs: "Cross References",
    compareAmendment: "Compare Amendment",
    before: "Before",
    after: "After",

    // Budget page
    budgetTitle: "State Budget",
    budgetDesc: "General State Budget — Revenues and Expenditures",
    fiscalYear: "Fiscal Year",
    totalRevenue: "Total Revenue",
    totalExpenditure: "Total Expenditure",
    deficit: "Deficit",
    surplus: "Surplus",
    revenueBreakdown: "Revenue Breakdown",
    expenditureBreakdown: "Expenditure Breakdown",
    billionEGP: "Billion EGP",
    yearComparison: "Year-over-Year Comparison",
    treemapView: "Spending Map",
    sankeyView: "Flow Diagram",

    // Debt page
    debtTitle: "External Debt",
    debtDesc: "External debt of the Arab Republic of Egypt — scale, sources, and trends",
    externalDebt: "External Debt",
    debtToGDP: "Debt-to-GDP",
    debtTimeline: "Debt Timeline",
    creditorBreakdown: "Creditor Breakdown",
    regionalComparison: "Regional Comparison",
    multilateral: "Multilateral",
    bilateral: "Bilateral",
    commercial: "Commercial Bonds",
    other: "Other",
    billion: "Billion",
    debtClock: "Debt Clock",

    // Footer
    footerAbout: "About",
    footerData: "Data Sources",
    footerCite: "All data cited from official Egyptian government publications",
    footerRights: "Open data for civic accountability",
  },
} as const;

export type Translations = typeof translations.ar | typeof translations.en;

export function getTranslations(lang: Lang): Translations {
  return translations[lang] as Translations;
}

export { translations };
