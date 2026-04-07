"use client";

import Link from "next/link";
import { Scale, ExternalLink, Github } from "lucide-react";
import { useLanguage } from "@/components/providers";

const stateNav = [
  { href: "/government", ar: "الحكومة", en: "Government" },
  { href: "/parliament", ar: "البرلمان", en: "Parliament" },
  { href: "/constitution", ar: "الدستور", en: "Constitution" },
  { href: "/elections", ar: "الانتخابات", en: "Elections" },
];

const economyNav = [
  { href: "/economy", ar: "المؤشرات الاقتصادية", en: "Economy" },
  { href: "/budget", ar: "الموازنة العامة", en: "Budget" },
  { href: "/debt", ar: "الدين العام", en: "Debt" },
];

const dataToolsNav = [
  { href: "/budget/your-share", ar: "حاسبة الضريبة", en: "Tax Calculator" },
  { href: "/governorate", ar: "بيانات المحافظات", en: "Governorates" },
];

const aboutNav = [
  { href: "/transparency", ar: "الشفافية", en: "Transparency" },
  { href: "/methodology", ar: "المنهجية", en: "Methodology" },
  { href: "/funding", ar: "التمويل", en: "Funding" },
];

const srcs = [
  { name: "parliament.gov.eg", url: "https://www.parliament.gov.eg" },
  { name: "mof.gov.eg", url: "https://www.mof.gov.eg" },
  { name: "cbe.org.eg", url: "https://www.cbe.org.eg" },
  { name: "worldbank.org", url: "https://data.worldbank.org/country/egypt-arab-rep" },
  { name: "imf.org", url: "https://www.imf.org/en/Countries/EGY" },
];

const NavColumn = ({ title, items, isAr }: { title: string; items: typeof stateNav; isAr: boolean }) => (
  <div>
    <h4 className="text-[0.6875rem] font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</h4>
    <nav className="flex flex-col gap-1.5">
      {items.map((l) => <Link key={l.href} href={l.href} className="text-sm text-muted-foreground no-underline hover:text-primary transition-colors">{isAr ? l.ar : l.en}</Link>)}
    </nav>
  </div>
);

export function Footer() {
  const { lang, dir } = useLanguage();
  const isAr = lang === "ar";


  return (
    <footer className="container-page border-t border-border" dir={dir}>
      <div className="py-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
        {/* Brand */}
        <div className="col-span-2 md:col-span-3 lg:col-span-1">
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

        {/* Nav columns */}
        <NavColumn title={isAr ? "مؤسسات الدولة" : "State Institutions"} items={stateNav} isAr={isAr} />
        <NavColumn title={isAr ? "الاقتصاد والمالية" : "Economy & Finance"} items={economyNav} isAr={isAr} />
        <NavColumn title={isAr ? "بيانات وأدوات" : "Data & Tools"} items={dataToolsNav} isAr={isAr} />
        <NavColumn title={isAr ? "عن ميزان" : "About Mizan"} items={aboutNav} isAr={isAr} />

        {/* Sources */}
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
        <div className="flex items-center gap-3">
          <a
            href={`https://github.com/Ba3lisa/mizan/releases/tag/${process.env.NEXT_PUBLIC_APP_VERSION || "v1.0.2"}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.625rem] text-muted-foreground/60 no-underline hover:text-primary font-mono transition-colors"
          >
            {process.env.NEXT_PUBLIC_APP_VERSION || "v1.0.2"}
          </a>
          <p className="text-xs text-muted-foreground font-mono">© {new Date().getFullYear()}</p>
        </div>
      </div>
    </footer>
  );
}
