import type { Metadata } from "next";
import { governorateSchema, breadcrumbSchema } from "@/lib/schema-generators";
import GovernoratePageClient from "./client";

export const revalidate = 43200; // 12 hours

export async function generateStaticParams() {
  return [];
}

async function fetchGovernorate(slug: string) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return null;
  try {
    const res = await fetch(`${convexUrl}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "seo:getGovernorateBySlug", args: { slug }, format: "json" }),
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
  const gov = await fetchGovernorate(slug);
  const nameEn = gov?.nameEn || slugToName(slug);
  const nameAr = gov?.nameAr || "";
  const capitalEn = gov?.capitalEn || "";
  const pop = gov?.population ? `${(gov.population / 1_000_000).toFixed(1)}M` : "";

  return {
    title: `محافظة ${nameAr || nameEn} | ${nameEn} Governorate, Egypt`,
    description: `${nameEn} (${nameAr}) governorate — capital: ${capitalEn}${pop ? `, population: ${pop}` : ""}. Official data from mizanmasr.com.`,
    openGraph: {
      title: `${nameEn} Governorate | محافظة ${nameAr || nameEn}`,
      description: `Official data for ${nameEn} governorate in Egypt.`,
      siteName: "Mizan | ميزان",
    },
    alternates: {
      canonical: `https://mizanmasr.com/governorate/${slug}`,
    },
  };
}

export default async function GovernoratePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const gov = await fetchGovernorate(slug);
  const nameEn = gov?.nameEn || slugToName(slug);
  const nameAr = gov?.nameAr || "";
  const capitalEn = gov?.capitalEn || "";

  const jsonLd = governorateSchema({
    nameEn,
    nameAr,
    capitalEn,
    population: gov?.population,
  });

  const breadcrumb = breadcrumbSchema([
    { name: "Mizan", url: "https://mizanmasr.com" },
    { name: "Governorates | المحافظات", url: "https://mizanmasr.com/governorate" },
    { name: `${nameEn} | محافظة ${nameAr}`, url: `https://mizanmasr.com/governorate/${slug}` },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, "\\u003c") }} />
      <GovernoratePageClient slug={slug} />
    </>
  );
}
