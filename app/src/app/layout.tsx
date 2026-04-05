import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: {
    default: "ميزان — الحكومة المصرية مرئية",
    template: "%s | ميزان",
  },
  description:
    "منصة شفافية مدنية تتيح الوصول إلى بيانات الحكومة المصرية — الوزارات، البرلمان، الدستور، الميزانية، والديون.",
  keywords: ["مصر", "حكومة", "شفافية", "برلمان", "ميزانية", "Egypt", "government", "transparency"],
  openGraph: {
    title: "ميزان — الحكومة المصرية مرئية",
    description: "Egypt's government, made visible.",
    locale: "ar_EG",
    alternateLocale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;500;600;700;800;900&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,500;0,8..60,600;0,8..60,700;1,8..60,400&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-foreground font-sans min-h-screen antialiased">
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
