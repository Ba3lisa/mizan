import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "المؤشرات الاقتصادية المصرية | Egypt Economic Data",
  description:
    "الناتج المحلي الإجمالي لمصر، معدل التضخم، سعر صرف الجنيه المصري، الاحتياطي النقدي — بيانات حية من البنك الدولي وصندوق النقد الدولي. Egypt GDP, inflation rate, USD/EGP exchange rate, and foreign reserves — live World Bank and IMF data.",
  keywords: [
    "egypt gdp",
    "egypt inflation rate",
    "egyptian pound exchange rate",
    "usd to egp",
    "egypt foreign reserves",
    "egypt economic indicators",
    "egypt economy 2024",
    "egypt economy 2025",
    "الناتج المحلي لمصر",
    "معدل التضخم في مصر",
    "سعر الدولار في مصر",
    "الجنيه المصري",
    "الاقتصاد المصري",
    "egypt gdp growth",
    "egypt imf",
    "egypt world bank",
  ],
  alternates: {
    canonical: "https://mizanmasr.com/economy",
    languages: {
      "ar-EG": "https://mizanmasr.com/economy",
      en: "https://mizanmasr.com/economy",
    },
  },
  openGraph: {
    title: "Egypt Economic Indicators | المؤشرات الاقتصادية المصرية",
    description:
      "Egypt GDP, inflation rate, EGP exchange rate, and foreign reserves — live World Bank and IMF data.",
    url: "https://mizanmasr.com/economy",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Egypt Economic Indicators | المؤشرات الاقتصادية المصرية",
    description:
      "Egypt GDP, inflation, exchange rate — live World Bank and IMF data.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Dataset",
      "@id": "https://mizanmasr.com/economy#dataset",
      name: "Egypt Economic Indicators",
      alternateName: "المؤشرات الاقتصادية المصرية",
      description:
        "Key economic indicators for Egypt including GDP, inflation rate, USD/EGP exchange rate, and foreign currency reserves. Data sourced from the World Bank and IMF.",
      url: "https://mizanmasr.com/economy",
      keywords: [
        "Egypt GDP",
        "Egypt inflation",
        "Egyptian pound",
        "EGP exchange rate",
        "Egypt economy",
        "World Bank Egypt",
        "IMF Egypt",
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
          name: "Economy",
          item: "https://mizanmasr.com/economy",
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
