import type { Metadata } from "next";
import { legislationSchema, breadcrumbSchema } from "@/lib/schema-generators";
import ArticlePageClient from "./client";

export const revalidate = 43200; // 12 hours

export async function generateStaticParams() {
  return [];
}

async function fetchArticle(num: number) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return null;
  try {
    const res = await fetch(`${convexUrl}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "seo:getArticleByNumber", args: { number: num }, format: "json" }),
      next: { revalidate: 43200 },
    });
    const data = await res.json();
    if (data.status === "success" && data.value) return data.value;
    return null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>;
}): Promise<Metadata> {
  const { number } = await params;
  const n = parseInt(number, 10);
  if (isNaN(n) || n < 1 || n > 247) {
    return { title: "Article Not Found | Egyptian Constitution" };
  }

  const article = await fetchArticle(n);
  const summaryEn = article?.summaryEn || `Article ${n} of the Egyptian Constitution.`;

  return {
    title: `المادة ${n} من الدستور المصري | Article ${n} of the Egyptian Constitution`,
    description: `${summaryEn} Read the full text in Arabic and English on mizanmasr.com.`,
    openGraph: {
      title: `Article ${n} — Egyptian Constitution`,
      description: summaryEn,
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
  const article = await fetchArticle(isNaN(n) ? 0 : n);

  const jsonLd = legislationSchema({
    articleNumber: isNaN(n) ? 0 : n,
    textEn: article?.textEn || `Article ${n} of the Constitution of the Arab Republic of Egypt.`,
    textAr: article?.textAr || `المادة ${n} من دستور جمهورية مصر العربية.`,
    summaryEn: article?.summaryEn,
    wasAmended2019: article?.wasAmended2019 ?? false,
  });

  const breadcrumb = breadcrumbSchema([
    { name: "Mizan", url: "https://mizanmasr.com" },
    { name: "Constitution | الدستور", url: "https://mizanmasr.com/constitution" },
    { name: `Article ${n} | المادة ${n}`, url: `https://mizanmasr.com/constitution/article/${n}` },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, "\\u003c") }} />
      <ArticlePageClient number={number} />
    </>
  );
}
