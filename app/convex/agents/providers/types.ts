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

/** Every LLM provider exports these three functions. */
export interface LLMProvider {
  name: string;
  /** Send a prompt and get a text response. */
  callLLM(prompt: string, systemPrompt?: string): Promise<string | null>;
  /** Send a prompt with a JSON schema and get a structured response. */
  callLLMStructured<T>(prompt: string, schema: ToolSchema, systemPrompt?: string): Promise<T | null>;
  /** Evaluate a data change for the LLM council. */
  evaluateDataChange(context: CouncilEvaluationContext): Promise<CouncilVoteResult | null>;
}
