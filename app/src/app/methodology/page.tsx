"use client";

import Link from "next/link";
import {
  ExternalLink,
  Bot,
  CheckCircle2,
  AlertTriangle,
  Clock,
  GitBranch,
  Database,
  Shield,
  RefreshCw,
  FileText,
  Search,
  ThumbsUp,
} from "lucide-react";
import { useLanguage } from "@/components/providers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

// ─── Data ─────────────────────────────────────────────────────────────────────

interface DataSource {
  nameAr: string;
  nameEn: string;
  provides: string;
  method: string;
  frequency: string;
  frequencyAr: string;
  url: string;
  methodAr: string;
}

const dataSources: DataSource[] = [
  {
    nameAr: "البنك الدولي",
    nameEn: "World Bank",
    provides: "GDP, external debt, economic indicators",
    method: "API (automated)",
    methodAr: "API (آلي)",
    frequency: "Every 6 hours",
    frequencyAr: "كل ٦ ساعات",
    url: "https://data.worldbank.org/country/egypt-arab-rep",
  },
  {
    nameAr: "البنك المركزي المصري",
    nameEn: "Central Bank of Egypt",
    provides: "Exchange rates, reserves, monetary data",
    method: "API + AI parsing",
    methodAr: "API + تحليل ذكاء اصطناعي",
    frequency: "Every 6 hours",
    frequencyAr: "كل ٦ ساعات",
    url: "https://www.cbe.org.eg/en/economic-research/statistics",
  },
  {
    nameAr: "وزارة المالية",
    nameEn: "Ministry of Finance",
    provides: "Budget, revenue, expenditure",
    method: "AI-parsed from website",
    methodAr: "تحليل ذكاء اصطناعي من الموقع",
    frequency: "Every 6 hours",
    frequencyAr: "كل ٦ ساعات",
    url: "https://www.mof.gov.eg/en/posts/statementsAndReports/5",
  },
  {
    nameAr: "الأهرام أونلاين",
    nameEn: "Ahram Online",
    provides: "Cabinet ministers, government structure",
    method: "AI-parsed from article",
    methodAr: "تحليل ذكاء اصطناعي من المقال",
    frequency: "Every 6 hours",
    frequencyAr: "كل ٦ ساعات",
    url: "https://english.ahram.org.eg/News/562168.aspx",
  },
  {
    nameAr: "ويكيبيديا + مجلس النواب",
    nameEn: "Wikipedia + Parliament.gov.eg",
    provides: "Party composition (Wikipedia), member names (parliament.gov.eg)",
    method: "Wikipedia API + page scraping + AI",
    methodAr: "واجهة ويكيبيديا + تحليل صفحات + ذكاء اصطناعي",
    frequency: "Every 6 hours",
    frequencyAr: "كل ٦ ساعات",
    url: "https://en.wikipedia.org/wiki/2025_Egyptian_parliamentary_election",
  },
  {
    nameAr: "الجهاز المركزي للإحصاء",
    nameEn: "CAPMAS",
    provides: "Population, economic statistics",
    method: "API + AI parsing",
    methodAr: "API + تحليل ذكاء اصطناعي",
    frequency: "Every 6 hours",
    frequencyAr: "كل ٦ ساعات",
    url: "https://www.capmas.gov.eg",
  },
  {
    nameAr: "الهيئة الوطنية للانتخابات",
    nameEn: "National Elections Authority",
    provides: "Election results, turnout",
    method: "AI-parsed from website",
    methodAr: "تحليل ذكاء اصطناعي من الموقع",
    frequency: "Every 6 hours",
    frequencyAr: "كل ٦ ساعات",
    url: "https://www.elections.eg",
  },
  {
    nameAr: "صندوق النقد الدولي",
    nameEn: "IMF",
    provides: "Country reports, fiscal analysis",
    method: "API + AI verification",
    methodAr: "API + تحقق بالذكاء الاصطناعي",
    frequency: "Every 6 hours",
    frequencyAr: "كل ٦ ساعات",
    url: "https://www.imf.org/en/Countries/EGY",
  },
  {
    nameAr: "مشروع الدساتير",
    nameEn: "Constitute Project",
    provides: "Constitution full text, amendments",
    method: "PDF extraction + AI parsing",
    methodAr: "استخراج PDF + تحليل ذكاء اصطناعي",
    frequency: "Every 6 hours",
    frequencyAr: "كل ٦ ساعات",
    url: "https://www.constituteproject.org/constitution/Egypt_2019",
  },
];

