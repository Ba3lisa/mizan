import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الدستور المصري ٢٠١٤",
  description: "٢٤٧ مادة دستورية مع تعديلات ٢٠١٩ — نص كامل باللغتين. 247 articles with 2019 amendments — full bilingual text.",
  openGraph: {
    title: "Egyptian Constitution 2014 | الدستور المصري ٢٠١٤",
    description: "247 articles with 2019 amendments — full bilingual text.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
