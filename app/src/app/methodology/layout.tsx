import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "المنهجية",
  description: "كيف نجمع البيانات ونتحقق منها من مصادر رسمية. How we collect and verify data from official sources.",
  openGraph: {
    title: "Methodology | المنهجية",
    description: "How we collect and verify data from official sources.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
