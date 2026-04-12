/**
 * Quick-option presets and page tours for the guide chat.
 * Tours are centralized here — each page has its own tour steps.
 */

export interface GuidePreset {
  id: string;
  labelEn: string;
  labelAr: string;
  promptEn: string;
  promptAr: string;
}

export interface LocalTourStep {
  highlight: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
}

// ─── Page Tours ─────────────────────────────────────────────────────────────

export const PAGE_TOURS: Record<string, LocalTourStep[]> = {

  // ── Tools ───────────────────────────────────────────────────────────────

  "/tools/tax-calculator": [
    { highlight: "[data-guide='salary-input']", title: "Your Salary", titleAr: "راتبك", description: "Enter your annual salary, use the slider, or pick a common amount", descriptionAr: "أدخل راتبك السنوي أو استخدم المؤشر والأزرار السريعة" },
    { highlight: "[data-guide='tax-summary']", title: "Tax Summary", titleAr: "ملخص الضريبة", description: "Total tax paid and your effective tax rate", descriptionAr: "إجمالي الضريبة ومعدلها الفعلي" },
    { highlight: "[data-guide='tax-chart']", title: "Distribution Chart", titleAr: "مخطط التوزيع", description: "Pie chart showing where each pound of your tax goes", descriptionAr: "مخطط يوضح أين يذهب كل جنيه من ضرائبك" },
    { highlight: "[data-guide='tax-categories']", title: "Spending Categories", titleAr: "بنود الإنفاق", description: "Detailed per-sector breakdown: debt, wages, education, health", descriptionAr: "تفاصيل: خدمة الدين، الأجور، التعليم، الصحة" },
  ],

  "/tools/invest": [
    { highlight: "[data-guide='capital']", title: "Your Capital", titleAr: "رأس مالك", description: "Enter your investment amount — use the slider or type directly", descriptionAr: "أدخل مبلغ الاستثمار — استخدم المؤشر أو اكتب مباشرة" },
    { highlight: "[data-guide='horizon']", title: "Time Horizon", titleAr: "المدى الزمني", description: "How many years? Longer horizons generally reduce risk", descriptionAr: "كم سنة تنوي الاستثمار؟ مدة أطول = مخاطر أقل" },
    { highlight: "[data-guide='allocation']", title: "Portfolio Split", titleAr: "توزيع المحفظة", description: "Drag sliders to divide across asset classes, or pick a preset strategy", descriptionAr: "اسحب المؤشرات لتوزيع أموالك، أو اختر استراتيجية جاهزة" },
    { highlight: "[data-guide='output']", title: "Results Dashboard", titleAr: "لوحة النتائج", description: "Projected returns: nominal, inflation-adjusted, and in USD", descriptionAr: "العوائد المتوقعة: اسمية وحقيقية وبالدولار" },
  ],

  "/tools/buy-vs-rent": [
    { highlight: "[data-guide='bvr-basics']", title: "Property & Rent", titleAr: "العقار والإيجار", description: "Enter home price, monthly rent, and how long you plan to stay", descriptionAr: "أدخل سعر العقار والإيجار الشهري ومدة الإقامة" },
    { highlight: "[data-guide='bvr-financing']", title: "Financing Type", titleAr: "نوع التمويل", description: "Choose mortgage, installments, or cash — each changes the math", descriptionAr: "اختر تمويل عقاري، أقساط، أو كاش — كل خيار يغير النتيجة" },
    { highlight: "[data-guide='verdict']", title: "The Verdict", titleAr: "النتيجة", description: "Buy or rent? See which saves more and the breakeven year", descriptionAr: "شراء أم إيجار؟ شاهد أيهما يوفر أكثر وسنة التعادل" },
    { highlight: "[data-guide='bvr-breakdown']", title: "Cost Breakdown", titleAr: "تفاصيل التكاليف", description: "Detailed comparison: initial, recurring, opportunity costs for both options", descriptionAr: "مقارنة مفصلة: تكاليف أولية ومتكررة وتكلفة الفرصة البديلة" },
  ],

  "/tools/mashroaak": [
    { highlight: "[data-guide='mashroaak-tabs']", title: "Browse Modes", titleAr: "طرق البحث", description: "Match by budget or explore all opportunities with filters", descriptionAr: "ابحث حسب الميزانية أو استكشف كل الفرص بالتصفية" },
    { highlight: "[data-guide='capital-input']", title: "Your Budget", titleAr: "ميزانيتك", description: "Set your capital to find matching industrial & investment projects", descriptionAr: "حدد رأس مالك للعثور على فرص صناعية واستثمارية مناسبة" },
    { highlight: "[data-guide='mashroaak-results']", title: "Opportunities", titleAr: "الفرص المتاحة", description: "Browse real projects from IDA & GAFI with costs, areas, and sectors", descriptionAr: "تصفح مشاريع حقيقية من IDA وGAFI مع التكاليف والمساحات" },
  ],

  // ── Economy & Finance ───────────────────────────────────────────────────

  "/economy": [
    { highlight: "[data-guide='econ-indicators']", title: "Key Indicators", titleAr: "المؤشرات الرئيسية", description: "GDP, inflation, unemployment, and growth at a glance", descriptionAr: "الناتج المحلي والتضخم والبطالة والنمو بنظرة واحدة" },
    { highlight: "[data-guide='gdp-chart']", title: "GDP Growth", titleAr: "نمو الناتج المحلي", description: "Egypt's GDP trend over the past decade", descriptionAr: "اتجاه الناتج المحلي لمصر خلال العقد الماضي" },
    { highlight: "[data-guide='inflation-chart']", title: "Inflation", titleAr: "التضخم", description: "Consumer price inflation rate over time", descriptionAr: "معدل تضخم أسعار المستهلك عبر الزمن" },
    { highlight: "[data-guide='exchange-rate']", title: "Exchange Rate", titleAr: "سعر الصرف", description: "USD/EGP rate and currency trends", descriptionAr: "سعر الدولار مقابل الجنيه واتجاهات العملة" },
  ],

  "/budget": [
    { highlight: "[data-guide='budget-summary']", title: "Revenue & Spending", titleAr: "الإيرادات والمصروفات", description: "Total government revenue vs expenditure", descriptionAr: "إجمالي إيرادات ومصروفات الحكومة" },
    { highlight: "[data-guide='budget-deficit']", title: "Budget Deficit", titleAr: "عجز الموازنة", description: "The gap between what the government earns and spends", descriptionAr: "الفجوة بين ما تجنيه الحكومة وما تنفقه" },
    { highlight: "[data-guide='budget-flow']", title: "Budget Flow", titleAr: "تدفق الموازنة", description: "Sankey diagram: where money comes from and goes", descriptionAr: "مخطط سانكي: من أين تأتي الأموال وأين تذهب" },
    { highlight: "[data-guide='budget-comparison']", title: "Year Comparison", titleAr: "مقارنة سنوية", description: "Compare budget figures across fiscal years", descriptionAr: "قارن أرقام الموازنة عبر السنوات المالية" },
  ],

  "/debt": [
    { highlight: "[data-guide='debt-total']", title: "Total Debt", titleAr: "إجمالي الديون", description: "Egypt's total external debt figure", descriptionAr: "إجمالي الدين الخارجي لمصر" },
    { highlight: "[data-guide='debt-gdp-ratio']", title: "Debt-to-GDP", titleAr: "الدين للناتج المحلي", description: "How large is the debt relative to the economy", descriptionAr: "حجم الدين مقارنة بحجم الاقتصاد" },
    { highlight: "[data-guide='debt-chart']", title: "Debt Timeline", titleAr: "تطور الديون", description: "External debt growth over time", descriptionAr: "نمو الدين الخارجي عبر الزمن" },
  ],

  // ── State Institutions ──────────────────────────────────────────────────

  "/government": [
    { highlight: "[data-guide='president']", title: "Head of State", titleAr: "رئيس الدولة", description: "The President and key leadership", descriptionAr: "الرئيس والقيادة" },
    { highlight: "[data-guide='cabinet']", title: "Cabinet", titleAr: "مجلس الوزراء", description: "All ministers and their portfolios", descriptionAr: "جميع الوزراء وحقائبهم" },
    { highlight: "[data-guide='governorates-list']", title: "Governorates", titleAr: "المحافظات", description: "27 governorates with governors and key stats", descriptionAr: "٢٧ محافظة مع المحافظين والإحصاءات" },
  ],

  "/parliament": [
    { highlight: "[data-guide='party-chart']", title: "Party Composition", titleAr: "تركيبة الأحزاب", description: "Political parties and their seat distribution", descriptionAr: "الأحزاب السياسية وتوزيع المقاعد" },
  ],

  "/constitution": [
    { highlight: "[data-guide='search']", title: "Search Articles", titleAr: "ابحث في المواد", description: "Search all 247 articles by keyword or topic", descriptionAr: "ابحث في ٢٤٧ مادة بالكلمة أو الموضوع" },
    { highlight: "[data-guide='articles-list']", title: "Articles", titleAr: "المواد", description: "Browse articles organized by constitutional sections", descriptionAr: "تصفح المواد مرتبة حسب أبواب الدستور" },
  ],
};

