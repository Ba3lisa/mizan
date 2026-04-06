"use node";
// Shared Anthropic Claude API caller for the Mizan agentic layer.
// Extracted from dataAgent.ts to be reusable across agents and council votes.

import { extractClaudeText } from "../validators";

const CLAUDE_MODEL = "claude-haiku-4-5-20251001";

/**
 * Calls the Claude API using raw fetch (no SDK dependency).
 * Returns the assistant's text response, or null if the API key is absent
 * or the request fails.
 */
export async function callClaude(
  prompt: string,
  systemPrompt?: string
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn(
      "[anthropic] ANTHROPIC_API_KEY is not set — skipping Claude call."
    );
    return null;
  }

  const body: Record<string, unknown> = {
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  };
  if (systemPrompt) {
    body.system = systemPrompt;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Claude API request failed (${response.status}): ${errorText}`
    );
  }

  const json: unknown = await response.json();
  return extractClaudeText(json);
}

// ─── COUNCIL EVALUATION ─────────────────────────────────────────────────────

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

/**
 * Asks Claude to evaluate a proposed data change and return a structured vote.
 * Used by the LLM council system.
 */
export async function evaluateDataChange(
  context: CouncilEvaluationContext
): Promise<CouncilVoteResult | null> {
  const systemPrompt = `You are a data verification council member for Mizan, Egypt's government transparency platform.
Your job is to evaluate proposed data changes and vote on whether they should be accepted.

You MUST respond with valid JSON only — no markdown, no prose.

Voting guidelines:
- "approve" if the data appears correct and the source is credible
- "reject" if the data appears incorrect, the source is unreliable, or the change is suspicious
- "abstain" if you cannot determine correctness (e.g., source is inaccessible)

Confidence levels:
- "high" for .gov.eg sources or well-known international organizations with direct data
- "medium" for reputable sources with indirect data
- "low" for unverifiable or questionable sources

Keep reasoning under 500 characters.`;

  const prompt = `Evaluate this proposed data change for the Egyptian government transparency platform:

Category: ${context.category}
Table: ${context.tableName}
${context.fieldName ? `Field: ${context.fieldName}` : ""}
${context.currentValue ? `Current value: ${context.currentValue}` : ""}
${context.proposedValue ? `Proposed value: ${context.proposedValue}` : ""}
${context.sourceUrl ? `Source URL: ${context.sourceUrl}` : "No source URL provided"}
${context.sourceContent ? `Source page content (truncated):\n${context.sourceContent.slice(0, 4000)}` : ""}
${context.issueBody ? `Original issue:\n${context.issueBody}` : ""}

Respond with JSON: {"vote": "approve|reject|abstain", "confidence": "high|medium|low", "reasoning": "<max 500 chars>", "sourceVerified": true|false}`;

  const response = await callClaude(prompt, systemPrompt);
  if (!response) return null;

  try {
    const parsed = JSON.parse(response) as Record<string, unknown>;
    const vote =
      parsed.vote === "approve" ||
      parsed.vote === "reject" ||
      parsed.vote === "abstain"
        ? parsed.vote
        : "abstain";
    const confidence =
      parsed.confidence === "high" ||
      parsed.confidence === "medium" ||
      parsed.confidence === "low"
        ? parsed.confidence
        : "low";
    const reasoning =
      typeof parsed.reasoning === "string"
        ? parsed.reasoning.slice(0, 500)
        : "No reasoning provided";
    const sourceVerified =
      typeof parsed.sourceVerified === "boolean"
        ? parsed.sourceVerified
        : false;

    return { vote, confidence, reasoning, sourceVerified };
  } catch {
    console.error("[anthropic] Failed to parse council vote response");
    return null;
  }
}