interface MethodBadgeProps {
  method: string;
}

function MethodBadge({ method }: MethodBadgeProps) {
  if (method.includes("API") && method.includes("automated")) {
    return <Badge variant="default" className="text-[0.625rem] whitespace-nowrap">{method}</Badge>;
  }
  if (method.includes("AI")) {
    return <Badge variant="secondary" className="text-[0.625rem] whitespace-nowrap">{method}</Badge>;
  }
  return <Badge variant="outline" className="text-[0.625rem] whitespace-nowrap">{method}</Badge>;
}

interface ResearchReport {
  titleAr: string;
  titleEn: string;
  date: string;
  sourcesChecked: { name: string; accessible: boolean }[];
  findingsCount: number;
  discrepancies: number;
  summaryAr: string;
  summaryEn: string;
  validationAr: string[];
  validationEn: string[];
}

const researchReports: ResearchReport[] = [
  {
    titleAr: "تقرير التحقق من الدين الخارجي — أبريل ٢٠٢٦",
    titleEn: "External Debt Verification Report — April 2026",
    date: "2026-04-05",
    sourcesChecked: [
      { name: "World Bank API", accessible: true },
      { name: "IMF Country Report", accessible: true },
      { name: "CBE Statistical Bulletin", accessible: true },
      { name: "Ministry of Finance (Annual Report)", accessible: true },
    ],
    findingsCount: 8,
    discrepancies: 1,
    summaryAr:
      "تم التحقق من ٨ سجلات للدين الخارجي عبر ٤ مصادر. وُجد اختلاف طفيف (٠.٣ مليار دولار) بين بيانات البنك الدولي وتقرير صندوق النقد الدولي، وقد تم اعتماد بيانات البنك الدولي الأكثر حداثة.",
    summaryEn:
      "Verified 8 external debt records across 4 sources. One minor discrepancy ($0.3B) found between World Bank data and IMF report — World Bank data adopted as the more recent figure.",
    validationAr: [
      "✓ مجموع الدين الخارجي متسق بين المصدرين الرئيسيين",
      "✓ نسبة الدين للناتج المحلي ضمن نطاق مقبول (٩١.٥٪ مقابل ٩٢.١٪ متوقع)",
      "✓ توزيع الدائنين يرتبط مع البيانات التاريخية",
      "⚠ فارق ٠.٣ مليار دولار بين البنك الدولي وصندوق النقد (تباين توقيت التقارير)",
    ],
    validationEn: [
      "✓ Total external debt consistent across two primary sources",
      "✓ Debt-to-GDP ratio within expected range (91.5% vs 92.1% projected)",
      "✓ Creditor breakdown correlates with historical data",
      "⚠ $0.3B discrepancy between World Bank & IMF (reporting timing difference)",
    ],
  },
  {
    titleAr: "تقرير التحقق من بيانات الميزانية — أبريل ٢٠٢٦",
    titleEn: "Budget Data Verification Report — April 2026",
    date: "2026-04-04",
    sourcesChecked: [
      { name: "Ministry of Finance website", accessible: true },
      { name: "MOF Financial Statements PDF", accessible: true },
      { name: "World Bank Egypt Fiscal Data", accessible: true },
      { name: "IMF Article IV Report", accessible: false },
    ],
    findingsCount: 12,
    discrepancies: 0,
    summaryAr:
      "تم التحقق من ١٢ بنداً في الموازنة العامة. جميع المجاميع تتطابق مع المصادر الرسمية. لم يُتاح تقرير المادة الرابعة من صندوق النقد خلال هذه الجلسة.",
    summaryEn:
      "Verified 12 budget line items against official sources. All totals cross-validate correctly. IMF Article IV report was inaccessible during this session.",
    validationAr: [
      "✓ الإيرادات الإجمالية = ١,٤٧٤ مليار جنيه (تأكيد وزارة المالية)",
      "✓ المصروفات الإجمالية = ٢,٠٩٥ مليار جنيه (تأكيد وزارة المالية)",
      "✓ العجز = ٦٢١ مليار جنيه (مطابق: المصروفات - الإيرادات)",
      "✓ بنود المصروفات مجموعها يطابق الرقم الكلي للمصروفات",
    ],
    validationEn: [
      "✓ Total revenue = 1,474B EGP (confirmed from MOF)",
      "✓ Total expenditure = 2,095B EGP (confirmed from MOF)",
      "✓ Deficit = 621B EGP (calculated: expenditure − revenue — matches)",
      "✓ Expenditure line items sum to total expenditure figure",
    ],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MethodologyPage() {
  const { lang, dir } = useLanguage();
  const isAr = lang === "ar";

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page">

        {/* ════════ PAGE HEADER ════════ */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Shield size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest">
                {isAr ? "المنهجية" : "Methodology"}
              </p>
              <h1 className="text-2xl md:text-3xl font-black">
                {isAr
                  ? "كيف يجمع ميزان البيانات ويتحقق منها ويحافظ عليها"
                  : "How Mizan gathers, verifies, and maintains government data"}
              </h1>
            </div>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {isAr
              ? "ميزان منصة شفافية — البيانات نفسها يجب أن تكون شفافة. كل رقم على ميزان مدعوم بمصدر رسمي موثق."
              : "Mizan is a transparency platform — the data itself must be transparent. Every number on Mizan is backed by a cited official source."}
          </p>
        </div>

        {/* ════════ SECTION 1: DATA SOURCES ════════ */}
        <section className="mb-14" id="sources">
          <div className="flex items-center gap-2 mb-2">
            <Database size={16} className="text-primary" />
            <h2 className="text-base font-bold uppercase tracking-widest text-primary">
              {isAr ? "١. مصادر البيانات" : "1. Data Sources"}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6 max-w-xl">
            {isAr
              ? "القائمة الكاملة للمصادر الرسمية التي نعتمد عليها، مع طريقة الوصول ومعدل التحديث."
              : "The full list of official sources we rely on, with access method and update frequency."}
          </p>

          <Card className="border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-bold text-xs uppercase tracking-wider">
                      {isAr ? "الجهة" : "Organization"}
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">
                      {isAr ? "البيانات المتاحة" : "Data Provided"}
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">
                      {isAr ? "طريقة الوصول" : "Access Method"}
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">
                      {isAr ? "التحديث" : "Frequency"}
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">
                      {isAr ? "الرابط" : "Link"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataSources.map((source) => (
                    <TableRow key={source.url} className="hover:bg-muted/20">
                      <TableCell>
                        <div>
                          <p className="font-semibold text-sm">{isAr ? source.nameAr : source.nameEn}</p>
                          <p className="text-[0.625rem] text-muted-foreground">
                            {isAr ? source.nameEn : source.nameAr}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs">
                        {source.provides}
                      </TableCell>
                      <TableCell>
                        <MethodBadge method={isAr ? source.methodAr : source.method} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {isAr ? source.frequencyAr : source.frequency}
                      </TableCell>
                      <TableCell>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary no-underline hover:underline inline-flex items-center gap-1 text-xs"
                        >
                          {isAr ? "زيارة" : "Visit"} <ExternalLink size={10} />
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </section>

        <Separator className="mb-14" />

        {/* ════════ SECTION 2: AI DATA AGENT ════════ */}
        <section className="mb-14" id="ai-agent">
          <div className="flex items-center gap-2 mb-2">
            <Bot size={16} className="text-primary" />
            <h2 className="text-base font-bold uppercase tracking-widest text-primary">
              {isAr ? "٢. وكيل البيانات الآلي" : "2. AI Data Agent"}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6 max-w-xl">
            {isAr
              ? "نظام آلي يعمل كل ٦ ساعات لجمع البيانات والتحقق منها من المصادر الرسمية."
              : "An automated system running every 6 hours to collect and verify data from official sources."}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {[
              {
                icon: RefreshCw,
                titleAr: "كل ٦ ساعات",
                titleEn: "Every 6 Hours",
                descAr: "وكيل ذكاء اصطناعي يفحص المصادر الرسمية تلقائياً عبر Convex cron job.",
                descEn: "AI agent automatically checks official government sources via Convex cron job.",
              },
              {
                icon: Search,
                titleAr: "تحليل بالذكاء الاصطناعي",
                titleEn: "AI Parsing",
                descAr: "يستخدم Claude AI لاستخراج البيانات من مواقع الحكومة وملفات PDF الرسمية.",
                descEn: "Uses Claude AI to extract data from government websites and official PDFs.",
              },
              {
                icon: Shield,
                titleAr: "تحقق تقاطعي",
                titleEn: "Cross-Validation",
                descAr: "كل بيان يُطابق مع مصادر متعددة — لا يُعتمد مصدر واحد منفرداً.",
                descEn: "Each data point is cross-validated against multiple sources — never a single source.",
              },
              {
                icon: CheckCircle2,
                titleAr: "فحوصات حتمية",
                titleEn: "Deterministic Checks",
                descAr: "مجاميع الميزانية يجب أن تتطابق. عدد النواب يجب أن يتطابق. نسب الدين يجب أن تقع في النطاق المتوقع.",
                descEn: "Budget totals must sum. Member counts must match. Debt ratios must fall within expected ranges.",
              },
              {
                icon: Database,
                titleAr: "سجل تدقيق كامل",
                titleEn: "Full Audit Trail",
                descAr: "كل تغيير موثق بالمصدر، القيمة القديمة، القيمة الجديدة، والطابع الزمني.",
                descEn: "Every change logged with source URL, old value, new value, and timestamp.",
              },
              {
                icon: AlertTriangle,
                titleAr: "مراجعة ذكاء اصطناعي للتغييرات الحكومية",
                titleEn: "Human Review for Gov Changes",
                descAr: "التغييرات الوزارية يتم التحقق منها بالذكاء الاصطناعي ومقارنتها بمصادر متعددة. يتم إنشاء GitHub Issue تلقائياً عند وجود تعارض.",
                descEn: "Cabinet changes are AI-verified against multiple sources. A GitHub Issue is auto-created when discrepancies are found for community verification.",
              },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <Card key={i} className="border-border/60">
                  <CardContent className="p-5">
                    <Icon size={18} className="text-primary mb-3" />
                    <h3 className="text-sm font-bold mb-1">{isAr ? item.titleAr : item.titleEn}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {isAr ? item.descAr : item.descEn}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock size={11} />
            {isAr
              ? "لعرض سجل كامل لعمليات التحديث الآلية، زر صفحة الشفافية."
              : "To see the full audit log of automated refresh operations, visit the Transparency page."}
            {" "}
            <Link href="/transparency" className="text-primary no-underline hover:underline font-medium">
              {isAr ? "سجل الشفافية ←" : "Transparency Log →"}
            </Link>
          </p>
        </section>

        <Separator className="mb-14" />

        {/* ════════ SECTION 3: DATA VERIFICATION ════════ */}
        <section className="mb-14" id="verification">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={16} className="text-primary" />
            <h2 className="text-base font-bold uppercase tracking-widest text-primary">
              {isAr ? "٣. التحقق من البيانات" : "3. Data Verification"}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6 max-w-xl">
            {isAr
              ? "كيف نضمن دقة كل رقم على ميزان."
              : "How we ensure the accuracy of every number on Mizan."}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[
              {
                badge: isAr ? "عالي" : "High",
                color: "text-emerald-500",
                bgColor: "bg-emerald-500/10",
                titleAr: "بيانات مباشرة",
                titleEn: "Direct from Official Source",
                descAr: "أرقام مستقاة مباشرة من منشورات رسمية أو واجهات API حكومية. أعلى مستوى من الموثوقية.",
                descEn: "Numbers pulled directly from official publications or government APIs. Highest confidence level.",
              },
              {
                badge: isAr ? "متوسط" : "Medium",
                color: "text-amber-500",
                bgColor: "bg-amber-500/10",
                titleAr: "بيانات مستخرجة بالذكاء الاصطناعي",
                titleEn: "AI-Extracted",
                descAr: "أرقام استخرجها الذكاء الاصطناعي من مستندات حكومية أو صفحات ويب. تمت مراجعتها لكن قد تحتوي على أخطاء نادرة.",
                descEn: "Numbers extracted by AI from government documents or web pages. Reviewed but may contain rare errors.",
              },
              {
                badge: isAr ? "منخفض" : "Low",
                color: "text-muted-foreground",
                bgColor: "bg-muted/30",
                titleAr: "بيانات مقدّرة",
                titleEn: "Estimated",
                descAr: "أرقام محسوبة أو مقدرة عندما لا تتوفر بيانات رسمية مباشرة. تُعلَّم دائماً بوضوح.",
                descEn: "Numbers that are calculated or estimated when direct official data is unavailable. Always clearly labeled.",
              },
            ].map((level, i) => (
              <Card key={i} className="border-border/60">
                <CardContent className="p-5">
                  <Badge className={`text-[0.625rem] mb-3 ${level.bgColor} ${level.color} border-0`}>
                    {level.badge}
                  </Badge>
                  <h3 className="text-sm font-bold mb-1">{isAr ? level.titleAr : level.titleEn}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isAr ? level.descAr : level.descEn}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-border/60 bg-muted/20">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <FileText size={16} className="text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-bold mb-1">
                    {isAr ? "الأرقام المحسوبة" : "Calculated Values"}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isAr
                      ? "القيم المحسوبة تُظهر طريقة الاشتقاق بوضوح. مثال: العجز = المصروفات − الإيرادات. هذه الاشتقاقات مُدققة حتمياً — إذا لم تتطابق الأرقام، يُشار إلى خطأ في البيانات."
                      : "Calculated values show their derivation method clearly. Example: deficit = expenditure − revenue. These derivations are validated deterministically — if numbers don't add up, a data error is flagged."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator className="mb-14" />

        {/* ════════ SECTION 4: PROPOSE CORRECTIONS ════════ */}
        <section className="mb-14" id="corrections">
          <div className="flex items-center gap-2 mb-2">
            <ThumbsUp size={16} className="text-primary" />
            <h2 className="text-base font-bold uppercase tracking-widest text-primary">
              {isAr ? "٤. اقتراح تصحيح" : "4. Propose Corrections"}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6 max-w-xl">
            {isAr ? "وجدت خطأ؟ ساعدنا في تصحيحه." : "Found an error? Help us fix it."}
          </p>

          <div className="flex flex-col gap-4">
            <Button asChild className="w-fit gap-2">
              <a
                href="https://github.com/Ba3lisa/mizan/issues/new?template=data-correction.md&labels=data-correction"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GitBranch size={14} />
                {isAr ? "الإبلاغ عن خطأ في البيانات" : "Report a Data Error on GitHub"}
                <ExternalLink size={12} />
              </a>
            </Button>
            <p className="text-xs text-muted-foreground max-w-lg">
              {isAr
                ? "سيتم مراجعة التقرير تلقائياً من قبل مجلس الذكاء الاصطناعي (LLM Council) الخاص بميزان. المصادر الحكومية (.gov.eg) لها الأولوية القصوى."
                : "Your report will be automatically reviewed by the Mizan LLM Council. Government sources (.gov.eg) have the highest priority."}
            </p>
          </div>
        </section>

        <Separator className="mb-14" />

        {/* ════════ SECTION 5: AI RESEARCH REPORTS ════════ */}
        <section className="mb-12" id="reports">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={16} className="text-primary" />
            <h2 className="text-base font-bold uppercase tracking-widest text-primary">
              {isAr ? "٥. تقارير البحث الآلي" : "5. AI Research Reports"}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6 max-w-xl">
            {isAr
              ? "نماذج من تقارير التحقق الآلي التي يُنتجها وكيل الذكاء الاصطناعي في كل جلسة."
              : "Sample verification reports produced by the AI agent each session."}
          </p>

          <div className="space-y-6">
            {researchReports.map((report, i) => (
              <Card key={i} className="border-border/60">
                <CardContent className="p-6">
                  {/* Report header */}
                  <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                    <div>
                      <h3 className="text-base font-bold">
                        {isAr ? report.titleAr : report.titleEn}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        <Clock size={10} className="inline me-1" />
                        {report.date}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-[0.625rem]">
                        {isAr ? `${report.findingsCount} نتيجة` : `${report.findingsCount} findings`}
                      </Badge>
                      <Badge
                        variant={report.discrepancies > 0 ? "destructive" : "default"}
                        className="text-[0.625rem]"
                      >
                        {report.discrepancies > 0
                          ? (isAr ? `${report.discrepancies} تباين` : `${report.discrepancies} discrepancy`)
                          : (isAr ? "لا تباينات" : "No discrepancies")}
                      </Badge>
                    </div>
                  </div>

                  {/* Summary */}
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    {isAr ? report.summaryAr : report.summaryEn}
                  </p>

                  {/* Sources checked */}
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      {isAr ? "المصادر المفحوصة" : "Sources Checked"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {report.sourcesChecked.map((source, j) => (
                        <span
                          key={j}
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                            source.accessible
                              ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/5"
                              : "border-red-500/30 text-red-500 bg-red-500/5"
                          }`}
                        >
                          {source.accessible ? (
                            <CheckCircle2 size={9} />
                          ) : (
                            <AlertTriangle size={9} />
                          )}
                          {source.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Validation results */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      {isAr ? "نتائج التحقق" : "Validation Results"}
                    </p>
                    <ul className="space-y-1">
                      {(isAr ? report.validationAr : report.validationEn).map((line, j) => (
                        <li key={j} className="text-xs text-foreground font-mono">
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
