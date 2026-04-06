import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://mizanmasr.com";
  const routes = [
    { path: "", priority: 1.0, changeFrequency: "daily" as const },
    { path: "/government", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/parliament", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/constitution", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/budget", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/budget/your-share", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/debt", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/economy", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/elections", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/governorate", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/funding", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/transparency", priority: 0.6, changeFrequency: "daily" as const },
    { path: "/methodology", priority: 0.5, changeFrequency: "monthly" as const },
  ];

  return routes.map((r) => ({
    url: `${base}${r.path}`,
    lastModified: new Date(),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
