"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useLanguage } from "@/components/providers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CabinetTab } from "./_components/cabinet-tab";
import { ParliamentTab } from "./_components/parliament-tab";

// ─── Inner component (uses useSearchParams inside Suspense) ──────────────────

function GovernmentPageInner() {
  const { t, dir } = useLanguage();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const defaultTab = tabParam === "parliament" ? "parliament" : "cabinet";

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">
            {t.govPage_executiveLegislative}
          </p>
          <h1 className="text-3xl md:text-4xl font-black mb-2">
            {t.navGovernment}
          </h1>
          <p className="text-muted-foreground text-sm max-w-lg">
            {t.govPage_structureDesc}
          </p>
        </div>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-8">
            <TabsTrigger value="cabinet">{t.govPage_cabinet}</TabsTrigger>
            <TabsTrigger value="parliament">{t.navParliament}</TabsTrigger>
          </TabsList>
          <TabsContent value="cabinet">
            <CabinetTab />
          </TabsContent>
          <TabsContent value="parliament">
            <ParliamentTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function GovernmentPage() {
  return (
    <Suspense>
      <GovernmentPageInner />
    </Suspense>
  );
}
