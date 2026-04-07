"use node";
// Anthropic Claude provider for the Mizan agentic layer.
// Uses raw fetch (no SDK) for minimal dependencies.

import { extractClaudeText } from "../validators";
import type { LLMProvider, ToolSchema, CouncilEvaluationContext, CouncilVoteResult } from "./types";
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

export async function callClaude(
  prompt: string,
  systemPrompt?: string
): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const body: Record<string, unknown> = {
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  };
  if (systemPrompt) body.system = systemPrompt;

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API failed (${response.status}): ${errorText}`);
  }

  const json: unknown = await response.json();
  return extractClaudeText(json);
}

// ─── STRUCTURED OUTPUT (tool_use) ────────────────────────────────────────────

export async function callClaudeStructured<T>(
  prompt: string,
  schema: ToolSchema,
  systemPrompt?: string,
): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const body: Record<string, unknown> = {
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
    tools: [schema],
    tool_choice: { type: "tool", name: schema.name },
  };
  if (systemPrompt) body.system = systemPrompt;

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[anthropic] Structured call failed (${response.status}): ${errorText}`);
    return null;
  }

  const json = await response.json() as {
    content?: Array<{ type: string; input?: unknown }>;
  };
  const toolUse = json.content?.find((block) => block.type === "tool_use");
  if (!toolUse?.input) {
    console.warn("[anthropic] No tool_use block in structured response.");
    return null;
  }
  return toolUse.input as T;
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
