"use node";
// OpenRouter provider for the Mizan agentic layer.
// Supports any model available on OpenRouter (Llama, Mistral, etc.)
// Uses the OpenAI-compatible API format.

import type { LLMProvider, LLMCallResult, ToolSchema, CouncilEvaluationContext, CouncilVoteResult } from "./types";
import { COUNCIL_SYSTEM_PROMPT, buildCouncilPrompt } from "./councilPrompt";
import { CouncilVoteSchema, zodToToolSchema } from "../schemas";
import { withProviderTimeout } from "./http";

const COUNCIL_VOTE_TOOL = zodToToolSchema(
  "submit_council_vote",
  "Submit a structured council vote evaluating a proposed data change for the Mizan platform.",
  CouncilVoteSchema,
);

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
    ...withProviderTimeout({
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
    ...withProviderTimeout({
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

// ─── WITH-USAGE VARIANTS ────────────────────────────────────────────────────

async function callOpenRouterWithUsage(
  prompt: string,
  systemPrompt?: string,
): Promise<LLMCallResult> {
  const apiKey = getApiKey();
  if (!apiKey) return { text: null, usage: null };

  const model = getModel();
  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const startMs = Date.now();

  const response = await fetch(API_URL, {
    ...withProviderTimeout({
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://mizanmasr.com",
      "X-Title": "Mizan",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages,
    }),
    }),
  });

  const durationMs = Date.now() - startMs;

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[openrouter] API failed (${response.status}): ${errorText}`);
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
    usage: { inputTokens, outputTokens, model, durationMs },
  };
}

async function callOpenRouterStructuredWithUsage<T>(
  prompt: string,
  schema: ToolSchema,
  systemPrompt?: string,
): Promise<{ result: T | null; usage: LLMCallResult["usage"] }> {
  const apiKey = getApiKey();
  if (!apiKey) return { result: null, usage: null };

  const model = getModel();
  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({
    role: "user",
    content: `${prompt}\n\nYou MUST respond with valid JSON matching this schema:\n${JSON.stringify(schema.input_schema, null, 2)}\n\nRespond with ONLY the JSON object, no markdown fences or prose.`,
  });

  const startMs = Date.now();

  const response = await fetch(API_URL, {
    ...withProviderTimeout({
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://mizanmasr.com",
      "X-Title": "Mizan",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages,
    }),
    }),
  });

  const durationMs = Date.now() - startMs;

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[openrouter] Structured call failed (${response.status}): ${errorText}`);
    return { result: null, usage: null };
  }

  const json = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const inputTokens = json.usage?.prompt_tokens ?? 0;
  const outputTokens = json.usage?.completion_tokens ?? 0;
  const usage: LLMCallResult["usage"] = {
    inputTokens,
    outputTokens,
    model,
    durationMs,
  };

  const content = json.choices?.[0]?.message?.content;
  if (!content) return { result: null, usage };

  try {
    const cleaned = content.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();
    return { result: JSON.parse(cleaned) as T, usage };
  } catch {
    console.error("[openrouter] Failed to parse structured response.");
    return { result: null, usage };
  }
}

// ─── COUNCIL EVALUATION ─────────────────────────────────────────────────────

async function evaluateDataChange(
  context: CouncilEvaluationContext
): Promise<CouncilVoteResult | null> {
  const result = await callOpenRouterStructured<unknown>(
    buildCouncilPrompt(context),
    COUNCIL_VOTE_TOOL,
    COUNCIL_SYSTEM_PROMPT,
  );
  if (!result) return null;
  const verified = CouncilVoteSchema.safeParse(result);
  if (!verified.success) {
    console.error(
      "[openrouter/council] Zod validation failed:",
      verified.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
    return null;
  }
  return verified.data;
}

// ─── PROVIDER INTERFACE ─────────────────────────────────────────────────────

export const openrouterProvider: LLMProvider = {
  name: "openrouter",
  callLLM: callOpenRouter,
  callLLMStructured: callOpenRouterStructured,
  evaluateDataChange,
  callLLMWithUsage: callOpenRouterWithUsage,
  callLLMStructuredWithUsage: callOpenRouterStructuredWithUsage,
  supportsServerTools: false,
  async callLLMWithServerTools() {
    console.warn("[openrouter] Server tools (web search) not supported.");
    return { text: null, usage: null };
  },
  async callLLMWebResearchStructured() {
    console.warn("[openrouter] Web research not supported.");
    return { result: null, usage: null, rawResearch: null };
  },
};
