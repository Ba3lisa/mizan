import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الموازنة العامة المصرية | Egypt Government Budget",
  description:
    "إيرادات ومصروفات الحكومة المصرية، عجز الموازنة، خدمة الدين — بيانات حية من وزارة المالية. Egypt government budget revenue, expenditure, fiscal deficit, and debt service — live Ministry of Finance data.",
  keywords: [
    "egypt budget",
    "egypt government spending",
    "egypt fiscal deficit",
    "egypt ministry of finance budget",
    "egypt revenue expenditure",
    "الموازنة العامة المصرية",
    "إيرادات الحكومة المصرية",
    "مصروفات الحكومة المصرية",
    "عجز الموازنة المصرية",
    "وزارة المالية المصرية",
    "egypt budget 2024",
    "egypt budget 2025",
    "egypt national budget",
    "egypt public finance",
  ],
  alternates: {
    canonical: "https://mizanmasr.com/budget",
    languages: {
      "ar-EG": "https://mizanmasr.com/budget",
      en: "https://mizanmasr.com/budget",
    },
  },
  openGraph: {
    title: "Egypt Government Budget | الموازنة العامة المصرية",
    description:
      "Egypt government revenue, expenditure, and fiscal deficit — live Ministry of Finance data.",
    url: "https://mizanmasr.com/budget",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Egypt Government Budget | الموازنة العامة المصرية",
    description:
      "Egypt budget revenue, expenditure, deficit — live Ministry of Finance data.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Dataset",
      "@id": "https://mizanmasr.com/budget#dataset",
      name: "Egypt Government Budget",
      alternateName: "الموازنة العامة للدولة المصرية",
      description:
        "Annual budget data for the Arab Republic of Egypt, including revenue, expenditure by category, fiscal deficit, and debt service. Data sourced from the Egyptian Ministry of Finance.",
      url: "https://mizanmasr.com/budget",
      keywords: [
        "Egypt budget",
        "Egypt government spending",
        "Egypt fiscal deficit",
        "Egypt revenue",
        "Egypt Ministry of Finance",
      ],
      spatialCoverage: {
        "@type": "Country",
        name: "Egypt",
        sameAs: "https://www.wikidata.org/wiki/Q79",
      },
      creator: {
        "@type": "Organization",
        name: "Mizan",
        url: "https://mizanmasr.com",
      },
      isBasedOn: [
        {
          "@type": "WebPage",
          name: "Egyptian Ministry of Finance",
          url: "https://www.mof.gov.eg",
        },
      ],
      license: "https://creativecommons.org/licenses/by/4.0/",
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
          name: "Budget",
          item: "https://mizanmasr.com/budget",
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
