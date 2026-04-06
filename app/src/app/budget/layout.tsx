import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الموازنة العامة المصرية",
  description: "إيرادات ومصروفات الدولة — تدفق الأموال من الضرائب إلى الإنفاق. State revenue and expenditure — money flow from taxes to spending.",
  openGraph: {
    title: "Egyptian National Budget | الموازنة العامة المصرية",
    description: "State revenue and expenditure — money flow from taxes to spending.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
