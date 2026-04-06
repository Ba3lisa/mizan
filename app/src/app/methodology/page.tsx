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

      </div>
    </div>
  );
}
