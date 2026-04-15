"use node";
// Anthropic Claude provider for the Mizan agentic layer.
// Uses raw fetch (no SDK) for minimal dependencies.

import { extractClaudeText } from "../validators";
import type { LLMProvider, LLMCallResult, ToolSchema, ServerToolDef, CouncilEvaluationContext, CouncilVoteResult } from "./types";
import { COUNCIL_SYSTEM_PROMPT, buildCouncilPrompt } from "./councilPrompt";
import { CouncilVoteSchema, zodToToolSchema } from "../schemas";
import { WEB_RESEARCH_PROVIDER_TIMEOUT_MS, withProviderTimeout } from "./http";

const COUNCIL_VOTE_TOOL = zodToToolSchema(
  "submit_council_vote",
  "Submit a structured council vote evaluating a proposed data change for the Mizan platform.",
  CouncilVoteSchema,
);

const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
const API_URL = "https://api.anthropic.com/v1/messages";

function getApiKey(): string | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.warn("[anthropic] ANTHROPIC_API_KEY not set — skipping.");
    return null;
  }
  return key;
}

// ─── TEXT COMPLETION ─────────────────────────────────────────────────────────

/**
 * Call Claude and return both the text response and usage metadata.
 * Callers in actions should use this to log token usage via ctx.runMutation.
 */
export async function callClaudeWithUsage(
  prompt: string,
  systemPrompt?: string
): Promise<LLMCallResult> {
  const apiKey = getApiKey();
  if (!apiKey) return { text: null, usage: null };

  const body: Record<string, unknown> = {
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  };
  if (systemPrompt) body.system = systemPrompt;

  const startMs = Date.now();

  const response = await fetch(API_URL, {
    ...withProviderTimeout({
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
    }),
  });

  const durationMs = Date.now() - startMs;

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API failed (${response.status}): ${errorText}`);
  }

  const json = await response.json() as {
    content?: Array<{ type: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  const text = extractClaudeText(json);
  const inputTokens = json.usage?.input_tokens ?? 0;
  const outputTokens = json.usage?.output_tokens ?? 0;

  return {
    text,
    usage: {
      inputTokens,
      outputTokens,
      model: CLAUDE_MODEL,
      durationMs,
    },
  };
}

/**
 * Simple text-only wrapper for backward compatibility with the LLMProvider interface.
 */
export async function callClaude(
  prompt: string,
  systemPrompt?: string
): Promise<string | null> {
  const result = await callClaudeWithUsage(prompt, systemPrompt);
  return result.text;
}

// ─── STRUCTURED OUTPUT (tool_use) ────────────────────────────────────────────

/**
 * Call Claude with a tool schema and return structured output plus usage metadata.
 */
export async function callClaudeStructuredWithUsage<T>(
  prompt: string,
  schema: ToolSchema,
  systemPrompt?: string,
): Promise<{ result: T | null; usage: LLMCallResult["usage"] }> {
  const apiKey = getApiKey();
  if (!apiKey) return { result: null, usage: null };

  const body: Record<string, unknown> = {
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
    tools: [schema],
    tool_choice: { type: "tool", name: schema.name },
  };
  if (systemPrompt) body.system = systemPrompt;

  const startMs = Date.now();

  const response = await fetch(API_URL, {
    ...withProviderTimeout({
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
    }),
  });

  const durationMs = Date.now() - startMs;

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[anthropic] Structured call failed (${response.status}): ${errorText}`);
    return { result: null, usage: null };
  }

  const json = await response.json() as {
    content?: Array<{ type: string; input?: unknown }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  const inputTokens = json.usage?.input_tokens ?? 0;
  const outputTokens = json.usage?.output_tokens ?? 0;
  const usage: LLMCallResult["usage"] = {
    inputTokens,
    outputTokens,
    model: CLAUDE_MODEL,
    durationMs,
  };

  const toolUse = json.content?.find((block) => block.type === "tool_use");
  if (!toolUse?.input) {
    console.warn("[anthropic] No tool_use block in structured response.");
    return { result: null, usage };
  }
  return { result: toolUse.input as T, usage };
}

/**
 * Simple structured wrapper for backward compatibility with the LLMProvider interface.
 */
export async function callClaudeStructured<T>(
  prompt: string,
  schema: ToolSchema,
  systemPrompt?: string,
): Promise<T | null> {
  const { result } = await callClaudeStructuredWithUsage<T>(prompt, schema, systemPrompt);
  return result;
}

