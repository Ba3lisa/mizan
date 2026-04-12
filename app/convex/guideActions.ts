"use node";

import { Agent, createTool } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { components, internal } from "./_generated/api";
import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { z } from "zod";
import { estimateCost } from "./lib/tokenCost";

// ─── Valid pages and selectors (enum-constrained for LLM reliability) ───────

const VALID_PAGES = [
  "/economy", "/budget", "/debt", "/government", "/parliament",
  "/constitution", "/elections", "/governorate", "/polls",
  "/tools/tax-calculator", "/tools/buy-vs-rent", "/tools/invest", "/tools/mashroaak",
  "/transparency", "/methodology", "/funding",
] as const;

const ALL_SELECTORS = [
  "salary-input", "tax-summary", "tax-chart", "tax-categories",
  "capital", "horizon", "allocation", "output",
  "bvr-basics", "bvr-financing", "verdict", "bvr-breakdown",
  "mashroaak-tabs", "capital-input", "mashroaak-filters", "mashroaak-results",
  "econ-indicators", "gdp-chart", "inflation-chart", "exchange-rate",
  "budget-summary", "budget-deficit", "budget-flow", "budget-comparison",
  "debt-total", "debt-gdp-ratio", "debt-chart", "debt-creditors",
  "president", "cabinet", "governorates-list",
  "party-chart",
  "search", "articles-list",
] as const;

const TOOL_NAMES = [
  "calculate_egypt_tax",
  "simulate_egypt_investment",
  "compare_buy_vs_rent",
  "search_egypt_investment_opportunities",
] as const;

// ─── Tool 1: Navigate (with confirmation) ───────────────────────────────────

const navigate = createTool({
  description: "Propose navigating the user to a page. The frontend shows a confirmation button — the user decides whether to go.",
  inputSchema: z.object({
    href: z.enum(VALID_PAGES).describe("Page to navigate to"),
    reason: z.string().describe("One sentence: why this page is relevant to what the user asked"),
  }),
  execute: async (_ctx, { href, reason }): Promise<string> => {
    return JSON.stringify({ action: "navigate", href, reason });
  },
});

// ─── Tool 2: Highlight (spotlight element on current page) ──────────────────

const highlight = createTool({
  description: "Highlight an element on the CURRENT page with a spotlight overlay and explanation popover. Use this when the user asks about something visible on the page they're already on. Do NOT navigate — just highlight.",
  inputSchema: z.object({
    selector: z.enum(ALL_SELECTORS).describe("The data-guide attribute value of the element to highlight"),
    title: z.string().describe("Short title for the highlight popover"),
    description: z.string().describe("What this element shows or how to use it"),
  }),
  execute: async (_ctx, { selector, title, description }): Promise<string> => {
    return JSON.stringify({
      action: "highlight",
      selector: `[data-guide='${selector}']`,
      title,
      description,
    });
  },
});

// ─── Tool 3: Control Input (set values on tool pages, with Q&A) ─────────────

const controlInput = createTool({
  description: `Set input values on a tool page, or ask the user for missing information first.

When you have the values: set needsInfo=false and provide inputs.
When you need more info: set needsInfo=true and provide a question.

Tool input schemas:
- calculate_egypt_tax: {annualSalary: number}
- simulate_egypt_investment: {capitalEgp: number, strategy: "conservative"|"balanced"|"aggressive"|"fixedIncome"|"egyptianGrowth", horizonYears: number}
- compare_buy_vs_rent: {homePrice: number, monthlyRent: number, years: number}
- search_egypt_investment_opportunities: {maxCapitalEgp: number}`,
  inputSchema: z.object({
    tool: z.enum(TOOL_NAMES).describe("Which tool to control"),
    inputs: z.record(z.unknown()).optional().describe("Input values to set (when needsInfo is false)"),
    needsInfo: z.boolean().describe("true = ask user a question first, false = set values now"),
    question: z.string().optional().describe("Question to ask user (when needsInfo is true)"),
  }),
  execute: async (_ctx, { tool, inputs, needsInfo, question }): Promise<string> => {
    if (needsInfo) {
      return JSON.stringify({ action: "ask", question: question ?? "What value would you like to set?" });
    }
    // Map tool to its page
    const toolPages: Record<string, string> = {
      calculate_egypt_tax: "/tools/tax-calculator",
      simulate_egypt_investment: "/tools/invest",
      compare_buy_vs_rent: "/tools/buy-vs-rent",
      search_egypt_investment_opportunities: "/tools/mashroaak",
    };
    return JSON.stringify({
      action: "control",
      tool,
      inputs: inputs ?? {},
      href: toolPages[tool] ?? "/",
    });
  },
});

// ─── Page context map (selectors + tools per page for system prompt) ─────────

