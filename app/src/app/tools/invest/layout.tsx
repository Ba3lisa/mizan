import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "محاكي الاستثمار",
  description: "محاكي استثمار تفاعلي: أسهم، عقارات، ذهب، شهادات بنكية — أين تستثمر في مصر؟ Investment simulator: stocks, real estate, gold, bank CDs.",
  openGraph: { title: "Investment Simulator | محاكي الاستثمار", description: "Where should you invest in Egypt?" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
