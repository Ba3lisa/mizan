import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الانتخابات المصرية",
  description: "نتائج الانتخابات الرئاسية والبرلمانية. Presidential and parliamentary election results.",
  openGraph: {
    title: "Egyptian Elections | الانتخابات المصرية",
    description: "Presidential and parliamentary election results.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
