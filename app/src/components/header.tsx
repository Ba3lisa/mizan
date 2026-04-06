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

  const nav = [
    { href: "/", label: t.navHome },
    { href: "/government", label: t.navGovernment },
    { href: "/parliament", label: t.navParliament },
    { href: "/constitution", label: t.navConstitution },
    { href: "/budget", label: t.navBudget },
    { href: "/debt", label: t.navDebt },
    { href: "/transparency", label: t.navTransparency },
  ];

  const moreNav = [
    { href: "/elections", label: t.navElections },
    { href: "/economy", label: t.navEconomy },
    { href: "/governorate", label: t.navGovernorate },
    { href: "/budget/your-share", label: t.navTaxCalculator },
    { href: "/funding", label: t.navFunding },
    { href: "/methodology", label: t.navMethodology },
    { href: "/admin", label: t.navAdmin },
  ];

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

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
        <nav className="hidden lg:flex items-center gap-7 flex-1" dir={dir}>
          {nav.map((n) => (
            <Link key={n.href} href={n.href}
              className={cn(
                "text-[0.8125rem] font-medium no-underline transition-colors whitespace-nowrap relative py-1",
                isActive(n.href)
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}>
              {n.label}
              {isActive(n.href) && (
                <span className="absolute -bottom-[1.125rem] inset-x-0 h-[2px] bg-primary rounded-full" />
              )}
            </Link>
          ))}
          {/* More dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                "text-[0.8125rem] font-medium no-underline transition-colors whitespace-nowrap relative py-1 flex items-center gap-1 cursor-pointer",
                moreNav.some(n => isActive(n.href))
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}>
                {t.navMore} <ChevronDown size={12} />
                {moreNav.some(n => isActive(n.href)) && (
                  <span className="absolute -bottom-[1.125rem] inset-x-0 h-[2px] bg-primary rounded-full" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {moreNav.map((n) => (
                <DropdownMenuItem key={n.href} asChild>
                  <Link href={n.href} className={cn("no-underline w-full", isActive(n.href) && "text-primary")}>
                    {n.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
              <nav className="flex flex-col gap-0.5" dir={dir}>
                {[...nav, ...moreNav].map((n) => (
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
