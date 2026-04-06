import { generateOgImage, ogSize, ogContentType } from "@/lib/og-image";

export const runtime = "edge";
export const alt = "Egyptian Constitution | Mizan";
export const size = ogSize;
export const contentType = ogContentType;

export default async function OgImage() {
  return generateOgImage({
    title: "Egyptian Constitution",
    titleAr: "الدستور المصري",
    description: "247 articles with 2019 amendments",
  });
}