const PAGE_CONTEXT: Record<string, { selectors: string[]; tools: string[] }> = {
  "/tools/tax-calculator": { selectors: ["salary-input", "tax-summary", "tax-chart", "tax-categories"], tools: ["calculate_egypt_tax"] },
  "/tools/invest": { selectors: ["capital", "horizon", "allocation", "output"], tools: ["simulate_egypt_investment"] },
  "/tools/buy-vs-rent": { selectors: ["bvr-basics", "bvr-financing", "verdict", "bvr-breakdown"], tools: ["compare_buy_vs_rent"] },
  "/tools/mashroaak": { selectors: ["mashroaak-tabs", "capital-input", "mashroaak-filters", "mashroaak-results"], tools: ["search_egypt_investment_opportunities"] },
  "/economy": { selectors: ["econ-indicators", "gdp-chart", "inflation-chart", "exchange-rate"], tools: [] },
  "/budget": { selectors: ["budget-summary", "budget-deficit", "budget-flow", "budget-comparison"], tools: [] },
  "/debt": { selectors: ["debt-total", "debt-gdp-ratio", "debt-chart", "debt-creditors"], tools: [] },
  "/government": { selectors: ["president", "cabinet", "governorates-list"], tools: [] },
  "/parliament": { selectors: ["party-chart"], tools: [] },
  "/constitution": { selectors: ["search", "articles-list"], tools: [] },
};

// ─── Agent Definition ───────────────────────────────────────────────────────

export const guideAgent = new Agent(components.agent, {
  name: "mizan-guide",
  languageModel: openai("gpt-4.1-mini"),
  instructions: `You are the Mizan Guide (دليل ميزان). You help users explore Egypt's government transparency platform.

You have 3 tools. You can chain up to 3 in a single response for a smooth guided flow:

1. navigate — Propose going to a different page. Shows a confirmation button.
2. highlight — Spotlight an element on the CURRENT page with driver.js.
3. controlInput — Set values on a calculator, or ask a question (needsInfo=true).

FLOW PATTERNS (follow these exactly):

When user wants to explore a tool (e.g. "I want to invest"):
  Step 1: navigate to the tool page
  Step 2: highlight the main input element
  Step 3: controlInput with needsInfo=true to ask what value they want

When user is already on a tool page and asks to use it:
  Step 1: highlight the relevant input
  Step 2: controlInput with needsInfo=true to ask for the value

When user provides a specific value (e.g. "300000", "1 million"):
  Step 1: controlInput with needsInfo=false and the value
  Step 2: highlight the output/result section

When user asks "what is this?" or about a visible element:
  Step 1: highlight that element

When user asks about a different page:
  Step 1: navigate to that page

Rules:
- ALWAYS call at least one tool. Never respond with only text.
- Keep text to 1 short sentence.
- Respond in the same language the user writes in.`,
  tools: { navigate, highlight, controlInput },
  maxSteps: 3,
  contextOptions: { recentMessages: 20 },
  callSettings: { temperature: 0.3 },
  usageHandler: async (ctx, { usage, model, provider, threadId, userId }) => {
    const inTok = usage?.inputTokens ?? 0;
    const outTok = usage?.outputTokens ?? 0;
    const costUsd = estimateCost(model ?? "gpt-4.1-mini", inTok, outTok);
    await ctx.runMutation(internal.guideAnalytics.logUsage, {
      userId: userId ?? "anonymous",
      threadId: threadId ?? "",
      model: model ?? "gpt-4.1-mini",
      provider: provider ?? "openai",
      promptTokens: inTok,
      completionTokens: outTok,
      totalTokens: usage?.totalTokens ?? 0,
      costUsd,
      timestamp: Date.now(),
    });
  },
});

// ─── Actions ────────────────────────────────────────────────────────────────

export const createThread = action({
  args: {},
  handler: async (ctx) => {
    const { threadId } = await guideAgent.createThread(ctx, { title: "Guide Chat" });
    return threadId;
  },
});

export const generateResponse = internalAction({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
    lang: v.optional(v.string()),
    currentPage: v.optional(v.string()),
  },
  handler: async (ctx, { threadId, promptMessageId, lang, currentPage }) => {
    const { thread } = await guideAgent.continueThread(ctx, { threadId });

    // Build context-aware system message
    const langLine = lang === "ar"
      ? "User language: Arabic. Respond in Arabic."
      : "User language: English. Respond in English.";

    const pageCtx = currentPage ? PAGE_CONTEXT[currentPage] : undefined;
    const pageLine = currentPage
      ? `Current page: ${currentPage}`
      : "Current page: / (home)";
    const selectors = pageCtx?.selectors ?? [];
    const tools = pageCtx?.tools ?? [];
    const selectorsLine = selectors.length > 0
      ? `Available selectors on this page: ${selectors.join(", ")}`
      : "No highlightable selectors on this page.";
    const toolsLine = tools.length > 0
      ? `Available tools on this page: ${tools.join(", ")}`
      : "No controllable tools on this page.";

    const system = `${langLine}\n${pageLine}\n${selectorsLine}\n${toolsLine}`;

    await thread.generateText({
      promptMessageId,
      system,
      toolChoice: "required",
    });
  },
});
