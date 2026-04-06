"use client";

import Link from "next/link";
import { Scale, ExternalLink, Github } from "lucide-react";
import { useLanguage } from "@/components/providers";

const nav = [
  { href: "/government", ar: "الحكومة", en: "Government" },
  { href: "/parliament", ar: "البرلمان", en: "Parliament" },
  { href: "/constitution", ar: "الدستور", en: "Constitution" },
  { href: "/budget", ar: "الميزانية", en: "Budget" },
  { href: "/debt", ar: "الدين العام", en: "Debt" },
  { href: "/transparency", ar: "الشفافية", en: "Transparency" },
  { href: "/methodology", ar: "المنهجية", en: "Methodology" },
];

const srcs = [
  { name: "parliament.gov.eg", url: "https://www.parliament.gov.eg" },
  { name: "cabinet.gov.eg", url: "https://www.cabinet.gov.eg" },
  { name: "mof.gov.eg", url: "https://www.mof.gov.eg" },
  { name: "cbe.org.eg", url: "https://www.cbe.org.eg" },
  { name: "worldbank.org", url: "https://data.worldbank.org/country/egypt-arab-rep" },
];

export function Footer() {
  const { lang, dir } = useLanguage();
  const isAr = lang === "ar";

  return (
    <footer className="container-page border-t border-border" dir={dir}>
      <div className="py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded bg-primary text-primary-foreground flex items-center justify-center"><Scale size={10} strokeWidth={2} /></div>
            <span className="font-bold text-sm">{isAr ? "ميزان" : "Mizan"}</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mb-3">
            {isAr ? "بيانات مفتوحة عن الحكومة المصرية. يُدار بالكامل بواسطة الذكاء الاصطناعي." : "Open data about the Egyptian government. Fully AI-managed."}
          </p>
          <a href="https://github.com/Ba3lisa/mizan" target="_blank" rel="noopener noreferrer"
            className="text-xs text-muted-foreground no-underline hover:text-primary transition-colors inline-flex items-center gap-1.5">
            <Github size={14} /> GitHub
          </a>
        </div>
        <div>
          <h4 className="text-[0.6875rem] font-semibold text-muted-foreground uppercase tracking-wider mb-3">{isAr ? "التصفح" : "Navigation"}</h4>
          <nav className="flex flex-col gap-1.5">
            {nav.map((l) => <Link key={l.href} href={l.href} className="text-sm text-muted-foreground no-underline hover:text-primary transition-colors">{isAr ? l.ar : l.en}</Link>)}
          </nav>
        </div>
        <div>
          <h4 className="text-[0.6875rem] font-semibold text-muted-foreground uppercase tracking-wider mb-3">{isAr ? "المصادر" : "Sources"}</h4>
          <nav className="flex flex-col gap-1.5">
            {srcs.map((s) => <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground no-underline hover:text-primary transition-colors inline-flex items-center gap-1">{s.name} <ExternalLink size={10} /></a>)}
          </nav>
        </div>
      </div>
      <div className="py-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {isAr ? "ميزان — منصة شفافية مدنية." : "Mizan — civic transparency."}{" "}
          {isAr ? "بناء" : "Built by"}{" "}
          <a href="https://egouda.xyz/" target="_blank" rel="noopener noreferrer" className="text-primary no-underline hover:underline">Essam Gouda</a>
        </p>
        <p className="text-xs text-muted-foreground font-mono">© {new Date().getFullYear()}</p>
      </div>
    </footer>
  );
}
