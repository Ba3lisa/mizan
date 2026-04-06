import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { WebMcpRegistration } from "@/components/web-mcp";

export const metadata: Metadata = {
  metadataBase: new URL("https://mizanmasr.com"),
  title: {
    default: "ميزان — Egypt, visualized.",
    template: "%s | ميزان",
  },
  description:
    "منصة شفافية مدنية تتيح الوصول إلى بيانات الحكومة المصرية — الوزارات، البرلمان، الدستور، الميزانية، والديون. Civic transparency platform for Egyptian government data.",
  keywords: [
    "مصر", "حكومة", "شفافية", "برلمان", "ميزانية", "دستور", "ديون", "انتخابات",
    "Egypt", "government", "transparency", "parliament", "budget", "constitution", "debt", "elections",
    "Egyptian government data", "open data Egypt", "ميزان",
  ],
  icons: {
    icon: "/icon.svg",
  },
  alternates: {
    canonical: "https://mizanmasr.com",
    languages: {
      "ar-EG": "https://mizanmasr.com",
      "en": "https://mizanmasr.com",
    },
  },
  openGraph: {
    title: "ميزان — Egypt, visualized.",
    description: "Egypt, visualized.",
    url: "https://mizanmasr.com",
    siteName: "Mizan - ميزان",
    locale: "ar_EG",
    alternateLocale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ميزان — Egypt, visualized.",
    description: "Civic transparency platform for Egyptian government data.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "Mizan",
      alternateName: "ميزان",
      url: "https://mizanmasr.com",
      inLanguage: ["ar", "en"],
      description: "Civic transparency platform for Egyptian government data.",
      publisher: { "@id": "https://mizanmasr.com/#org" },
    },
    {
      "@type": "Organization",
      "@id": "https://mizanmasr.com/#org",
      name: "Mizan",
      alternateName: "ميزان",
      url: "https://mizanmasr.com",
      sameAs: ["https://github.com/Ba3lisa/mizan"],
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              var t = localStorage.getItem('mizan-theme');
              if (t) document.documentElement.setAttribute('data-theme', t);
              var l = localStorage.getItem('mizan-lang');
              if (l === 'en') { document.documentElement.setAttribute('dir','ltr'); document.documentElement.setAttribute('lang','en'); }
            } catch(e){}
          })();
        `}} />
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
          <WebMcpRegistration />
        </Providers>
      </body>

      {/* Google Analytics */}
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-KE34HVBNM3" strategy="afterInteractive" />
      <Script id="gtag-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-KE34HVBNM3');
      `}</Script>

      {/* MS Clarity */}
      <Script id="ms-clarity" strategy="afterInteractive">{`
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "w78y7o2558");
      `}</Script>
    </html>
  );
}
