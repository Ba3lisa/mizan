"use client";

import { Monitor } from "lucide-react";
import { useLanguage } from "@/components/providers";

export function DesktopNotice() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  return (
    <div className="md:hidden flex items-center gap-2 px-4 py-2.5 mb-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
      <Monitor size={14} className="flex-shrink-0" />
      <p className="text-[0.65rem] leading-relaxed">
        {isAr
          ? "هذه الأداة تعمل بشكل أفضل على شاشة الكمبيوتر للحصول على تجربة تفاعلية أوضح."
          : "This tool works best on a laptop/desktop screen for cleaner interactivity."}
      </p>
    </div>
  );
}
