"use node";
// Anthropic Claude provider for the Mizan agentic layer.
// Uses raw fetch (no SDK) for minimal dependencies.

import { extractClaudeText } from "../validators";
import type { LLMProvider, LLMCallResult, ToolSchema, CouncilEvaluationContext, CouncilVoteResult } from "./types";
import { COUNCIL_SYSTEM_PROMPT, buildCouncilPrompt, parseCouncilVote } from "./councilPrompt";

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
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
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
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
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

// ─── COUNCIL EVALUATION ─────────────────────────────────────────────────────

export async function evaluateDataChange(
  context: CouncilEvaluationContext
): Promise<CouncilVoteResult | null> {
  const response = await callClaude(buildCouncilPrompt(context), COUNCIL_SYSTEM_PROMPT);
  if (!response) return null;
  return parseCouncilVote(response);
}

// ─── PROVIDER INTERFACE ─────────────────────────────────────────────────────

export const anthropicProvider: LLMProvider = {
  name: "anthropic",
  callLLM: callClaude,
  callLLMStructured: callClaudeStructured,
  evaluateDataChange,
};
