import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "المؤشرات الاقتصادية المصرية",
  description: "الناتج المحلي، التضخم، سعر الصرف، الاحتياطي النقدي. GDP, inflation, exchange rate, foreign reserves.",
  openGraph: {
    title: "Egyptian Economic Indicators | المؤشرات الاقتصادية المصرية",
    description: "GDP, inflation, exchange rate, foreign reserves.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
