import { NextResponse } from "next/server";

const GDELT_BASE = "https://api.gdeltproject.org/api/v2/doc/doc";

interface GdeltArticle {
  url?: string;
  title?: string;
  seendate?: string;
  socialimage?: string;
  domain?: string;
  language?: string;
}

/** Parse GDELT seendate "20260409T043000Z" → epoch ms */
function parseGdeltDate(seendate?: string): number {
  if (!seendate) return Date.now();
  const s = seendate;
  if (s.length >= 15) {
    const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}Z`;
    const ts = new Date(iso).getTime();
    if (!isNaN(ts)) return ts;
  }
  return Date.now();
}

async function fetchGdelt(query: string) {
  const params = new URLSearchParams({
    query,
    mode: "ArtList",
    maxrecords: "20",
    timespan: "72h",
    format: "json",
    sort: "DateDesc",
  });

  const res = await fetch(`${GDELT_BASE}?${params}`, {
    signal: AbortSignal.timeout(10000),
    headers: { "User-Agent": "Mizan/1.0 (https://mizanmasr.com)" },
  });

  if (!res.ok) return [];

  const data = (await res.json()) as { articles?: GdeltArticle[] };
  if (!data.articles) return [];

  return data.articles
    .filter((a): a is GdeltArticle & { url: string; title: string; domain: string } =>
      Boolean(a.url && a.title && a.domain)
    )
    .map((a) => ({
      title: a.title,
      url: a.url,
      sourceDomain: a.domain,
      language: a.language ?? "Unknown",
      publishedAt: parseGdeltDate(a.seendate),
      imageUrl: a.socialimage || undefined,
    }));
}

export async function GET() {
  try {
    const [enResult, arResult] = await Promise.allSettled([
      fetchGdelt("sourcecountry:EG sourcelang:eng"),
      fetchGdelt("sourcecountry:EG sourcelang:ara"),
    ]);

    const en = enResult.status === "fulfilled" ? enResult.value : [];
    const ar = arResult.status === "fulfilled" ? arResult.value : [];

    return NextResponse.json(
      { articles: [...en, ...ar] },
      {
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
        },
      }
    );
  } catch {
    return NextResponse.json({ articles: [] }, { status: 500 });
  }
}
