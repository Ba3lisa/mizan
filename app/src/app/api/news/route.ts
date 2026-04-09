import { NextResponse } from "next/server";

// Egyptian news RSS feeds — accessible from any server, no API key needed
// egyptOnly: false means we filter for Egypt-related headlines
const RSS_FEEDS = [
  // Egyptian outlets (all content is Egypt-related)
  { url: "https://www.dailynewsegypt.com/feed/", language: "English", domain: "dailynewsegypt.com", egyptOnly: true },
  { url: "https://egyptindependent.com/feed/", language: "English", domain: "egyptindependent.com", egyptOnly: true },
  // Regional / international (filter for Egypt mentions)
  { url: "https://www.al-monitor.com/rss", language: "English", domain: "al-monitor.com", egyptOnly: false },
  { url: "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml", language: "English", domain: "bbc.co.uk", egyptOnly: false },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/MiddleEast.xml", language: "English", domain: "nytimes.com", egyptOnly: false },
];

interface ParsedArticle {
  title: string;
  url: string;
  sourceDomain: string;
  language: string;
  publishedAt: number;
}

async function parseRssFeed(
  feedUrl: string,
  language: string,
  domain: string,
  egyptOnly: boolean,
): Promise<ParsedArticle[]> {
  try {
    const res = await fetch(feedUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mizan/1.0 (https://mizanmasr.com)" },
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const articles: ParsedArticle[] = [];

    // Simple XML parsing without external dependencies
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && articles.length < 15) {
      const itemXml = match[1];
      const title = extractTag(itemXml, "title");
      const link = extractTag(itemXml, "link");
      const pubDate = extractTag(itemXml, "pubDate");

      if (title && link) {
        // Filter for Egypt-related content from non-Egyptian outlets
        if (!egyptOnly && !isEgyptRelated(title)) continue;

        articles.push({
          title: decodeEntities(title),
          url: link,
          sourceDomain: domain,
          language,
          publishedAt: pubDate ? new Date(pubDate).getTime() : Date.now(),
        });
      }
    }

    return articles;
  } catch {
    return [];
  }
}

function extractTag(xml: string, tag: string): string | null {
  // Handle CDATA: <title><![CDATA[...]]></title>
  const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`);
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  // Handle plain text: <title>...</title>
  const plainRegex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
  const plainMatch = xml.match(plainRegex);
  if (plainMatch) return plainMatch[1].trim();

  return null;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "\u2019")
    .replace(/&#8216;/g, "\u2018")
    .replace(/&#8220;/g, "\u201C")
    .replace(/&#8221;/g, "\u201D");
}

function isEgyptRelated(title: string): boolean {
  const keywords = /egypt|cairo|suez|sinai|nile|sisi|madbouly|egp|egyptian|giza|alexandria|aswan|luxor|sharm|hurghada/i;
  return keywords.test(title);
}

export async function GET() {
  try {
    const results = await Promise.allSettled(
      RSS_FEEDS.map((feed) => parseRssFeed(feed.url, feed.language, feed.domain, feed.egyptOnly))
    );

    const articles = results
      .filter((r): r is PromiseFulfilledResult<ParsedArticle[]> => r.status === "fulfilled")
      .flatMap((r) => r.value)
      .sort((a, b) => b.publishedAt - a.publishedAt);

    return NextResponse.json(
      { articles },
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