// ─── SERVER TOOLS (web_search + web_fetch) ─────────────────────────────────


/**
 * Call Claude with server-side tools (web_search, web_fetch).
 * Anthropic executes the tools — we just parse Claude's final text response.
 * Returns the final text plus usage metadata (tokens + search request count).
 */
export async function callClaudeWithServerTools(
  prompt: string,
  serverTools: ServerToolDef[],
  systemPrompt?: string,
): Promise<LLMCallResult & { searchRequests?: number }> {
  const apiKey = getApiKey();
  if (!apiKey) return { text: null, usage: null };

  const body: Record<string, unknown> = {
    model: CLAUDE_MODEL,
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
    tools: serverTools,
  };
  if (systemPrompt) body.system = systemPrompt;

  const startMs = Date.now();

  const response = await fetch(API_URL, {
    ...withProviderTimeout({
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
    }, WEB_RESEARCH_PROVIDER_TIMEOUT_MS),
  });

  const durationMs = Date.now() - startMs;

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API (server tools) failed (${response.status}): ${errorText}`);
  }

  const json = await response.json() as {
    content?: Array<{ type: string; text?: string }>;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      server_tool_use?: { web_search_requests?: number; web_fetch_requests?: number };
    };
  };

  // Extract text blocks from the response. Claude interleaves text with tool
  // results — the final text block typically contains the actual answer/JSON.
  const textBlocks = json.content
    ?.filter((block) => block.type === "text" && block.text)
    .map((block) => block.text!)
    ?? [];
  // Prefer the last text block (the answer) but join all for context
  const text = textBlocks.length > 0 ? textBlocks[textBlocks.length - 1] : null;

  const inputTokens = json.usage?.input_tokens ?? 0;
  const outputTokens = json.usage?.output_tokens ?? 0;
  const searchRequests = json.usage?.server_tool_use?.web_search_requests ?? 0;

  return {
    text,
    usage: { inputTokens, outputTokens, model: CLAUDE_MODEL, durationMs },
    searchRequests,
  };
}

// ─── COUNCIL EVALUATION ─────────────────────────────────────────────────────

export async function evaluateDataChange(
  context: CouncilEvaluationContext
): Promise<CouncilVoteResult | null> {
  const { result } = await callClaudeStructuredWithUsage<unknown>(
    buildCouncilPrompt(context),
    COUNCIL_VOTE_TOOL,
    COUNCIL_SYSTEM_PROMPT,
  );
  if (!result) return null;
  const verified = CouncilVoteSchema.safeParse(result);
  if (!verified.success) {
    console.error(
      "[anthropic/council] Zod validation failed:",
      verified.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
    return null;
  }
  return verified.data;
}

// ─── WEB RESEARCH + STRUCTURED OUTPUT (two-step) ────────────────────────────

/**
 * Two-step call: first uses server tools (web_search/web_fetch) to gather data,
 * then uses structured output (tool_use) to parse the results into a typed schema.
 * This avoids JSON parsing failures from free-form Claude responses.
 */
export async function callClaudeWebResearchStructured<T>(
  researchPrompt: string,
  serverTools: ServerToolDef[],
  schema: ToolSchema,
  parsePrompt?: string,
  systemPrompt?: string,
): Promise<{ result: T | null; usage: LLMCallResult["usage"]; rawResearch: string | null }> {
  // Step 1: Web research with server tools
  const researchResult = await callClaudeWithServerTools(
    researchPrompt,
    serverTools,
    systemPrompt,
  );

  if (!researchResult.text) {
    return { result: null, usage: researchResult.usage, rawResearch: null };
  }

  // Step 2: Structured parsing of the research results
  const structuredResult = await callClaudeStructuredWithUsage<T>(
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

// ─── PROVIDER INTERFACE ─────────────────────────────────────────────────────

export const anthropicProvider: LLMProvider = {
  name: "anthropic",
  callLLM: callClaude,
  callLLMStructured: callClaudeStructured,
  evaluateDataChange,
  callLLMWithUsage: callClaudeWithUsage,
  callLLMStructuredWithUsage: callClaudeStructuredWithUsage,
  supportsServerTools: true,
  callLLMWithServerTools: callClaudeWithServerTools,
  callLLMWebResearchStructured: callClaudeWebResearchStructured,
};
