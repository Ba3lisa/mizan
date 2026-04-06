import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "البرلمان المصري",
  description: "٥٩٦ عضو مجلس نواب، ٣٠٠ عضو مجلس شيوخ، الأحزاب واللجان. 596 House members, 300 Senate members, parties, and committees.",
  openGraph: {
    title: "Egyptian Parliament | البرلمان المصري",
    description: "596 House members, 300 Senate members, parties, and committees.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
