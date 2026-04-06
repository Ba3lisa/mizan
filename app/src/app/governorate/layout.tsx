import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "محافظتك",
  description: "بيانات المحافظات المصرية — المحافظ، النواب، الإحصائيات. Egyptian governorate data — governor, MPs, local statistics.",
  openGraph: {
    title: "Your Governorate | محافظتك",
    description: "Egyptian governorate data — governor, MPs, local statistics.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
