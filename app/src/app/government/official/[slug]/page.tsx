import type { Metadata } from "next";
import { personSchema, breadcrumbSchema } from "@/lib/schema-generators";
import OfficialPageClient from "./client";

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
    title: `${name} | Egyptian Government Official`,
    description: `Profile of ${name} — Egyptian government official. Live data from official sources on mizanmasr.com.`,
    openGraph: {
      title: `${name} | Egyptian Government`,
      description: `Official profile and role of ${name} in the Egyptian government.`,
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
  const name = slugToName(slug);

  const jsonLd = personSchema({
    nameEn: name,
    nameAr: "",
    titleEn: "Government Official",
    titleAr: "مسؤول حكومي",
    role: "official",
  });

  const breadcrumb = breadcrumbSchema([
    { name: "Mizan", url: "https://mizanmasr.com" },
    { name: "Government", url: "https://mizanmasr.com/government" },
    { name: name, url: `https://mizanmasr.com/government/official/${slug}` },
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
