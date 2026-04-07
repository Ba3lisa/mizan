"use client";

import {
  ExternalLink,
  Bot,
  CheckCircle2,
  AlertTriangle,
  Clock,
  GitBranch,
  Shield,
  RefreshCw,
  Search,
  ThumbsUp,
  Database,
} from "lucide-react";
import { useLanguage } from "@/components/providers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
                  ? "كيف يجمع ميزان البيانات ويتحقق منها"
                  : "How Mizan gathers and verifies data"}
              </h1>
            </div>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {isAr
              ? "ميزان منصة شفافية — البيانات نفسها يجب أن تكون شفافة. كل رقم على ميزان مدعوم بمصدر رسمي موثق."
              : "Mizan is a transparency platform — the data itself must be transparent. Every number on Mizan is backed by a cited official source."}
          </p>
        </div>

        {/* ════════ SECTION 1: AI DATA AGENT ════════ */}
        <section className="mb-14" id="ai-agent">
          <div className="flex items-center gap-2 mb-2">
            <Bot size={16} className="text-primary" />
            <h2 className="text-base font-bold uppercase tracking-widest text-primary">
              {isAr ? "١. وكيل البيانات الآلي" : "1. AI Data Agent"}
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
                titleAr: "تحقق آلي للتغييرات الحكومية",
                titleEn: "AI Verification for Gov Changes",
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
              ? "لعرض سجل كامل لعمليات التحديث ومصادر البيانات، زر صفحة الشفافية."
              : "To see the full audit log, tracked sources, and data health dashboard, visit the Transparency page."}
            {" "}
            <Link href="/transparency" className="text-primary no-underline hover:underline font-medium">
              {isAr ? "لوحة الشفافية ←" : "Transparency Dashboard →"}
            </Link>
          </p>
        </section>

        <Separator className="mb-14" />

        {/* ════════ SECTION 2: PROPOSE CORRECTIONS ════════ */}
        <section className="mb-12" id="corrections">
          <div className="flex items-center gap-2 mb-2">
            <ThumbsUp size={16} className="text-primary" />
            <h2 className="text-base font-bold uppercase tracking-widest text-primary">
              {isAr ? "٢. اقتراح تصحيح" : "2. Propose Corrections"}
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

        {/* ════════ SECTION 3: SANAD REFERENCE CONFIDENCE ════════ */}
        <section className="mb-12" id="sanad">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={16} className="text-primary" />
            <h2 className="text-base font-bold uppercase tracking-widest text-primary">
              {isAr ? "٣. السند — مستويات الثقة المرجعية" : "3. Sanad — Reference Confidence"}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6 max-w-xl">
            {isAr
              ? "كل بيان على ميزان مصحوب بمستوى سند يوضح مصدره ودرجة الثقة فيه. عند وجود تعارض بين المصادر، نعرض جميع القيم."
              : "Every data point on Mizan carries a Sanad level indicating its source and confidence. When sources disagree, we show all values."}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
            {[
              {
                level: 1,
                labelAr: "حكومي رسمي",
                labelEn: "Official Government",
                descAr: "مباشر من مصادر حكومية رسمية (.gov.eg) — الجهاز المركزي للإحصاء، الوزارات",
                descEn: "Direct from gov.eg sources — CAPMAS, ministries",
                color: "border-emerald-500/30 bg-emerald-500/5",
                dot: "bg-emerald-500",
                textColor: "text-emerald-600 dark:text-emerald-400",
              },
              {
                level: 2,
                labelAr: "منظمة دولية",
                labelEn: "International Org",
                descAr: "البنك الدولي، صندوق النقد الدولي، برنامج الأمم المتحدة الإنمائي",
                descEn: "World Bank, IMF, UNDP",
                color: "border-blue-500/30 bg-blue-500/5",
                dot: "bg-blue-500",
                textColor: "text-blue-600 dark:text-blue-400",
              },
              {
                level: 3,
                labelAr: "إعلام",
                labelEn: "News & Media",
                descAr: "الأهرام، الهيئة العامة للاستعلامات، إيجيبت توداي",
                descEn: "Ahram Online, SIS, EgyptToday",
                color: "border-amber-500/30 bg-amber-500/5",
                dot: "bg-amber-500",
                textColor: "text-amber-600 dark:text-amber-400",
              },
              {
                level: 4,
                labelAr: "مصادر أخرى",
                labelEn: "Other Sources",
                descAr: "ويكيبيديا، بيانات مجتمعية",
                descEn: "Wikipedia, community-submitted",
                color: "border-border bg-muted/30",
                dot: "bg-muted-foreground",
                textColor: "text-muted-foreground",
              },
              {
                level: 5,
                labelAr: "محسوب",
                labelEn: "Derived/Calculated",
                descAr: "محسوب أو مشتق من بيانات أخرى",
                descEn: "Computed from other data",
                color: "border-violet-500/30 bg-violet-500/5",
                dot: "bg-violet-500",
                textColor: "text-violet-600 dark:text-violet-400",
              },
              {
                level: 0,
                labelAr: "إجماع",
                labelEn: "Consensus",
                descAr: "مصادر متعددة تتفق على نفس القيمة — أعلى مستوى ثقة (مرجّح بوزن السند)",
                descEn: "Multiple sources agree on the same value — highest confidence (weighted by Sanad level)",
                color: "border-teal-500/30 bg-teal-500/5",
                dot: "bg-teal-500",
                textColor: "text-teal-600 dark:text-teal-400",
              },
            ].map((lvl) => (
              <Card key={lvl.level} className={cn("border", lvl.color)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[0.6rem] font-mono text-muted-foreground/60">{lvl.level === 0 ? "✓" : lvl.level}</span>
                    <span className={cn("w-2 h-2 rounded-full", lvl.dot)} />
                    <span className={cn("text-xs font-bold", lvl.textColor)}>
                      {isAr ? lvl.labelAr : lvl.labelEn}
                    </span>
                  </div>
                  <p className="text-[0.65rem] text-muted-foreground leading-relaxed">
                    {isAr ? lvl.descAr : lvl.descEn}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Disclaimer */}
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">
                  {isAr ? "ملاحظة الشفافية" : "Transparency Note"}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isAr
                    ? "تصنيف مستويات السند هو الجزء الوحيد في ميزان الذي يتضمن رأياً بشرياً. نعمل على تطوير نظام تقييم مستقل عبر مجلس نماذج الذكاء الاصطناعي لتقليل الاعتماد على التقدير البشري."
                    : "Sanad level assignment is the only opinionated part of Mizan. We are working on automating this via the LLM Council to make the platform less opinion-dependent."}
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

      </div>
    </div>
  );
}
