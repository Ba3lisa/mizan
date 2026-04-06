import { generateOgImage, ogSize, ogContentType } from "@/lib/og-image";

export const runtime = "edge";
export const alt = "National Budget | Mizan";
export const size = ogSize;
export const contentType = ogContentType;

export default function OgImage() {
  return generateOgImage({
    title: "National Budget",
    titleAr: "الموازنة العامة",
    description: "Revenue, expenditure & deficit breakdown",
  });
}
