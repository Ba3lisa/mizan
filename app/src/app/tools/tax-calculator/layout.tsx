import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "حاسبة الضريبة",
  description: "حاسبة ضريبة الدخل المصرية — أين تذهب ضرائبك؟ Egyptian income tax calculator.",
  openGraph: { title: "Tax Calculator | حاسبة الضريبة", description: "Where do your taxes go?" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
