import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "الشراء أم الإيجار",
  description: "حاسبة تفاعلية: هل الشراء أفضل من الإيجار في مصر؟ Interactive buy vs rent calculator for Egypt.",
  openGraph: { title: "Buy vs Rent Calculator | الشراء أم الإيجار", description: "Is buying better than renting in Egypt?" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
