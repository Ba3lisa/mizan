import { generateOgImage, ogSize, ogContentType } from "@/lib/og-image";

export const runtime = "edge";
export const alt = "Transparency | Mizan";
export const size = ogSize;
export const contentType = ogContentType;

export default async function OgImage() {
  return generateOgImage({
    title: "Transparency",
    titleAr: "الشفافية",
    description: "AI audit log & data refresh history",
  });
}
