"use node";
// Google Gemini provider for the Mizan agentic layer.
// Uses raw fetch against the Gemini REST API (no SDK).

import type { LLMProvider, LLMCallResult, ToolSchema, CouncilEvaluationContext, CouncilVoteResult } from "./types";
import { COUNCIL_SYSTEM_PROMPT, buildCouncilPrompt } from "./councilPrompt";
import { CouncilVoteSchema, zodToToolSchema } from "../schemas";
import { withProviderTimeout } from "./http";

const COUNCIL_VOTE_TOOL = zodToToolSchema(
  "submit_council_vote",
  "Submit a structured council vote evaluating a proposed data change for the Mizan platform.",
  CouncilVoteSchema,
);

const GEMINI_MODEL = "gemini-2.0-flash";

function getApiKey(): string | null {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) return null;
  return key;
}

function apiUrl(model: string, method: string, apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:${method}?key=${apiKey}`;
}

// ─── TEXT COMPLETION ─────────────────────────────────────────────────────────

async function callGemini(
  prompt: string,
  systemPrompt?: string
): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 4096 },
  };
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  const response = await fetch(apiUrl(GEMINI_MODEL, "generateContent", apiKey), {
    ...withProviderTimeout({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[google] API failed (${response.status}): ${errorText}`);
    return null;
  }

  const json = await response.json() as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

// ─── STRUCTURED OUTPUT (function calling) ────────────────────────────────────

async function callGeminiStructured<T>(
  prompt: string,
  schema: ToolSchema,
  systemPrompt?: string,
): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 4096 },
    tools: [{
      functionDeclarations: [{
        name: schema.name,
        description: schema.description,
        parameters: schema.input_schema,
      }],
    }],
    toolConfig: {
      functionCallingConfig: { mode: "ANY", allowedFunctionNames: [schema.name] },
    },
  };
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  const response = await fetch(apiUrl(GEMINI_MODEL, "generateContent", apiKey), {
    ...withProviderTimeout({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[google] Structured call failed (${response.status}): ${errorText}`);
    return null;
  }

  const json = await response.json() as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ functionCall?: { args?: unknown } }>;
      };
    }>;
  };

  const fnCall = json.candidates?.[0]?.content?.parts?.find(
    (p) => p.functionCall
  )?.functionCall;
  if (!fnCall?.args) {
    console.warn("[google] No function call in structured response.");
    return null;
  }
  return fnCall.args as T;
}

// ─── WITH-USAGE VARIANTS ────────────────────────────────────────────────────

async function callGeminiWithUsage(
  prompt: string,
  systemPrompt?: string,
): Promise<LLMCallResult> {
  const apiKey = getApiKey();
  if (!apiKey) return { text: null, usage: null };

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 4096 },
  };
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  const startMs = Date.now();

  const response = await fetch(apiUrl(GEMINI_MODEL, "generateContent", apiKey), {
    ...withProviderTimeout({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    }),
  });

  const durationMs = Date.now() - startMs;

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[google] API failed (${response.status}): ${errorText}`);
    return { text: null, usage: null };
  }

  const json = await response.json() as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };

  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  const inputTokens = json.usageMetadata?.promptTokenCount ?? 0;
  const outputTokens = json.usageMetadata?.candidatesTokenCount ?? 0;

  return {
    text,
    usage: { inputTokens, outputTokens, model: GEMINI_MODEL, durationMs },
  };
}

async function callGeminiStructuredWithUsage<T>(
  prompt: string,
  schema: ToolSchema,
  systemPrompt?: string,
): Promise<{ result: T | null; usage: LLMCallResult["usage"] }> {
  const apiKey = getApiKey();
  if (!apiKey) return { result: null, usage: null };

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 4096 },
    tools: [{
      functionDeclarations: [{
        name: schema.name,
        description: schema.description,
        parameters: schema.input_schema,
      }],
    }],
    toolConfig: {
      functionCallingConfig: { mode: "ANY", allowedFunctionNames: [schema.name] },
    },
  };
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  const startMs = Date.now();

  const response = await fetch(apiUrl(GEMINI_MODEL, "generateContent", apiKey), {
    ...withProviderTimeout({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    }),
  });

  const durationMs = Date.now() - startMs;

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[google] Structured call failed (${response.status}): ${errorText}`);
    return { result: null, usage: null };
  }

  const json = await response.json() as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ functionCall?: { args?: unknown } }>;
      };
    }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };

  const inputTokens = json.usageMetadata?.promptTokenCount ?? 0;
  const outputTokens = json.usageMetadata?.candidatesTokenCount ?? 0;
  const usage: LLMCallResult["usage"] = {
    inputTokens,
    outputTokens,
    model: GEMINI_MODEL,
    durationMs,
  };

  const fnCall = json.candidates?.[0]?.content?.parts?.find(
    (p) => p.functionCall
  )?.functionCall;
  if (!fnCall?.args) {
    console.warn("[google] No function call in structured response.");
    return { result: null, usage };
  }
  return { result: fnCall.args as T, usage };
}

// ─── COUNCIL EVALUATION ─────────────────────────────────────────────────────

async function evaluateDataChange(
  context: CouncilEvaluationContext
): Promise<CouncilVoteResult | null> {
  const result = await callGeminiStructured<unknown>(
    buildCouncilPrompt(context),
    COUNCIL_VOTE_TOOL,
    COUNCIL_SYSTEM_PROMPT,
  );
  if (!result) return null;
  const verified = CouncilVoteSchema.safeParse(result);
  if (!verified.success) {
    console.error(
      "[google/council] Zod validation failed:",
      verified.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
    return null;
  }
  return verified.data;
}

// ─── PROVIDER INTERFACE ─────────────────────────────────────────────────────

export const googleProvider: LLMProvider = {
  name: "google",
  callLLM: callGemini,
  callLLMStructured: callGeminiStructured,
  evaluateDataChange,
  callLLMWithUsage: callGeminiWithUsage,
  callLLMStructuredWithUsage: callGeminiStructuredWithUsage,
  supportsServerTools: false,
  async callLLMWithServerTools() {
    console.warn("[google] Server tools (web search) not supported.");
    return { text: null, usage: null };
  },
  async callLLMWebResearchStructured() {
    console.warn("[google] Web research not supported.");
    return { result: null, usage: null, rawResearch: null };
  },
};
