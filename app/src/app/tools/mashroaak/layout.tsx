import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "مشروعك | Mashrou'ak",
  description: "ابحث عن مشروعك الاستثماري في مصر — فرص صناعية، وحدات جاهزة، أراضي، ومناطق حرة من هيئة التنمية الصناعية وهيئة الاستثمار. Find your next investment project in Egypt.",
  openGraph: { title: "Mashrou'ak | مشروعك", description: "Find your next investment project in Egypt — IDA & GAFI opportunities" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
