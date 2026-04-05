"use client";

import { useState, useMemo } from "react";
import Fuse from "fuse.js";
import { Search, X, ChevronRight, ChevronDown } from "lucide-react";
import { useLanguage } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConstitutionArticle {
  id: string;
  number: number;
  partId: string;
  chapterId?: string;
  textAr: string;
  textEn: string;
  summaryAr: string;
  summaryEn: string;
  amended: boolean;
  originalTextAr?: string;
  originalTextEn?: string;
  crossRefs: number[];
}

interface ConstitutionPart {
  id: string;
  numberAr: string;
  numberEn: string;
  titleAr: string;
  titleEn: string;
  color: string;
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const parts: ConstitutionPart[] = [
  { id: "p1", numberAr: "الباب الأول", numberEn: "Part I", titleAr: "الدولة", titleEn: "The State", color: "var(--chart-1)" },
  { id: "p2", numberAr: "الباب الثاني", numberEn: "Part II", titleAr: "الحقوق والحريات والواجبات العامة", titleEn: "Rights, Freedoms & Public Duties", color: "var(--chart-2)" },
  { id: "p3", numberAr: "الباب الثالث", numberEn: "Part III", titleAr: "السيادة", titleEn: "Sovereignty", color: "var(--chart-3)" },
  { id: "p4", numberAr: "الباب الرابع", numberEn: "Part IV", titleAr: "سيادة القانون", titleEn: "Rule of Law", color: "var(--chart-4)" },
  { id: "p5", numberAr: "الباب الخامس", numberEn: "Part V", titleAr: "نظام الحكم", titleEn: "System of Government", color: "var(--chart-5)" },
  { id: "p6", numberAr: "الباب السادس", numberEn: "Part VI", titleAr: "أحكام عامة وانتقالية", titleEn: "General & Transitional Provisions", color: "var(--chart-6)" },
];

const articles: ConstitutionArticle[] = [
  {
    id: "a1", number: 1, partId: "p1",
    textAr: "جمهورية مصر العربية دولة ذات سيادة، موحدة، لا تقبل التجزئة، ونظامها جمهوري ديمقراطي، يقوم على أساس المواطنة وسيادة القانون.",
    textEn: "The Arab Republic of Egypt is a sovereign, united and indivisible state, with a republican, democratic system of government, based on the principles of citizenship and the rule of law.",
    summaryAr: "تعريف الدولة: جمهورية ديمقراطية موحدة قائمة على المواطنة.",
    summaryEn: "Defines Egypt as a sovereign unified democratic republic.",
    amended: false, crossRefs: [4, 5, 6],
  },
  {
    id: "a2", number: 2, partId: "p1",
    textAr: "الإسلام دين الدولة، واللغة العربية لغتها الرسمية، ومبادئ الشريعة الإسلامية المصدر الرئيسي للتشريع.",
    textEn: "Islam is the religion of the state and Arabic is its official language. The principles of Islamic Sharia are the main source of legislation.",
    summaryAr: "يحدد الدين الرسمي والأسس التشريعية للدولة.",
    summaryEn: "Establishes Islam as state religion and Islamic Sharia as basis of legislation.",
    amended: false, crossRefs: [3, 7],
  },
  {
    id: "a3", number: 3, partId: "p1",
    textAr: "لمواطني مصر من المسيحيين واليهود حق التحكيم في شؤونهم الشخصية وشؤونهم الدينية، وفق قوانينهم الخاصة.",
    textEn: "Egyptian citizens of the Christian or Jewish faith have the right to resort to their respective religious legislation in matters of personal status, religious affairs, and the selection of their spiritual leaders.",
    summaryAr: "يكفل حقوق الأقليات الدينية في الشؤون الشخصية.",
    summaryEn: "Guarantees rights of Christian and Jewish minorities in personal and religious affairs.",
    amended: false, crossRefs: [2, 64, 93],
  },
  {
    id: "a4", number: 4, partId: "p1",
    textAr: "السيادة للشعب وحده، يمارسها ويحميها، وهو مصدر السلطات، ويصون وحدته الوطنية التي تقوم على مبادئ المساواة والعدل وتكافؤ الفرص بين المواطنين.",
    textEn: "Sovereignty belongs to the people alone, who exercise and protect it. The people are the source of authority and are the ones who safeguard national unity, which is based on the principles of equality, justice and equal opportunity for citizens.",
    summaryAr: "سيادة الشعب ومصدر السلطات في الدولة.",
    summaryEn: "People are the sole source of sovereignty and authority.",
    amended: false, crossRefs: [1, 5, 226],
  },
  {
    id: "a5", number: 5, partId: "p1",
    textAr: "يقوم النظام السياسي على أساس التعددية السياسية والحزبية، والتداول السلمي للسلطة، والفصل بين السلطات والتوازن بينها.",
    textEn: "The political system is based on the principles of political and party pluralism, peaceful transfer of power, separation of powers and balance among them.",
    summaryAr: "يؤسس للتعددية السياسية وتداول السلطة والفصل بين السلطات.",
    summaryEn: "Establishes political pluralism, peaceful transfer of power, and separation of powers.",
    amended: false, crossRefs: [1, 4, 101],
  },
  {
    id: "a33", number: 33, partId: "p2",
    textAr: "المواطنون لدى القانون سواء، وهم متساوون في الحقوق والحريات والواجبات العامة، لا تمييز بينهم بسبب الدين أو العقيدة أو الجنس أو الأصل أو العرق أو اللون أو اللغة أو الإعاقة أو المستوى الاجتماعي أو الانتماء السياسي أو الجغرافي أو لأي سبب آخر.",
    textEn: "Citizens are equal before the law. They have equal public rights, freedoms and duties without discrimination based on religion, belief, sex, origin, race, color, language, disability, social class, political or geographical affiliation or for any other reason.",
    summaryAr: "مبدأ المساواة وعدم التمييز بين المواطنين.",
    summaryEn: "Equality principle — no discrimination based on religion, sex, race, color, language, disability, or social class.",
    amended: false, crossRefs: [9, 10, 93],
  },
  {
    id: "a53", number: 53, partId: "p2",
    textAr: "المواطنون لدى القانون سواء، وهم متساوون في الحقوق والحريات والواجبات العامة، لا تمييز بينهم.",
    textEn: "Citizens are equal before the law, and they are equal in public rights and duties. There is no discrimination.",
    summaryAr: "يؤكد مبدأ المساواة.",
    summaryEn: "Reaffirms the principle of equality before the law.",
    amended: true,
    originalTextAr: "المواطنون لدى القانون سواء، وهم متساوون في الحقوق والحريات والواجبات العامة.",
    originalTextEn: "Citizens are equal before the law, equal in rights, freedoms, and general duties.",
    crossRefs: [33, 93],
  },
  {
    id: "a54", number: 54, partId: "p2",
    textAr: "الحرية الشخصية حق طبيعي وهي مصونة لا تمس، وفيما عدا حالة التلبس، لا يجوز القبض على أحد أو تفتيشه أو حبسه أو تقييد حريته بأي قيد إلا بأمر قضائي مسبب يستلزمه التحقيق.",
    textEn: "Personal freedom is a natural right, it is safeguarded and inviolable. Except in cases of flagrante delicto, no one may be arrested, searched, imprisoned, or have their freedom restricted in any manner, except on the basis of a reasoned judicial order necessitated by an investigation.",
    summaryAr: "يكفل الحرية الشخصية ويمنع الاعتقال التعسفي.",
    summaryEn: "Guarantees personal freedom; prohibits arbitrary arrest without judicial order.",
    amended: false, crossRefs: [55, 93],
  },
  {
    id: "a73", number: 73, partId: "p2",
    textAr: "للمواطنين حق تنظيم الاجتماعات العامة والمواكب والتظاهرات السلمية وجميع أشكال الاحتجاجات السلمية، غير مسلحة، بإخطار ينظمه القانون.",
    textEn: "Citizens have the right to organize public meetings, processions and peaceful demonstrations, and all forms of peaceful protest, unarmed, by providing notification regulated by law.",
    summaryAr: "يكفل حق التجمع السلمي والتظاهر.",
    summaryEn: "Guarantees the right to peaceful assembly and demonstration.",
    amended: false, crossRefs: [65, 70],
  },
  {
    id: "a101", number: 101, partId: "p5",
    textAr: "يتولى مجلس النواب سلطة التشريع، وإقرار السياسة العامة للدولة، والخطة العامة للتنمية الاقتصادية والاجتماعية، والموازنة العامة للدولة، ويمارس الرقابة على أعمال السلطة التنفيذية.",
    textEn: "The House of Representatives exercises legislative authority, approves the general policy of the state, the general economic and social development plan, the general budget of the state, and oversees the executive authority.",
    summaryAr: "يحدد اختصاصات مجلس النواب التشريعية والرقابية.",
    summaryEn: "Defines legislative powers of the House of Representatives.",
    amended: false, crossRefs: [102, 131, 5],
  },
  {
    id: "a140", number: 140, partId: "p5",
    textAr: "مدة رئاسة الجمهورية ست سنوات ميلادية، تبدأ من اليوم التالي لانتهاء مدة سلفه.",
    textEn: "The presidential term is six Gregorian years, starting from the day following the expiry of the predecessor's term.",
    amended: true,
    originalTextAr: "مدة رئاسة الجمهورية أربع سنوات ميلادية.",
    originalTextEn: "The presidential term is four Gregorian years.",
    summaryAr: "تم تعديلها عام 2019 لتمديد الفترة الرئاسية من 4 إلى 6 سنوات.",
    summaryEn: "Amended in 2019 to extend presidential term from 4 to 6 years.",
    crossRefs: [141, 158],
  },
  {
    id: "a226", number: 226, partId: "p6",
    textAr: "لرئيس الجمهورية أو لمجلس النواب حق اقتراح تعديل مادة أو أكثر من مواد الدستور.",
    textEn: "The President of the Republic or the House of Representatives may propose the amendment of one or more articles of the Constitution.",
    summaryAr: "يحدد إجراءات تعديل الدستور.",
    summaryEn: "Outlines the procedure for amending the Constitution.",
    amended: false, crossRefs: [4, 1],
  },
  {
    id: "a244", number: 244, partId: "p6",
    textAr: "تعمل الدولة على تمثيل الشباب والمسيحيين والأشخاص ذوي الإعاقة والمصريين المقيمين في الخارج في أول مجلس نواب يعقب العمل بهذا الدستور، على النحو الذي يبينه القانون.",
    textEn: "The state works to represent youth, Christians, persons with disabilities and Egyptians residing abroad in the first House of Representatives following the application of this Constitution.",
    summaryAr: "يكفل تمثيل الفئات المهمشة في البرلمان.",
    summaryEn: "Ensures representation of youth, Christians, disabled persons and expatriates in parliament.",
    amended: false, crossRefs: [180, 102],
  },
  {
    id: "a247", number: 247, partId: "p6",
    textAr: "يكفل الدستور للأجيال القادمة حق التنمية المستدامة والبيئة النظيفة.",
    textEn: "The Constitution guarantees for future generations the right to sustainable development and a clean environment.",
    summaryAr: "يكفل حق الأجيال القادمة في التنمية المستدامة.",
    summaryEn: "Guarantees future generations' right to sustainable development.",
    amended: false, crossRefs: [44, 45, 46],
  },
];

// ─── Article Row ──────────────────────────────────────────────────────────────

function ArticleRow({
  article,
  partColor,
  searchQuery,
}: {
  article: ConstitutionArticle;
  partColor: string;
  searchQuery: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const { lang, t } = useLanguage();
  const isAr = lang === "ar";

  const text = isAr ? article.textAr : article.textEn;
  const summary = isAr ? article.summaryAr : article.summaryEn;

  const highlightText = (str: string, query: string) => {
    if (!query) return str;
    const idx = str.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return str;
    return (
      <>
        {str.slice(0, idx)}
        <mark className="bg-yellow-200/60 dark:bg-yellow-700/40 text-inherit rounded-sm px-0.5">
          {str.slice(idx, idx + query.length)}
        </mark>
        {str.slice(idx + query.length)}
      </>
    );
  };

  return (
    <div className="border-b border-border last:border-0">
      <button
        className="w-full text-start py-4 flex items-start gap-4 hover:bg-muted/30 transition-colors rounded-lg px-2"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Article number */}
        <span
          className="font-mono text-xl font-bold flex-shrink-0 w-10 text-end leading-none mt-0.5"
          style={{ color: partColor }}
        >
          {article.number}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {article.amended && (
              <Badge variant="outline" className="text-xs px-1.5 py-0 border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/30">
                {t.amended}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {highlightText(summary, searchQuery)}
          </p>
        </div>

        <span className="text-muted-foreground flex-shrink-0 mt-0.5">
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </span>
      </button>

      {expanded && (
        <div className="px-2 pb-5">
          <div className="ms-14 flex flex-col gap-4">
            {/* Full text */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {t.fullText}
              </p>
              <p className="text-sm leading-relaxed text-foreground">
                {highlightText(text, searchQuery)}
              </p>
            </div>

            {/* Amendment diff */}
            {article.amended && article.originalTextAr && (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-amber-600 hover:text-amber-700 px-0 h-auto text-xs font-medium"
                  onClick={() => setShowDiff((v) => !v)}
                >
                  {showDiff ? "−" : "+"} {t.compareAmendment}
                </Button>
                {showDiff && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div className="p-4 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40">
                      <p className="text-xs font-semibold mb-2 text-red-600 dark:text-red-400">
                        {t.before} (2014)
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {isAr ? article.originalTextAr : article.originalTextEn}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
                      <p className="text-xs font-semibold mb-2 text-emerald-600 dark:text-emerald-400">
                        {t.after} (2019)
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cross-references */}
            {article.crossRefs.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">{t.crossRefs}:</span>
                {article.crossRefs.map((ref) => (
                  <Badge
                    key={ref}
                    variant="outline"
                    className="text-xs px-1.5 py-0"
                    style={{ color: partColor, borderColor: partColor + "55" }}
                  >
                    {t.articleNumber} {ref}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConstitutionPage() {
  const { t, lang, dir } = useLanguage();
  const isAr = lang === "ar";
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAmendedOnly, setShowAmendedOnly] = useState(false);

  const fuse = useMemo(
    () =>
      new Fuse(articles, {
        keys: ["textAr", "textEn", "summaryAr", "summaryEn"],
        threshold: 0.35,
        includeScore: true,
      }),
    []
  );

  const filteredArticles = useMemo(() => {
    let result = articles;
    if (searchQuery) {
      result = fuse.search(searchQuery).map((r) => r.item);
    }
    if (selectedPart) {
      result = result.filter((a) => a.partId === selectedPart);
    }
    if (showAmendedOnly) {
      result = result.filter((a) => a.amended);
    }
    return result;
  }, [searchQuery, selectedPart, showAmendedOnly, fuse]);

  const partById = useMemo(
    () => Object.fromEntries(parts.map((p) => [p.id, p])),
    []
  );

  const amendedCount = articles.filter((a) => a.amended).length;

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page flex flex-col gap-8">

        {/* Page header */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {isAr ? "2014 · تعديلات 2019" : "2014 · Amended 2019"}
          </p>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t.constitutionTitle}</h1>
          <p className="text-muted-foreground">{t.constitutionDesc}</p>
        </div>

        {/* Quick stats — borderless */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{isAr ? "إجمالي المواد" : "Total Articles"}</p>
            <p className="font-mono text-3xl font-bold tabular-nums">247</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">{isAr ? "معدّلة 2019" : "Amended 2019"}</p>
            <p className="font-mono text-3xl font-bold tabular-nums">{amendedCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">{isAr ? "الأبواب" : "Parts"}</p>
            <p className="font-mono text-3xl font-bold tabular-nums">6</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">{isAr ? "صدر" : "Enacted"}</p>
            <p className="font-mono text-3xl font-bold tabular-nums">2014</p>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="flex gap-8 items-start">

          {/* Sidebar TOC — desktop only */}
          <aside className="hidden md:block flex-shrink-0 w-52 sticky top-[calc(3.5rem+1.5rem)]">
            <ScrollArea className="h-[calc(100vh-12rem)]">
              <div className="flex flex-col gap-0.5 pe-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  {t.tableOfContents}
                </p>
                <button
                  onClick={() => setSelectedPart(null)}
                  className={cn(
                    "text-start px-3 py-2 rounded text-sm transition-colors w-full",
                    !selectedPart
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  {isAr ? "جميع الأبواب" : "All Parts"}
                </button>
                {parts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPart(p.id === selectedPart ? null : p.id)}
                    className={cn(
                      "text-start px-3 py-2 rounded text-xs transition-colors flex items-center gap-2 w-full leading-snug",
                      selectedPart === p.id
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5" style={{ background: p.color }} />
                    {isAr ? p.titleAr : p.titleEn}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">

            {/* Search + filter row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.articleSearch}
                  className="ps-9 pe-8 text-sm"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchQuery("")}
                    className="absolute end-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  >
                    <X size={14} />
                  </Button>
                )}
              </div>

              <Button
                variant={showAmendedOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowAmendedOnly((v) => !v)}
                className="text-sm whitespace-nowrap"
              >
                {t.amended}
              </Button>
            </div>

            {/* Mobile part pills */}
            <div className="flex gap-2 flex-wrap md:hidden">
              <Badge
                variant={!selectedPart ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedPart(null)}
              >
                {isAr ? "الكل" : "All"}
              </Badge>
              {parts.map((p) => (
                <Badge
                  key={p.id}
                  variant="outline"
                  className="cursor-pointer"
                  style={
                    selectedPart === p.id
                      ? { background: p.color, color: "#fff", borderColor: p.color }
                      : { borderColor: p.color, color: p.color }
                  }
                  onClick={() => setSelectedPart(p.id === selectedPart ? null : p.id)}
                >
                  {isAr ? p.numberAr.replace("الباب ", "") : p.numberEn}
                </Badge>
              ))}
            </div>

            {/* Result count */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {isAr
                  ? `عرض ${filteredArticles.length} مادة من ${articles.length}`
                  : `Showing ${filteredArticles.length} of ${articles.length} articles`}
              </p>
              <a
                href="https://presidency.eg"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                presidency.eg
              </a>
            </div>

            {/* Article list */}
            <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
              {filteredArticles.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  {t.noResults}
                </div>
              ) : (
                filteredArticles.map((article) => {
                  const partColor = partById[article.partId]?.color ?? "var(--chart-1)";
                  return (
                    <ArticleRow
                      key={article.id}
                      article={article}
                      partColor={partColor}
                      searchQuery={searchQuery}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
