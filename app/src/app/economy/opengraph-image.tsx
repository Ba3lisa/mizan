import { generateOgImage, ogSize, ogContentType } from "@/lib/og-image";

export const runtime = "edge";
export const alt = "Economic Indicators | Mizan";
export const size = ogSize;
export const contentType = ogContentType;

export default function OgImage() {
  return generateOgImage({
    title: "Economic Indicators",
    titleAr: "المؤشرات الاقتصادية",
    description: "GDP, inflation, exchange rate & reserves",
  });
}
