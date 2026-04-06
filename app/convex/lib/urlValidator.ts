/**
 * URL validation and sanitization utilities for Mizan.
 *
 * All data submitted to Mizan (via GitHub Issues, PRs, or the agent pipeline)
 * must come from trusted sources. This module enforces the allowlist.
 */

const TRUSTED_DOMAINS: Array<RegExp> = [
  /\.gov\.eg$/,
  /\.wikipedia\.org$/,
  /\.worldbank\.org$/,
  /\.imf\.org$/,
  /\.fao\.org$/,
  /\.constituteproject\.org$/,
  /\.cbe\.org\.eg$/,
  /\.ahram\.org\.eg$/,
  /^github\.com$/,
  /\.un\.org$/,
  /\.transparency\.org$/,
  /^open\.er-api\.com$/,
  /^countryeconomy\.com$/,
  /\.exchangerate-api\.com$/,
  /\.tradingeconomics\.com$/,
];

/**
 * Returns true if the URL belongs to a domain on the trusted allowlist.
 * Rejects anything that cannot be parsed as a valid URL.
 */
export function isUrlTrusted(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http/https schemes
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    return TRUSTED_DOMAINS.some((pattern) => pattern.test(hostname));
  } catch {
    return false;
  }
}

/**
 * Classify a source URL into a broad category for audit purposes.
 */
export function classifySource(
  url: string,
): "gov_eg" | "international_org" | "media" | "other" {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.endsWith(".gov.eg")) return "gov_eg";
    if (/worldbank|imf|fao|un\.org|transparency\.org/.test(hostname))
      return "international_org";
    if (/ahram|reuters|bbc|aljazeera|wikipedia/.test(hostname)) return "media";
    return "other";
  } catch {
    return "other";
  }
}

/**
 * Strip HTML tags and decode common entities.
 * Truncates to maxLength (default 10 000 chars) to prevent abuse.
 */
export function sanitizeHtml(text: string, maxLength = 10_000): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
    .slice(0, maxLength);
}
