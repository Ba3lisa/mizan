import { generateOgImage, ogSize, ogContentType } from "@/lib/og-image";

export const runtime = "edge";
export const alt = "Elections | Mizan";
export const size = ogSize;
export const contentType = ogContentType;

export default async function OgImage() {
  return generateOgImage({
    title: "Elections",
    titleAr: "الانتخابات",
    description: "Presidential & parliamentary results",
  });
}
