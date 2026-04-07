"use node";
// Google Gemini provider for the Mizan agentic layer.
// Uses raw fetch against the Gemini REST API (no SDK).

import type { LLMProvider, ToolSchema, CouncilEvaluationContext, CouncilVoteResult } from "./types";
import { COUNCIL_SYSTEM_PROMPT, buildCouncilPrompt, parseCouncilVote } from "./councilPrompt";

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
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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

// ─── COUNCIL EVALUATION ─────────────────────────────────────────────────────

async function evaluateDataChange(
  context: CouncilEvaluationContext
): Promise<CouncilVoteResult | null> {
  const response = await callGemini(buildCouncilPrompt(context), COUNCIL_SYSTEM_PROMPT);
  if (!response) return null;
  return parseCouncilVote(response);
}

// ─── PROVIDER INTERFACE ─────────────────────────────────────────────────────

export const googleProvider: LLMProvider = {
  name: "google",
  callLLM: callGemini,
  callLLMStructured: callGeminiStructured,
  evaluateDataChange,
};
