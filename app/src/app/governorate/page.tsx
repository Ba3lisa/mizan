"use client";

import { useLanguage } from "@/components/providers";
import { GovernorateTab } from "@/app/government/_components/governorate-tab";

export default function GovernoratePage() {
  const { lang, dir } = useLanguage();
  const isAr = lang === "ar";

  return (
    <div className="page-content" dir={dir}>
      <div className="container-page">
        <div className="mb-8">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">
            {isAr ? "بياناتك المحلية" : "Your Local Data"}
          </p>
          <h1 className="text-3xl md:text-4xl font-black mb-2">
            {isAr ? "محافظتك" : "Your Governorate"}
          </h1>
          <p className="text-muted-foreground text-sm max-w-lg">
            {isAr
              ? "اختر محافظتك لعرض البيانات المحلية — المحافظ، النواب، الإحصاءات الاجتماعية والاقتصادية"
              : "Select your governorate to see local data — governor, MPs, social and economic stats"}
          </p>
        </div>
        <GovernorateTab />
      </div>
    </div>
  );
}
