import type { Metadata } from "next";
import { legislationSchema, breadcrumbSchema } from "@/lib/schema-generators";
import ArticlePageClient from "./client";

export async function generateStaticParams() {
  // Return empty — pages generated on-demand via ISR
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>;
}): Promise<Metadata> {
  const { number } = await params;
  const n = parseInt(number, 10);
  const isValid = !isNaN(n) && n >= 1 && n <= 247;

  if (!isValid) {
    return {
      title: "Article Not Found | Egyptian Constitution",
      description: "This article does not exist in the Egyptian Constitution (2014, amended 2019).",
    };
  }

  return {
    title: `المادة ${n} من الدستور المصري | Article ${n} of the Egyptian Constitution`,
    description: `Article ${n} of the Constitution of the Arab Republic of Egypt (2014, amended 2019). Read the full text in Arabic and English on mizanmasr.com.`,
    openGraph: {
      title: `Article ${n} — Egyptian Constitution`,
      description: `Full text of Article ${n} of the Egyptian Constitution in Arabic and English.`,
      siteName: "Mizan | ميزان",
    },
    alternates: {
      canonical: `https://mizanmasr.com/constitution/article/${n}`,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const n = parseInt(number, 10);

  const jsonLd = legislationSchema({
    articleNumber: isNaN(n) ? 0 : n,
    textEn: `Article ${n} of the Constitution of the Arab Republic of Egypt (2014, amended 2019).`,
    textAr: `المادة ${n} من دستور جمهورية مصر العربية (2014، معدّل 2019).`,
    wasAmended2019: false, // client will hydrate the real value
  });

  const breadcrumb = breadcrumbSchema([
    { name: "Mizan", url: "https://mizanmasr.com" },
    { name: "Constitution | الدستور", url: "https://mizanmasr.com/constitution" },
    {
      name: `Article ${n} | المادة ${n}`,
      url: `https://mizanmasr.com/constitution/article/${n}`,
    },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumb).replace(/</g, "\\u003c"),
        }}
      />
      <ArticlePageClient number={number} />
    </>
  );
}
