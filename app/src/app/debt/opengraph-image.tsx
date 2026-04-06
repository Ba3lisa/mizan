import { generateOgImage, ogSize, ogContentType } from "@/lib/og-image";

export const runtime = "edge";
export const alt = "National Debt | Mizan";
export const size = ogSize;
export const contentType = ogContentType;

export default async function OgImage() {
  return generateOgImage({
    title: "National Debt",
    titleAr: "الدين العام",
    description: "External debt, creditors & debt-to-GDP",
  });
}
