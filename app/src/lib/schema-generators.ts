// JSON-LD schema generators for SEO entity pages

export function personSchema(official: {
  nameEn: string;
  nameAr: string;
  titleEn: string;
  titleAr: string;
  role: string;
  sourceUrl?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: official.nameEn,
    alternateName: official.nameAr,
    jobTitle: official.titleEn,
    worksFor: {
      "@type": "GovernmentOrganization",
      name: "Government of Egypt",
      alternateName: "حكومة مصر",
    },
    nationality: { "@type": "Country", name: "Egypt" },
    ...(official.sourceUrl ? { url: official.sourceUrl } : {}),
  };
}

export function legislationSchema(article: {
  articleNumber: number;
  textEn: string;
  textAr: string;
  summaryEn?: string;
  wasAmended2019: boolean;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "LegislationObject",
    name: `Article ${article.articleNumber} of the Egyptian Constitution`,
    alternateName: `المادة ${article.articleNumber} من الدستور المصري`,
    legislationIdentifier: `EGY-CONST-2014-ART-${article.articleNumber}`,
    text: article.textEn,
    inLanguage: ["ar", "en"],
    legislationDate: article.wasAmended2019 ? "2019" : "2014",
    legislationLegalForce: "InForce",
    isPartOf: {
      "@type": "Legislation",
      name: "Constitution of the Arab Republic of Egypt (2014, amended 2019)",
      alternateName: "دستور جمهورية مصر العربية 2014",
    },
  };
}

export function governorateSchema(gov: {
  nameEn: string;
  nameAr: string;
  capitalEn: string;
  population?: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "AdministrativeArea",
    name: gov.nameEn,
    alternateName: gov.nameAr,
    containedInPlace: { "@type": "Country", name: "Egypt" },
    ...(gov.population ? { population: gov.population } : {}),
  };
}

export function faqSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function datasetSchema(dataset: {
  name: string;
  description: string;
  url: string;
  keywords: string[];
  dateModified: string;
  sourceOrganization: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: dataset.name,
    description: dataset.description,
    url: dataset.url,
    keywords: dataset.keywords,
    dateModified: dataset.dateModified,
    creator: {
      "@type": "Organization",
      name: dataset.sourceOrganization,
    },
    license: "https://creativecommons.org/licenses/by/4.0/",
    spatialCoverage: "Egypt",
  };
}

export function breadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
