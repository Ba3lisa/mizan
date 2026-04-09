import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الدستور المصري ٢٠١٤ | Egyptian Constitution 2014",
  description:
    "٢٤٧ مادة دستورية مع تعديلات ٢٠١٩ — نص كامل باللغتين العربية والإنجليزية. Egypt's 2014 Constitution with 2019 amendments — all 247 articles in Arabic and English, fully searchable.",
  keywords: [
    "egyptian constitution",
    "egypt constitution 2014",
    "egypt constitution 2019",
    "egypt constitution articles",
    "دستور مصر 2014",
    "الدستور المصري",
    "مواد الدستور المصري",
    "تعديلات 2019",
    "constitution of egypt",
    "egypt fundamental law",
    "egypt bill of rights",
    "egypt constitutional amendments",
  ],
  alternates: {
    canonical: "https://mizanmasr.com/constitution",
    languages: {
      "ar-EG": "https://mizanmasr.com/constitution",
      en: "https://mizanmasr.com/constitution",
    },
  },
  openGraph: {
    title: "Egyptian Constitution 2014 (Amended 2019) | الدستور المصري",
    description:
      "All 247 articles of Egypt's constitution — Arabic and English, with 2019 amendments highlighted.",
    url: "https://mizanmasr.com/constitution",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Egyptian Constitution 2014 | الدستور المصري ٢٠١٤",
    description:
      "247 articles with 2019 amendments — full bilingual text, fully searchable.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Legislation",
      "@id": "https://mizanmasr.com/constitution#legislation",
      name: "Constitution of the Arab Republic of Egypt (2014, amended 2019)",
      alternateName: "دستور جمهورية مصر العربية 2014",
      description:
        "The Constitution of the Arab Republic of Egypt, enacted in 2014 and amended in 2019, comprising 247 articles across 6 parts.",
      url: "https://mizanmasr.com/constitution",
      inLanguage: ["ar", "en"],
      legislationDate: "2014-01-18",
      legislationLegalForce: "InForce",
      jurisdictionOfApplicability: {
        "@type": "Country",
        name: "Egypt",
        alternateName: "جمهورية مصر العربية",
      },
      author: {
        "@type": "GovernmentOrganization",
        name: "Arab Republic of Egypt",
        alternateName: "جمهورية مصر العربية",
      },
    },
    {
      "@type": "FAQPage",
      "@id": "https://mizanmasr.com/constitution#faq",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is the Egyptian Constitution?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The Egyptian Constitution of 2014 is the fundamental law of the Arab Republic of Egypt. It was approved by referendum on January 14–15, 2014, and contains 247 articles across 6 parts covering state identity, rights, legislative, executive, judicial, and local administration.",
          },
        },
        {
          "@type": "Question",
          name: "When was the Egyptian Constitution amended?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The Egyptian Constitution was amended in 2019 following a referendum held on April 20–22, 2019. The amendments extended the presidential term from 4 to 6 years, established a senate, and made other changes.",
          },
        },
        {
          "@type": "Question",
          name: "How many articles does the Egyptian Constitution have?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The Egyptian Constitution of 2014 contains 247 articles. Of those, a number were amended in 2019.",
          },
        },
        {
          "@type": "Question",
          name: "ما هي المادة الأولى من الدستور المصري؟",
          acceptedAnswer: {
            "@type": "Answer",
            text: "تنص المادة الأولى على أن جمهورية مصر العربية دولة ذات سيادة موحدة لا تقبل التجزئة، ونظامها جمهوري ديمقراطي.",
          },
        },
      ],
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
          name: "Constitution",
          item: "https://mizanmasr.com/constitution",
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
