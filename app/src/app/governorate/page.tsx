"use client";

import { useLanguage } from "@/components/providers";
import { GovernorateTab } from "@/app/government/_components/governorate-tab";

export default function GovernoratePage() {
  const { t, dir } = useLanguage();

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page">
        <div className="mb-8">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">
            {t.governoratePage_yourLocalData}
          </p>
          <h1 className="text-3xl md:text-4xl font-black mb-2">
            {t.navGovernorate}
          </h1>
          <p className="text-muted-foreground text-sm max-w-lg">
            {t.governoratePage_selectDesc}
          </p>
        </div>
        <GovernorateTab />
      </div>
    </div>
  );
}
