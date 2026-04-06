"use node";
import { internalAction } from "./_generated/server";

export const testAhram = internalAction({
  args: {},
  handler: async () => {
    const url = "https://english.ahram.org.eg/News/562168.aspx";
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      console.log(`Status: ${res.status}`);
      const html = await res.text();
      console.log(`HTML length: ${html.length}`);
      const marker = html.indexOf("ContentPlaceHolder1_hd");
      console.log(`Marker at: ${marker}`);
      if (marker > 0) {
        const text = html.slice(marker, marker + 500).replace(/<[^>]+>/g, " ").trim();
        console.log(`Text: ${text.slice(0, 200)}`);
      }
      return { status: res.status, length: html.length, hasMarker: marker > 0 };
    } catch (err) {
      console.error(`Error: ${err}`);
      return { error: String(err) };
    }
  },
});
