"use client";

import { useEffect } from "react";

/**
 * Registers Mizan tools via the WebMCP (Web Model Context Protocol) API.
 * Chrome 146+ (behind flag) allows AI agents to discover and call these tools
 * instead of scraping the DOM.
 *
 * All tools are read-only — they fetch static/cached text files.
 * No API abuse risk since they hit the same ISR-cached routes the browser does.
 */
export function WebMcpRegistration() {
  useEffect(() => {
    const nav = navigator as Navigator & {
      modelContext?: {
        registerTool: (tool: {
          name: string;
          description: string;
          inputSchema: Record<string, unknown>;
          execute: (params: Record<string, unknown>) => Promise<unknown>;
        }) => void;
      };
    };

    if (!nav.modelContext) return;

    // Tool 1: Get site overview
    nav.modelContext.registerTool({
      name: "get_mizan_overview",
      description:
        "Get a structured overview of Mizan — Egypt's civic transparency platform. Returns site structure, available data categories, and data source list.",
      inputSchema: {
        type: "object",
        properties: {},
      },
      execute: async () => {
        const res = await fetch("/llms.txt");
        return { content: await res.text() };
      },
    });

    // Tool 2: Get full data export
    nav.modelContext.registerTool({
      name: "get_egypt_government_data",
      description:
        "Get complete structured data about the Egyptian government: cabinet ministers, parliament members, budget figures, national debt, economic indicators, election results, and constitution. Data is verified from official sources every 12 hours.",
      inputSchema: {
        type: "object",
        properties: {
          section: {
            type: "string",
            description:
              "Optional: filter to a specific section (government, parliament, budget, debt, economy, elections, constitution). Omit to get all data.",
          },
        },
      },
      execute: async (params) => {
        const res = await fetch("/llms-full.txt");
        const fullText = await res.text();

        const section = params.section as string | undefined;
        if (!section) return { content: fullText };

        // Extract just the requested section
        const sectionHeader = `## ${section.charAt(0).toUpperCase() + section.slice(1)}`;
        const startIdx = fullText.indexOf(sectionHeader);
        if (startIdx === -1) return { content: fullText, note: `Section '${section}' not found, returning full data` };

        const nextSection = fullText.indexOf("\n## ", startIdx + sectionHeader.length);
        const extracted = nextSection === -1
          ? fullText.slice(startIdx)
          : fullText.slice(startIdx, nextSection);

        return { content: extracted };
      },
    });

    // Tool 3: Get data health status
    nav.modelContext.registerTool({
      name: "get_mizan_data_health",
      description:
        "Check the health and freshness of Mizan's data. Shows when each category (government, parliament, budget, debt, economy, elections) was last refreshed and its current status.",
      inputSchema: {
        type: "object",
        properties: {},
      },
      execute: async () => {
        const res = await fetch("/llms-full.txt");
        const fullText = await res.text();

        const healthStart = fullText.indexOf("## Data Health Status");
        if (healthStart === -1) return { content: "Data health section not available" };

        return { content: fullText.slice(healthStart) };
      },
    });
  }, []);

  return null;
}
