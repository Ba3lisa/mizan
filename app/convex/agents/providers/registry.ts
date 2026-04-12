"use node";
// Provider registry — auto-detects available LLM providers from env vars.
// Priority: xAI (Grok) → OpenAI → Anthropic → Google → OpenRouter
//
// For the pipeline: uses the highest-priority available provider.
// For the council: uses ALL available providers (each casts a vote).
// For server tools (web search): uses the highest-priority provider that supports them.

import type { LLMProvider, LLMCallResult, ToolSchema, ServerToolDef } from "./types";
import { xaiProvider } from "./xai";
import { openaiProvider } from "./openai";
import { anthropicProvider } from "./anthropic";
import { googleProvider } from "./google";
import { openrouterProvider } from "./openrouter";

export interface ProviderConfig {
  name: string;
  model: string;
}

/** All providers in priority order with their env var keys. */
const PROVIDER_REGISTRY: Array<{
  envKey: string;
  modelEnvKey?: string;
  provider: LLMProvider;
  defaultModel: string;
}> = [
  { envKey: "XAI_API_KEY", provider: xaiProvider, defaultModel: "grok-4-1-fast-reasoning" },
  { envKey: "OPENAI_API_KEY", provider: openaiProvider, defaultModel: "gpt-4o-mini" },
  { envKey: "ANTHROPIC_API_KEY", provider: anthropicProvider, defaultModel: "claude-haiku-4-5-20251001" },
  { envKey: "GOOGLE_AI_API_KEY", provider: googleProvider, defaultModel: "gemini-2.0-flash" },
  { envKey: "OPENROUTER_API_KEY", modelEnvKey: "OPENROUTER_MODEL", provider: openrouterProvider, defaultModel: "meta-llama/llama-4-scout" },
];

/**
 * Returns all providers that have their API key set.
 * Used by the council to gather votes from every available model.
 */
export function getActiveProviders(): Array<ProviderConfig & { provider: LLMProvider }> {
  return PROVIDER_REGISTRY
    .filter((entry) => !!process.env[entry.envKey])
    .map((entry) => ({
      name: entry.provider.name,
      model: (entry.modelEnvKey && process.env[entry.modelEnvKey]) || entry.defaultModel,
      provider: entry.provider,
    }));
}

/**
 * Returns the highest-priority available provider for pipeline operations.
 * Falls back down the priority chain: xAI → OpenAI → Anthropic → Google → OpenRouter.
 * Returns null if no provider is configured.
 */
export function getPrimaryProvider(): LLMProvider | null {
  for (const entry of PROVIDER_REGISTRY) {
    if (process.env[entry.envKey]) {
      return entry.provider;
    }
  }
  console.error("[registry] No LLM provider configured. Set at least one API key: XAI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY, or OPENROUTER_API_KEY");
  return null;
}

/**
 * Returns the highest-priority available provider that supports server tools (web search).
 * Falls through providers that don't support them.
 */
function getServerToolsProvider(): LLMProvider | null {
  for (const entry of PROVIDER_REGISTRY) {
    if (process.env[entry.envKey] && entry.provider.supportsServerTools) {
      return entry.provider;
    }
  }
  console.error("[registry] No provider with server tools (web search) configured. Set XAI_API_KEY or ANTHROPIC_API_KEY.");
  return null;
}

// ─── Basic convenience wrappers ─────────────────────────────────────────────

export async function callLLM(prompt: string, systemPrompt?: string): Promise<string | null> {
  const provider = getPrimaryProvider();
  if (!provider) return null;
  return provider.callLLM(prompt, systemPrompt);
}

export async function callLLMStructured<T>(
  prompt: string,
  schema: { name: string; description: string; input_schema: Record<string, unknown> },
  systemPrompt?: string,
): Promise<T | null> {
  const provider = getPrimaryProvider();
  if (!provider) return null;
  return provider.callLLMStructured<T>(prompt, schema, systemPrompt);
}

// ─── With-usage variants (for cost tracking) ────────────────────────────────

export async function callLLMWithUsage(
  prompt: string,
  systemPrompt?: string,
): Promise<LLMCallResult> {
  const provider = getPrimaryProvider();
  if (!provider) return { text: null, usage: null };
  return provider.callLLMWithUsage(prompt, systemPrompt);
}

export async function callLLMStructuredWithUsage<T>(
  prompt: string,
  schema: ToolSchema,
  systemPrompt?: string,
): Promise<{ result: T | null; usage: LLMCallResult["usage"] }> {
  const provider = getPrimaryProvider();
  if (!provider) return { result: null, usage: null };
  return provider.callLLMStructuredWithUsage<T>(prompt, schema, systemPrompt);
}

// ─── Server tools (web search) — routes to first capable provider ───────────

export async function callLLMWithServerTools(
  prompt: string,
  serverTools: ServerToolDef[],
  systemPrompt?: string,
): Promise<LLMCallResult & { searchRequests?: number }> {
  const provider = getServerToolsProvider();
  if (!provider) return { text: null, usage: null };
  return provider.callLLMWithServerTools(prompt, serverTools, systemPrompt);
}

export async function callLLMWebResearchStructured<T>(
  researchPrompt: string,
  serverTools: ServerToolDef[],
  schema: ToolSchema,
  parsePrompt?: string,
  systemPrompt?: string,
): Promise<{ result: T | null; usage: LLMCallResult["usage"]; rawResearch: string | null }> {
  const provider = getServerToolsProvider();
  if (!provider) return { result: null, usage: null, rawResearch: null };
  return provider.callLLMWebResearchStructured<T>(researchPrompt, serverTools, schema, parsePrompt, systemPrompt);
}