// ─── Chat Presets ────────────────────────────────────────────────────────────

export const GUIDE_PRESETS: GuidePreset[] = [
  {
    id: "economy",
    labelEn: "Understand the economy",
    labelAr: "افهم الاقتصاد",
    promptEn: "I want to understand Egypt's economy — show me GDP, inflation, and the budget",
    promptAr: "أريد أن أفهم الاقتصاد المصري — اعرض لي الناتج المحلي والتضخم والموازنة",
  },
  {
    id: "government",
    labelEn: "Who runs the government?",
    labelAr: "من يدير الحكومة؟",
    promptEn: "Who runs Egypt's government? Show me the cabinet and parliament",
    promptAr: "من يدير الحكومة المصرية؟ اعرض لي مجلس الوزراء والبرلمان",
  },
  {
    id: "taxes",
    labelEn: "Where do my taxes go?",
    labelAr: "أين تذهب ضرائبي؟",
    promptEn: "Where do my taxes go? Calculate my tax for a 120,000 EGP salary and show me the budget breakdown",
    promptAr: "أين تذهب ضرائبي؟ احسب ضريبتي لراتب ١٢٠٬٠٠٠ جنيه واعرض لي توزيع الموازنة",
  },
  {
    id: "invest",
    labelEn: "Explore investments",
    labelAr: "استكشف الاستثمار",
    promptEn: "I want to explore investment options in Egypt — compare returns and find real opportunities",
    promptAr: "أريد استكشاف خيارات الاستثمار في مصر — قارن العوائد واعرض الفرص الحقيقية",
  },
  {
    id: "rights",
    labelEn: "Know my rights",
    labelAr: "اعرف حقوقي",
    promptEn: "I want to learn about my constitutional rights in Egypt",
    promptAr: "أريد أن أعرف حقوقي الدستورية في مصر",
  },
  {
    id: "data",
    labelEn: "How is this data sourced?",
    labelAr: "كيف يتم جمع البيانات؟",
    promptEn: "How does Mizan source its data? Show me the methodology and transparency log",
    promptAr: "كيف يجمع ميزان بياناته؟ اعرض لي المنهجية وسجل الشفافية",
  },
];

