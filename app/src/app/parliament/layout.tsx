import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "البرلمان المصري | Egyptian Parliament",
  description:
    "مجلس النواب ومجلس الشيوخ المصري — الأحزاب السياسية، اللجان، وتركيبة البرلمان. Egypt's House of Representatives and Senate — party composition, committees, and members.",
  keywords: [
    "egyptian parliament",
    "egypt house of representatives",
    "egypt senate",
    "egypt parliament members",
    "egypt political parties",
    "البرلمان المصري",
    "مجلس النواب المصري",
    "مجلس الشيوخ المصري",
    "أعضاء البرلمان المصري",
    "egypt legislative branch",
    "egypt parliament 2024",
    "egypt parliament composition",
    "egypt majlis",
  ],
  alternates: {
    canonical: "https://mizanmasr.com/government?tab=parliament",
    languages: {
      "ar-EG": "https://mizanmasr.com/government?tab=parliament",
      en: "https://mizanmasr.com/government?tab=parliament",
    },
  },
  openGraph: {
    title: "Egyptian Parliament | البرلمان المصري",
    description:
      "Egypt's House of Representatives and Senate — party composition and member data.",
    url: "https://mizanmasr.com/government?tab=parliament",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Egyptian Parliament | البرلمان المصري",
    description:
      "596 House members, 300 Senate members — parties and committees.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "GovernmentOrganization",
      "@id": "https://mizanmasr.com/government?tab=parliament#parliament",
      name: "Parliament of Egypt",
      alternateName: "البرلمان المصري",
      description:
        "The bicameral legislature of the Arab Republic of Egypt, consisting of the House of Representatives (596 members) and the Senate (300 members).",
      url: "https://www.parliament.gov.eg",
      sameAs: ["https://www.parliament.gov.eg"],
      location: {
        "@type": "Place",
        name: "Cairo, Egypt",
        addressCountry: "EG",
      },
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
          name: "Government",
          item: "https://mizanmasr.com/government",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Parliament",
          item: "https://mizanmasr.com/government?tab=parliament",
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
