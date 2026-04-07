import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "أدوات مالية",
  description: "أدوات مالية تفاعلية — حاسبة الشراء أم الإيجار، محاكي الاستثمار، حاسبة الضريبة. Interactive financial tools for Egyptian citizens.",
  openGraph: {
    title: "Financial Tools | أدوات مالية",
    description: "Interactive financial calculators for Egyptian citizens.",
  },
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
