// Provider registry for the LLM council system.
// Adding a new model: create a provider file (e.g. openai.ts), then register it here.

export interface ProviderConfig {
  name: string;
  model: string;
}

/**
 * Returns the list of active LLM providers for council voting.
 * Currently only Anthropic (Claude 3.5 Haiku). To add more models,
 * create a new provider file in this directory and add it here.
 */
export function getActiveProviders(): Array<ProviderConfig> {
  return [
    { name: "anthropic", model: "claude-haiku-4-5-20251001" },
    // Future: { name: "openai", model: "gpt-4o" },
    // Future: { name: "google", model: "gemini-2.0-flash" },
  ];
}
