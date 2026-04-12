"use node";
// xAI Grok provider for the Mizan agentic layer.
// Uses raw fetch — xAI chat completions + Responses API for web search.

import type { LLMProvider, LLMCallResult, ToolSchema, ServerToolDef, CouncilEvaluationContext, CouncilVoteResult } from "./types";
import { COUNCIL_SYSTEM_PROMPT, buildCouncilPrompt } from "./councilPrompt";
import { CouncilVoteSchema, zodToToolSchema } from "../schemas";

const COUNCIL_VOTE_TOOL = zodToToolSchema(
  "submit_council_vote",
  "Submit a structured council vote evaluating a proposed data change for the Mizan platform.",
  CouncilVoteSchema,
);

const GROK_MODEL = "grok-4-1-fast-reasoning";
const CHAT_API_URL = "https://api.x.ai/v1/chat/completions";
const RESPONSES_API_URL = "https://api.x.ai/v1/responses";

function getApiKey(): string | null {
  const key = process.env.XAI_API_KEY;
  if (!key) return null;
  return key;
}

// ─── TEXT COMPLETION ─────────────────────────────────────────────────────────

async function callGrok(
  prompt: string,
  systemPrompt?: string
): Promise<string | null> {
  const result = await callGrokWithUsage(prompt, systemPrompt);
  return result.text;
}

async function callGrokWithUsage(
  prompt: string,
  systemPrompt?: string
): Promise<LLMCallResult> {
  const apiKey = getApiKey();
  if (!apiKey) return { text: null, usage: null };

  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const startMs = Date.now();

  const response = await fetch(CHAT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROK_MODEL,
      max_tokens: 4096,
      messages,
    }),
  });

  const durationMs = Date.now() - startMs;

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[xai] API failed (${response.status}): ${errorText}`);
    return { text: null, usage: null };
  }

  const json = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const text = json.choices?.[0]?.message?.content ?? null;
  const inputTokens = json.usage?.prompt_tokens ?? 0;
  const outputTokens = json.usage?.completion_tokens ?? 0;

  return {
    text,
    usage: { inputTokens, outputTokens, model: GROK_MODEL, durationMs },
  };
}

// ─── STRUCTURED OUTPUT (function calling) ────────────────────────────────────

async function callGrokStructured<T>(
  prompt: string,
  schema: ToolSchema,
  systemPrompt?: string,
): Promise<T | null> {
  const { result } = await callGrokStructuredWithUsage<T>(prompt, schema, systemPrompt);
  return result;
}

async function callGrokStructuredWithUsage<T>(
  prompt: string,
  schema: ToolSchema,
  systemPrompt?: string,
): Promise<{ result: T | null; usage: LLMCallResult["usage"] }> {
  const apiKey = getApiKey();
  if (!apiKey) return { result: null, usage: null };

  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const tools = [{
    type: "function" as const,
    function: {
      name: schema.name,
      description: schema.description,
      parameters: schema.input_schema,
    },
  }];

  const startMs = Date.now();

  const response = await fetch(CHAT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROK_MODEL,
      max_tokens: 16384,
      messages,
      tools,
      tool_choice: "required",
    }),
  });

  const durationMs = Date.now() - startMs;

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[xai] Structured call failed (${response.status}): ${errorText}`);
    return { result: null, usage: null };
  }

  const json = await response.json() as {
    choices?: Array<{
      message?: {
        tool_calls?: Array<{ function?: { arguments?: string } }>;
      };
    }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const inputTokens = json.usage?.prompt_tokens ?? 0;
  const outputTokens = json.usage?.completion_tokens ?? 0;
  const usage: LLMCallResult["usage"] = {
    inputTokens,
    outputTokens,
    model: GROK_MODEL,
    durationMs,
  };

  const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) {
    console.warn("[xai] No function call in structured response.");
    return { result: null, usage };
  }

  try {
    return { result: JSON.parse(args) as T, usage };
  } catch {
    console.error("[xai] Failed to parse function call arguments.");
    return { result: null, usage };
  }
}

// ─── SERVER TOOLS (web_search via Responses API) ────────────────────────────

/**
 * Convert Anthropic-style ServerToolDef[] to xAI Responses API tools.
 * Both web_search and web_fetch map to xAI's web_search (which searches + browses).
 */
function toXaiServerTools(serverTools: ServerToolDef[]): Array<Record<string, unknown>> {
  const seen = new Set<string>();
  const result: Array<Record<string, unknown>> = [];

  for (const tool of serverTools) {
    // Map both web_search and web_fetch to xAI's web_search
    const xaiType = tool.name === "web_fetch" || tool.type.startsWith("web_fetch")
      ? "web_search"
      : tool.name === "web_search" || tool.type.startsWith("web_search")
        ? "web_search"
        : tool.name; // pass through unknown tool types

    if (seen.has(xaiType)) continue;
    seen.add(xaiType);

    const xaiTool: Record<string, unknown> = { type: xaiType };
    const filters: Record<string, string[]> = {};
    if (tool.allowed_domains?.length) filters.allowed_domains = tool.allowed_domains;
    if (tool.blocked_domains?.length) filters.excluded_domains = tool.blocked_domains;
    if (Object.keys(filters).length > 0) xaiTool.filters = filters;

    result.push(xaiTool);
  }

  return result;
}

