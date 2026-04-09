import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الدين العام المصري | Egypt National Debt",
  description:
    "الديون الخارجية والمحلية لمصر، نسبة الدين للناتج المحلي، الدائنون — بيانات حية من البنك الدولي. Egypt external debt, domestic debt, debt-to-GDP ratio, and creditor breakdown — live World Bank data.",
  keywords: [
    "egypt national debt",
    "egypt external debt",
    "egypt debt to gdp",
    "egypt imf debt",
    "egypt domestic debt",
    "egypt debt 2024",
    "egypt debt 2025",
    "الدين العام المصري",
    "الدين الخارجي لمصر",
    "نسبة الدين للناتج المحلي مصر",
    "مديونية مصر",
    "egypt debt crisis",
    "egypt creditors",
    "egypt world bank debt",
  ],
  alternates: {
    canonical: "https://mizanmasr.com/debt",
    languages: {
      "ar-EG": "https://mizanmasr.com/debt",
      en: "https://mizanmasr.com/debt",
    },
  },
  openGraph: {
    title: "Egypt National Debt | الدين العام المصري",
    description:
      "Egypt external and domestic debt, debt-to-GDP ratio — live World Bank data.",
    url: "https://mizanmasr.com/debt",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Egypt National Debt | الدين العام المصري",
    description:
      "Egypt external debt, domestic debt, debt-to-GDP ratio — live World Bank data.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Dataset",
      "@id": "https://mizanmasr.com/debt#dataset",
      name: "Egypt National Debt",
      alternateName: "الدين العام المصري",
      description:
        "External and domestic debt data for Egypt, including debt-to-GDP ratio, creditor breakdown, and historical trends. Sourced from the World Bank and IMF.",
      url: "https://mizanmasr.com/debt",
      keywords: [
        "Egypt national debt",
        "Egypt external debt",
        "Egypt debt to GDP",
        "Egypt IMF loans",
        "Egypt creditors",
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
          "@type": "Dataset",
          name: "World Bank Open Data",
          url: "https://data.worldbank.org/country/egypt",
        },
        {
          "@type": "Dataset",
          name: "IMF DataMapper",
          url: "https://www.imf.org/external/datamapper",
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
          name: "Debt",
          item: "https://mizanmasr.com/debt",
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
