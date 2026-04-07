"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scale, Moon, Sun, Menu, ChevronDown } from "lucide-react";
import { useTheme, useLanguage, useCurrency } from "@/components/providers";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { t, toggleLang, lang, dir } = useLanguage();
  const { currency, toggleCurrency } = useCurrency();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const directNav = [
    { href: "/", label: t.navHome },
  ];

  const govNav = [
    { href: "/government", label: t.navGovernment },
    { href: "/constitution", label: t.navConstitution },
    { href: "/governorate", label: t.navGovernorate },
  ];

  const dataNav = [
    { href: "/economy", label: t.navEconomy },
    { href: "/budget", label: t.navBudget },
    { href: "/debt", label: t.navDebt },
    { href: "/elections", label: t.navElections },
  ];

  const toolsNav = [
    { href: "/tools/tax-calculator", label: t.navTaxCalculator },
    { href: "/tools/buy-vs-rent", label: t.navBuyVsRent },
    { href: "/tools/invest", label: t.navInvest },
  ];

  const aboutNav = [
    { href: "/methodology", label: t.navMethodology },
    { href: "/transparency", label: t.navTransparency },
  ];

  const extraNav = [
    { href: "/funding", label: t.navFunding },
  ];

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  const renderDropdown = (label: string, items: { href: string; label: string }[]) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn(
          "text-[0.8125rem] font-medium transition-colors whitespace-nowrap relative py-1 flex items-center gap-1 cursor-pointer",
          items.some(n => isActive(n.href)) ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )}>
          {label} <ChevronDown size={12} />
          {items.some(n => isActive(n.href)) && (
            <span className="absolute -bottom-[1.125rem] inset-x-0 h-[2px] bg-primary rounded-full" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {items.map((n) => (
          <DropdownMenuItem key={n.href} asChild>
            <Link href={n.href} className={cn("no-underline w-full", isActive(n.href) && "text-primary")}>
              {n.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <header className={cn(
      "fixed top-0 inset-x-0 z-50 h-14 border-b transition-all duration-300",
      scrolled
        ? "bg-background/80 backdrop-blur-xl border-border shadow-lg shadow-background/20"
        : "bg-background border-transparent"
    )}>
      <div className="container-page h-full flex items-center gap-6 lg:gap-10">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 no-underline group">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center transition-transform group-hover:scale-105">
            <Scale size={15} strokeWidth={2} />
          </div>
          <span className="font-black text-lg tracking-tight">{lang === "ar" ? "ميزان" : "Mizan"}</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-6 flex-1" dir={dir}>
          {/* Direct links: Home */}
          {directNav.map((n) => (
            <Link key={n.href} href={n.href}
              className={cn(
                "text-[0.8125rem] font-medium no-underline transition-colors whitespace-nowrap relative py-1",
                isActive(n.href) ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}>
              {n.label}
              {isActive(n.href) && <span className="absolute -bottom-[1.125rem] inset-x-0 h-[2px] bg-primary rounded-full" />}
            </Link>
          ))}

          {/* Government dropdown */}
          {renderDropdown(t.navGovernment, govNav)}

          {/* Data dropdown */}
          {renderDropdown(t.navData, dataNav)}

          {/* Tools dropdown */}
          {renderDropdown(t.navTools, toolsNav)}

          {/* About dropdown */}
          {renderDropdown(t.navAbout, aboutNav)}

          {/* Funding (standalone) */}
          {extraNav.map((n) => (
            <Link key={n.href} href={n.href}
              className={cn(
                "text-[0.8125rem] font-medium no-underline transition-colors whitespace-nowrap relative py-1",
                isActive(n.href) ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}>
              {n.label}
              {isActive(n.href) && <span className="absolute -bottom-[1.125rem] inset-x-0 h-[2px] bg-primary rounded-full" />}
            </Link>
          ))}
        </nav>

        {/* Controls */}
        <div className="flex items-center gap-1.5 ms-auto">
          <Button variant="ghost" size="sm" onClick={toggleCurrency} className="text-xs font-bold h-8 px-3 text-muted-foreground hover:text-foreground font-mono">
            {currency === "EGP" ? "USD" : "EGP"}
          </Button>
          <Button variant="ghost" size="sm" onClick={toggleLang} className="text-xs font-bold h-8 px-3 text-muted-foreground hover:text-foreground">
            {lang === "ar" ? "En" : "ع"}
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8 text-muted-foreground hover:text-foreground">
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8 text-muted-foreground"><Menu size={18} /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 pt-12">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center"><Scale size={12} strokeWidth={2} /></div>
                  {lang === "ar" ? "ميزان" : "Mizan"}
                </SheetTitle>
              </SheetHeader>
              <Separator className="my-3" />
              <nav className="flex flex-col gap-0.5 overflow-y-auto max-h-[calc(100vh-8rem)] pb-6" dir={dir}>
                {/* Home */}
                {directNav.map((n) => (
                  <SheetClose asChild key={n.href}>
                    <Link href={n.href} className={cn("px-3 py-2.5 rounded-lg text-sm font-medium no-underline transition-colors", isActive(n.href) ? "text-primary bg-primary/10" : "text-foreground hover:bg-muted")}>{n.label}</Link>
                  </SheetClose>
                ))}

                {/* Government group */}
                <p className="px-3 pt-3 pb-1 text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-widest">{t.navGovernment}</p>
                {govNav.map((n) => (
                  <SheetClose asChild key={n.href}>
                    <Link href={n.href} className={cn("px-3 py-2.5 rounded-lg text-sm font-medium no-underline transition-colors", isActive(n.href) ? "text-primary bg-primary/10" : "text-foreground hover:bg-muted")}>{n.label}</Link>
                  </SheetClose>
                ))}

                {/* Data group */}
                <p className="px-3 pt-3 pb-1 text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-widest">{t.navData}</p>
                {dataNav.map((n) => (
                  <SheetClose asChild key={n.href}>
                    <Link href={n.href} className={cn("px-3 py-2.5 rounded-lg text-sm font-medium no-underline transition-colors", isActive(n.href) ? "text-primary bg-primary/10" : "text-foreground hover:bg-muted")}>{n.label}</Link>
                  </SheetClose>
                ))}

                {/* Tools group */}
                <p className="px-3 pt-3 pb-1 text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-widest">{t.navTools}</p>
                {toolsNav.map((n) => (
                  <SheetClose asChild key={n.href}>
                    <Link href={n.href} className={cn("px-3 py-2.5 rounded-lg text-sm font-medium no-underline transition-colors", isActive(n.href) ? "text-primary bg-primary/10" : "text-foreground hover:bg-muted")}>{n.label}</Link>
                  </SheetClose>
                ))}

                {/* About group */}
                <p className="px-3 pt-3 pb-1 text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-widest">{t.navAbout}</p>
                {aboutNav.map((n) => (
                  <SheetClose asChild key={n.href}>
                    <Link href={n.href} className={cn("px-3 py-2.5 rounded-lg text-sm font-medium no-underline transition-colors", isActive(n.href) ? "text-primary bg-primary/10" : "text-foreground hover:bg-muted")}>{n.label}</Link>
                  </SheetClose>
                ))}

                {/* Funding */}
                <Separator className="my-2" />
                {extraNav.map((n) => (
                  <SheetClose asChild key={n.href}>
                    <Link href={n.href} className={cn("px-3 py-2.5 rounded-lg text-sm font-medium no-underline transition-colors", isActive(n.href) ? "text-primary bg-primary/10" : "text-foreground hover:bg-muted")}>{n.label}</Link>
                  </SheetClose>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
