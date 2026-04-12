"use node";
// Shared types for all LLM providers.
// Every provider implements these interfaces so the pipeline is model-agnostic.

export interface LLMCallResult {
  text: string | null;
  usage: {
    inputTokens: number;
    outputTokens: number;
    model: string;
    durationMs: number;
  } | null;
}

export interface ToolSchema {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

/** Server-side tool definition (web_search, web_fetch, etc.) */
export interface ServerToolDef {
  type: string;
  name: string;
  max_uses?: number;
  allowed_domains?: string[];
  blocked_domains?: string[];
  max_content_tokens?: number;
}

export interface CouncilEvaluationContext {
  category: string;
  tableName: string;
  fieldName?: string;
  currentValue?: string;
  proposedValue?: string;
  sourceUrl?: string;
  sourceContent?: string;
  issueBody?: string;
}

export interface CouncilVoteResult {
  vote: "approve" | "reject" | "abstain";
  confidence: "high" | "medium" | "low";
  reasoning: string;
  sourceVerified: boolean;
}

/** Every LLM provider implements this interface for pipeline compatibility. */
export interface LLMProvider {
  name: string;

  // ── Basic (required by all providers) ──────────────────────────────────────
  callLLM(prompt: string, systemPrompt?: string): Promise<string | null>;
  callLLMStructured<T>(prompt: string, schema: ToolSchema, systemPrompt?: string): Promise<T | null>;
  evaluateDataChange(context: CouncilEvaluationContext): Promise<CouncilVoteResult | null>;

  // ── With-usage variants (required — all providers can track tokens) ────────
  callLLMWithUsage(prompt: string, systemPrompt?: string): Promise<LLMCallResult>;
  callLLMStructuredWithUsage<T>(
    prompt: string,
    schema: ToolSchema,
    systemPrompt?: string,
  ): Promise<{ result: T | null; usage: LLMCallResult["usage"] }>;

  // ── Server tools (optional — only providers with web search implement) ─────
  supportsServerTools: boolean;
  callLLMWithServerTools(
    prompt: string,
    serverTools: ServerToolDef[],
    systemPrompt?: string,
  ): Promise<LLMCallResult & { searchRequests?: number }>;
  callLLMWebResearchStructured<T>(
    researchPrompt: string,
    serverTools: ServerToolDef[],
    schema: ToolSchema,
    parsePrompt?: string,
    systemPrompt?: string,
  ): Promise<{ result: T | null; usage: LLMCallResult["usage"]; rawResearch: string | null }>;
}
