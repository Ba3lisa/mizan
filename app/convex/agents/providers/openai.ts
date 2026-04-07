"use node";
// OpenAI provider for the Mizan agentic layer.
// Uses raw fetch (no SDK) — works with GPT-4o, GPT-4o-mini, etc.

import type { LLMProvider, ToolSchema, CouncilEvaluationContext, CouncilVoteResult } from "./types";
import { COUNCIL_SYSTEM_PROMPT, buildCouncilPrompt, parseCouncilVote } from "./councilPrompt";

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

// ─── COUNCIL EVALUATION ─────────────────────────────────────────────────────

async function evaluateDataChange(
  context: CouncilEvaluationContext
): Promise<CouncilVoteResult | null> {
  const response = await callOpenAI(buildCouncilPrompt(context), COUNCIL_SYSTEM_PROMPT);
  if (!response) return null;
  return parseCouncilVote(response);
}

// ─── PROVIDER INTERFACE ─────────────────────────────────────────────────────

export const openaiProvider: LLMProvider = {
  name: "openai",
  callLLM: callOpenAI,
  callLLMStructured: callOpenAIStructured,
  evaluateDataChange,
};
