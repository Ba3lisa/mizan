import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الدين العام المصري",
  description: "الديون الخارجية والمحلية، نسبة الدين للناتج المحلي، الدائنون. External and domestic debt, debt-to-GDP ratio, creditor breakdown.",
  openGraph: {
    title: "Egyptian National Debt | الدين العام المصري",
    description: "External and domestic debt, debt-to-GDP ratio, creditor breakdown.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