/**
 * Call Grok with server-side tools (web_search) via the Responses API.
 * xAI executes the search server-side — we parse the final text response.
 */
async function callGrokWithServerTools(
  prompt: string,
  serverTools: ServerToolDef[],
  systemPrompt?: string,
): Promise<LLMCallResult & { searchRequests?: number }> {
  const apiKey = getApiKey();
  if (!apiKey) return { text: null, usage: null };

  const input: Array<Record<string, unknown>> = [];
  if (systemPrompt) input.push({ role: "system", content: systemPrompt });
  input.push({ role: "user", content: prompt });

  const startMs = Date.now();

  const response = await fetch(RESPONSES_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROK_MODEL,
      input,
      tools: toXaiServerTools(serverTools),
      store: false,
    }),
  });

  const durationMs = Date.now() - startMs;

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Grok Responses API (server tools) failed (${response.status}): ${errorText}`);
  }

  const json = await response.json() as {
    output?: Array<{
      type?: string;
      role?: string;
      content?: string | Array<{ type?: string; text?: string }>;
    }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      input_tokens?: number;
      output_tokens?: number;
    };
  };

  // Extract text from the output. The Responses API returns an output array
  // with message items. Text can be in content as string or as content blocks.
  let text: string | null = null;
  const outputItems = json.output ?? [];

  for (let i = outputItems.length - 1; i >= 0; i--) {
    const item = outputItems[i];
    if (item.type === "message" || item.role === "assistant") {
      if (typeof item.content === "string") {
        text = item.content;
        break;
      }
      if (Array.isArray(item.content)) {
        const textBlock = item.content.find((b) => b.type === "output_text" || b.type === "text");
        if (textBlock?.text) {
          text = textBlock.text;
          break;
        }
      }
    }
  }

  const inputTokens = json.usage?.prompt_tokens ?? json.usage?.input_tokens ?? 0;
  const outputTokens = json.usage?.completion_tokens ?? json.usage?.output_tokens ?? 0;

  return {
    text,
    usage: { inputTokens, outputTokens, model: GROK_MODEL, durationMs },
    searchRequests: outputItems.filter((i) => i.type === "web_search_call").length || 0,
  };
}

// ─── WEB RESEARCH + STRUCTURED OUTPUT (two-step) ────────────────────────────

/**
 * Two-step: first uses Responses API (web_search) to gather data,
 * then uses chat completions (function calling) to parse into typed schema.
 */
async function callGrokWebResearchStructured<T>(
  researchPrompt: string,
  serverTools: ServerToolDef[],
  schema: ToolSchema,
  parsePrompt?: string,
  systemPrompt?: string,
): Promise<{ result: T | null; usage: LLMCallResult["usage"]; rawResearch: string | null }> {
  // Step 1: Web research via Responses API
  const researchResult = await callGrokWithServerTools(
    researchPrompt,
    serverTools,
    systemPrompt,
  );

  if (!researchResult.text) {
    return { result: null, usage: researchResult.usage, rawResearch: null };
  }

  // Step 2: Structured parsing via chat completions
  const structuredResult = await callGrokStructuredWithUsage<T>(
    parsePrompt
      ? `${parsePrompt}\n\n## RAW RESEARCH DATA:\n${researchResult.text}`
      : `Parse the following research data into the required structured format.\n\n## RAW RESEARCH DATA:\n${researchResult.text}`,
    schema,
    "Extract structured data from the research results. Be precise and thorough.",
  );

  // Combine usage from both calls
  const combinedUsage: LLMCallResult["usage"] = (researchResult.usage && structuredResult.usage)
    ? {
        inputTokens: researchResult.usage.inputTokens + structuredResult.usage.inputTokens,
        outputTokens: researchResult.usage.outputTokens + structuredResult.usage.outputTokens,
        model: researchResult.usage.model,
        durationMs: researchResult.usage.durationMs + structuredResult.usage.durationMs,
      }
    : researchResult.usage ?? structuredResult.usage;

  return {
    result: structuredResult.result,
    usage: combinedUsage,
    rawResearch: researchResult.text,
  };
}

// ─── COUNCIL EVALUATION ─────────────────────────────────────────────────────

async function evaluateDataChange(
  context: CouncilEvaluationContext
): Promise<CouncilVoteResult | null> {
  const result = await callGrokStructured<unknown>(
    buildCouncilPrompt(context),
    COUNCIL_VOTE_TOOL,
    COUNCIL_SYSTEM_PROMPT,
  );
  if (!result) return null;
  const verified = CouncilVoteSchema.safeParse(result);
  if (!verified.success) {
    console.error(
      "[xai/council] Zod validation failed:",
      verified.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
    return null;
  }
  return verified.data;
}

// ─── PROVIDER INTERFACE ─────────────────────────────────────────────────────

export const xaiProvider: LLMProvider = {
  name: "xai",
  callLLM: callGrok,
  callLLMStructured: callGrokStructured,
  evaluateDataChange,
  callLLMWithUsage: callGrokWithUsage,
  callLLMStructuredWithUsage: callGrokStructuredWithUsage,
  supportsServerTools: true,
  callLLMWithServerTools: callGrokWithServerTools,
  callLLMWebResearchStructured: callGrokWebResearchStructured,
};
