import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الشفافية وسجل البيانات",
  description: "سجل كامل لتحديثات البيانات وقرارات وكلاء الذكاء الاصطناعي. Full audit log of data updates and AI agent decisions.",
  openGraph: {
    title: "Transparency & Data Audit | الشفافية وسجل البيانات",
    description: "Full audit log of data updates and AI agent decisions.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
