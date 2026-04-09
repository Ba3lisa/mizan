import type { Metadata } from "next";
import { governorateSchema, breadcrumbSchema } from "@/lib/schema-generators";
import GovernoratePageClient from "./client";

export async function generateStaticParams() {
  // Return empty — pages generated on-demand via ISR
  return [];
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
  const name = slugToName(slug);

  return {
    title: `محافظة ${name} | ${name} Governorate, Egypt`,
    description: `${name} governorate — data on governor, population, capital city, and local statistics. Egypt's government, made visible.`,
    openGraph: {
      title: `${name} Governorate | محافظة ${name}`,
      description: `Official data for ${name} governorate in Egypt — governor, population, capital, and more.`,
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
  const name = slugToName(slug);

  const jsonLd = governorateSchema({
    nameEn: name,
    nameAr: "",
    capitalEn: "",
  });

  const breadcrumb = breadcrumbSchema([
    { name: "Mizan", url: "https://mizanmasr.com" },
    { name: "Governorates | المحافظات", url: "https://mizanmasr.com/governorate" },
    { name: `${name} | محافظة`, url: `https://mizanmasr.com/governorate/${slug}` },
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
      <GovernoratePageClient slug={slug} />
    </>
  );
}
