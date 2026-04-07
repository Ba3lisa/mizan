"use node";
// Provider registry — auto-detects available LLM providers from env vars.
// Priority: Anthropic → OpenAI → Google → OpenRouter
//
// For the pipeline: uses the highest-priority available provider.
// For the council: uses ALL available providers (each casts a vote).

import type { LLMProvider } from "./types";
import { anthropicProvider } from "./anthropic";
import { openaiProvider } from "./openai";
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
  { envKey: "ANTHROPIC_API_KEY", provider: anthropicProvider, defaultModel: "claude-haiku-4-5-20251001" },
  { envKey: "OPENAI_API_KEY", provider: openaiProvider, defaultModel: "gpt-4o-mini" },
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
 * Falls back down the priority chain: Anthropic → OpenAI → Google → OpenRouter.
 * Returns null if no provider is configured.
 */
export function getPrimaryProvider(): LLMProvider | null {
  for (const entry of PROVIDER_REGISTRY) {
    if (process.env[entry.envKey]) {
      return entry.provider;
    }
  }
  console.error("[registry] No LLM provider configured. Set at least one API key: ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_AI_API_KEY, or OPENROUTER_API_KEY");
  return null;
}

/**
 * Convenience: call the primary provider's text completion.
 * Drop-in replacement for the old callClaude().
 */
export async function callLLM(prompt: string, systemPrompt?: string): Promise<string | null> {
  const provider = getPrimaryProvider();
  if (!provider) return null;
  return provider.callLLM(prompt, systemPrompt);
}

/**
 * Convenience: call the primary provider's structured output.
 * Drop-in replacement for the old callClaudeStructured().
 */
export async function callLLMStructured<T>(
  prompt: string,
  schema: { name: string; description: string; input_schema: Record<string, unknown> },
  systemPrompt?: string,
): Promise<T | null> {
  const provider = getPrimaryProvider();
  if (!provider) return null;
  return provider.callLLMStructured<T>(prompt, schema, systemPrompt);
}
