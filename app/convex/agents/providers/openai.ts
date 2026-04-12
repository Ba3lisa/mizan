"use node";
// OpenAI provider for the Mizan agentic layer.
// Uses raw fetch (no SDK) — works with GPT-4o, GPT-4o-mini, etc.

import type { LLMProvider, LLMCallResult, ToolSchema, _ServerToolDef, CouncilEvaluationContext, CouncilVoteResult } from "./types";
import { COUNCIL_SYSTEM_PROMPT, buildCouncilPrompt } from "./councilPrompt";
import { CouncilVoteSchema, zodToToolSchema } from "../schemas";

const COUNCIL_VOTE_TOOL = zodToToolSchema(
  "submit_council_vote",
  "Submit a structured council vote evaluating a proposed data change for the Mizan platform.",
  CouncilVoteSchema,
);

const OPENAI_MODEL = "gpt-4o-mini";
const API_URL = "https://api.openai.com/v1/chat/completions";

function getApiKey(): string | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return key;
}

// ─── TEXT COMPLETION ─────────────────────────────────────────────────────────

async function callOpenAI(
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
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens: 4096,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[openai] API failed (${response.status}): ${errorText}`);
    return null;
  }

  const json = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content ?? null;
}

// ─── STRUCTURED OUTPUT (function calling) ────────────────────────────────────

async function callOpenAIStructured<T>(
  prompt: string,
  schema: ToolSchema,
  systemPrompt?: string,
): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  // OpenAI function calling
  const tools = [{
    type: "function" as const,
    function: {
      name: schema.name,
      description: schema.description,
      parameters: schema.input_schema,
    },
  }];

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens: 4096,
      messages,
      tools,
      tool_choice: { type: "function", function: { name: schema.name } },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[openai] Structured call failed (${response.status}): ${errorText}`);
    return null;
  }

  const json = await response.json() as {
    choices?: Array<{
      message?: {
        tool_calls?: Array<{ function?: { arguments?: string } }>;
      };
    }>;
  };

  const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) {
    console.warn("[openai] No function call in structured response.");
    return null;
  }

  try {
    return JSON.parse(args) as T;
  } catch {
    console.error("[openai] Failed to parse function call arguments.");
    return null;
  }
}

// ─── WITH-USAGE VARIANTS ────────────────────────────────────────────────────

async function callOpenAIWithUsage(
  prompt: string,
  systemPrompt?: string,
): Promise<LLMCallResult> {
  const apiKey = getApiKey();
  if (!apiKey) return { text: null, usage: null };

  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const startMs = Date.now();

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens: 4096,
      messages,
    }),
  });

  const durationMs = Date.now() - startMs;

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[openai] API failed (${response.status}): ${errorText}`);
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
    usage: { inputTokens, outputTokens, model: OPENAI_MODEL, durationMs },
  };
}

async function callOpenAIStructuredWithUsage<T>(
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

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens: 4096,
      messages,
      tools,
      tool_choice: { type: "function", function: { name: schema.name } },
    }),
  });

  const durationMs = Date.now() - startMs;

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[openai] Structured call failed (${response.status}): ${errorText}`);
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
    model: OPENAI_MODEL,
    durationMs,
  };

  const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) {
    console.warn("[openai] No function call in structured response.");
    return { result: null, usage };
  }

  try {
    return { result: JSON.parse(args) as T, usage };
  } catch {
    console.error("[openai] Failed to parse function call arguments.");
    return { result: null, usage };
  }
}

// ─── COUNCIL EVALUATION ─────────────────────────────────────────────────────

async function evaluateDataChange(
  context: CouncilEvaluationContext
): Promise<CouncilVoteResult | null> {
  const result = await callOpenAIStructured<unknown>(
    buildCouncilPrompt(context),
    COUNCIL_VOTE_TOOL,
    COUNCIL_SYSTEM_PROMPT,
  );
  if (!result) return null;
  const verified = CouncilVoteSchema.safeParse(result);
  if (!verified.success) {
    console.error(
      "[openai/council] Zod validation failed:",
      verified.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
    return null;
  }
  return verified.data;
}

// ─── PROVIDER INTERFACE ─────────────────────────────────────────────────────

export const openaiProvider: LLMProvider = {
  name: "openai",
  callLLM: callOpenAI,
  callLLMStructured: callOpenAIStructured,
  evaluateDataChange,
  callLLMWithUsage: callOpenAIWithUsage,
  callLLMStructuredWithUsage: callOpenAIStructuredWithUsage,
  supportsServerTools: false,
  async callLLMWithServerTools() {
    console.warn("[openai] Server tools (web search) not supported.");
    return { text: null, usage: null };
  },
  async callLLMWebResearchStructured() {
    console.warn("[openai] Web research not supported.");
    return { result: null, usage: null, rawResearch: null };
  },
};
