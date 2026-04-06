import { generateOgImage, ogSize, ogContentType } from "@/lib/og-image";

export const runtime = "edge";
export const alt = "Egyptian Parliament | Mizan";
export const size = ogSize;
export const contentType = ogContentType;

export default async function OgImage() {
  return generateOgImage({
    title: "Egyptian Parliament",
    titleAr: "البرلمان المصري",
    description: "596 House members, 300 Senate, parties & committees",
  });
}
