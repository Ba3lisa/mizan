import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الوعود الحكومية",
  description: "الوعود والمشاريع الحكومية المصرية — متابعة التنفيذ. Egyptian government promises and megaprojects tracker.",
  openGraph: {
    title: "Government Promises | الوعود الحكومية",
    description: "Egyptian government promises and megaprojects tracker.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
