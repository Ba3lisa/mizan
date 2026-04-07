"use node";
// OpenRouter provider for the Mizan agentic layer.
// Supports any model available on OpenRouter (Llama, Mistral, etc.)
// Uses the OpenAI-compatible API format.

import type { LLMProvider, ToolSchema, CouncilEvaluationContext, CouncilVoteResult } from "./types";
import { COUNCIL_SYSTEM_PROMPT, buildCouncilPrompt, parseCouncilVote } from "./councilPrompt";

// Default to a capable open model; override with OPENROUTER_MODEL env var
const DEFAULT_MODEL = "meta-llama/llama-4-scout";
const API_URL = "https://openrouter.ai/api/v1/chat/completions";

function getApiKey(): string | null {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  return key;
}

function getModel(): string {
  return process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
}

// ─── TEXT COMPLETION ─────────────────────────────────────────────────────────

async function callOpenRouter(
  prompt: string,
  systemPrompt?: string
): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://mizanmasr.com",
      "X-Title": "Mizan",
    },
    body: JSON.stringify({
      model: getModel(),
      max_tokens: 4096,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[openrouter] API failed (${response.status}): ${errorText}`);
    return null;
  }

  const json = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content ?? null;
}

// ─── STRUCTURED OUTPUT ───────────────────────────────────────────────────────

async function callOpenRouterStructured<T>(
  prompt: string,
  schema: ToolSchema,
  systemPrompt?: string,
): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  // For models that don't support function calling, embed the schema in the prompt
  messages.push({
    role: "user",
    content: `${prompt}\n\nYou MUST respond with valid JSON matching this schema:\n${JSON.stringify(schema.input_schema, null, 2)}\n\nRespond with ONLY the JSON object, no markdown fences or prose.`,
  });

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://mizanmasr.com",
      "X-Title": "Mizan",
    },
    body: JSON.stringify({
      model: getModel(),
      max_tokens: 4096,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[openrouter] Structured call failed (${response.status}): ${errorText}`);
    return null;
  }

  const json = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    // Strip markdown fences if present
    const cleaned = content.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    console.error("[openrouter] Failed to parse structured response.");
    return null;
  }
}

// ─── COUNCIL EVALUATION ─────────────────────────────────────────────────────

async function evaluateDataChange(
  context: CouncilEvaluationContext
): Promise<CouncilVoteResult | null> {
  const response = await callOpenRouter(buildCouncilPrompt(context), COUNCIL_SYSTEM_PROMPT);
  if (!response) return null;
  return parseCouncilVote(response);
}

// ─── PROVIDER INTERFACE ─────────────────────────────────────────────────────

export const openrouterProvider: LLMProvider = {
  name: "openrouter",
  callLLM: callOpenRouter,
  callLLMStructured: callOpenRouterStructured,
  evaluateDataChange,
};
