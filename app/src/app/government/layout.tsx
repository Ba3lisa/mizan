import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "هيكل الحكومة المصرية",
  description: "الرئيس ومجلس الوزراء والوزارات والمحافظات — بيانات حية من مصادر رسمية. President, Cabinet, ministries, and governorates — live data from official sources.",
  openGraph: {
    title: "Egyptian Government Structure | هيكل الحكومة المصرية",
    description: "President, Cabinet, ministries, and governorates — live data from official sources.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
