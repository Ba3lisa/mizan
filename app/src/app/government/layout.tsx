import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "هيكل الحكومة المصرية | Egyptian Government",
  description:
    "الرئيس ومجلس الوزراء والوزارات والمحافظات — بيانات حية من مصادر رسمية. Egypt's President, Cabinet ministers, governorates, and parliamentary composition — live data from official Egyptian sources.",
  keywords: [
    "egyptian government",
    "egypt cabinet",
    "egyptian minister of finance",
    "egypt prime minister",
    "egypt president",
    "egyptian ministers",
    "مجلس الوزراء المصري",
    "وزير المالية المصري",
    "رئيس الوزراء المصري",
    "الحكومة المصرية",
    "وزارات مصر",
    "مصطفى مدبولي",
    "egypt government structure",
    "egypt executive branch",
    "egypt ministries",
  ],
  alternates: {
    canonical: "https://mizanmasr.com/government",
    languages: {
      "ar-EG": "https://mizanmasr.com/government",
      en: "https://mizanmasr.com/government",
    },
  },
  openGraph: {
    title: "Egyptian Government Structure | هيكل الحكومة المصرية",
    description:
      "Egypt's President, Cabinet ministers, and governorates — live data from official Egyptian sources.",
    url: "https://mizanmasr.com/government",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Egyptian Government Structure | هيكل الحكومة المصرية",
    description:
      "Egypt's President, Cabinet ministers, and governorates — live data from official Egyptian sources.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "GovernmentOrganization",
      "@id": "https://mizanmasr.com/government#cabinet",
      name: "Cabinet of Egypt",
      alternateName: "مجلس وزراء مصر",
      description:
        "The executive branch of the Arab Republic of Egypt, comprising the President, Prime Minister, and Cabinet ministers.",
      url: "https://mizanmasr.com/government",
      sameAs: ["https://www.cabinet.gov.eg"],
      location: {
        "@type": "Place",
        name: "Cairo, Egypt",
        addressCountry: "EG",
      },
      memberOf: {
        "@type": "Country",
        name: "Egypt",
        alternateName: "جمهورية مصر العربية",
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Mizan",
          item: "https://mizanmasr.com",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Government",
          item: "https://mizanmasr.com/government",
        },
      ],
    },
  ],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      {children}
    </>
  );
}