// ─── Page Context Maps (used by backend to inject into agent system prompt) ──

/** Available data-guide selectors per page */
export const PAGE_SELECTORS: Record<string, string[]> = {
  "/tools/tax-calculator": ["salary-input", "tax-summary", "tax-chart", "tax-categories"],
  "/tools/invest": ["capital", "horizon", "allocation", "output"],
  "/tools/buy-vs-rent": ["bvr-basics", "bvr-financing", "verdict", "bvr-breakdown"],
  "/tools/mashroaak": ["mashroaak-tabs", "capital-input", "mashroaak-filters", "mashroaak-results"],
  "/economy": ["econ-indicators", "gdp-chart", "inflation-chart", "exchange-rate"],
  "/budget": ["budget-summary", "budget-deficit", "budget-flow", "budget-comparison"],
  "/debt": ["debt-total", "debt-gdp-ratio", "debt-chart", "debt-creditors"],
  "/government": ["president", "cabinet", "governorates-list"],
  "/parliament": ["party-chart"],
  "/constitution": ["search", "articles-list"],
};

/** Available WebMCP tools per page */
export const PAGE_TOOLS: Record<string, string[]> = {
  "/tools/tax-calculator": ["calculate_egypt_tax"],
  "/tools/invest": ["simulate_egypt_investment"],
  "/tools/buy-vs-rent": ["compare_buy_vs_rent"],
  "/tools/mashroaak": ["search_egypt_investment_opportunities"],
};
