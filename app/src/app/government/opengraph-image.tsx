import { generateOgImage, ogSize, ogContentType } from "@/lib/og-image";

export const runtime = "edge";
export const alt = "Egyptian Government | Mizan";
export const size = ogSize;
export const contentType = ogContentType;

export default function OgImage() {
  return generateOgImage({
    title: "Egyptian Government",
    titleAr: "الحكومة المصرية",
    description: "President, Cabinet, ministries & governorates",
  });
}
