import type { Metadata } from "next";
import { personSchema, breadcrumbSchema } from "@/lib/schema-generators";
import OfficialPageClient from "./client";

export const revalidate = 43200; // 12 hours — matches data refresh cycle

export async function generateStaticParams() {
  return [];
}

// Fetch official data from Convex server-side (no client needed)
async function fetchOfficial(slug: string) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return null;
  try {
    const res = await fetch(`${convexUrl}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "seo:getOfficialBySlug", args: { slug }, format: "json" }),
      next: { revalidate: 43200 },
    });
    const data = await res.json();
    if (data.status === "success" && data.value) return data.value;
    return null;
  } catch {
    return null;
  }
}

function slugToName(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const official = await fetchOfficial(slug);
  const nameEn = official?.nameEn || slugToName(slug);
  const nameAr = official?.nameAr || "";
  const titleEn = official?.titleEn || "Government Official";

  return {
    title: `${nameEn} — ${titleEn}`,
    description: `${nameEn} (${nameAr}) — ${titleEn}. Live data from official Egyptian government sources on mizanmasr.com.`,
    openGraph: {
      title: `${nameEn} | ${nameAr}`,
      description: `${titleEn} of the Arab Republic of Egypt.`,
      siteName: "Mizan | ميزان",
    },
    alternates: {
      canonical: `https://mizanmasr.com/government/official/${slug}`,
    },
  };
}

export default async function OfficialPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const official = await fetchOfficial(slug);
  const nameEn = official?.nameEn || slugToName(slug);
  const nameAr = official?.nameAr || "";
  const titleEn = official?.titleEn || "Government Official";
  const titleAr = official?.titleAr || "مسؤول حكومي";

  const jsonLd = personSchema({
    nameEn,
    nameAr,
    titleEn,
    titleAr,
    role: official?.role || "official",
    sourceUrl: official?.sourceUrl,
  });

  const breadcrumb = breadcrumbSchema([
    { name: "Mizan", url: "https://mizanmasr.com" },
    { name: "Government", url: "https://mizanmasr.com/government" },
    { name: nameEn, url: `https://mizanmasr.com/government/official/${slug}` },
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
      <OfficialPageClient slug={slug} />
    </>
  );
}
