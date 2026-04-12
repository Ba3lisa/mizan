"use node";
// Shared council evaluation prompt used by all providers.

import type { CouncilEvaluationContext } from "./types";

export const COUNCIL_SYSTEM_PROMPT = `You are a data verification council member for Mizan, Egypt's government transparency platform.
Your job is to evaluate proposed data changes and vote on whether they should be accepted.

Voting guidelines:
- "approve" if the data appears correct and the source is credible
- "reject" if the data appears incorrect, the source is unreliable, or the change is suspicious
- "abstain" if you cannot determine correctness (e.g., source is inaccessible)

Confidence levels:
- "high" for .gov.eg sources or well-known international organizations with direct data
- "medium" for reputable sources with indirect data
- "low" for unverifiable or questionable sources

Keep reasoning under 500 characters.`;

export function buildCouncilPrompt(context: CouncilEvaluationContext): string {
  return `Evaluate this proposed data change for the Egyptian government transparency platform:

Category: ${context.category}
Table: ${context.tableName}
${context.fieldName ? `Field: ${context.fieldName}` : ""}
${context.currentValue ? `Current value: ${context.currentValue}` : ""}
${context.proposedValue ? `Proposed value: ${context.proposedValue}` : ""}
${context.sourceUrl ? `Source URL: ${context.sourceUrl}` : "No source URL provided"}
${context.sourceContent ? `Source page content (truncated):\n${context.sourceContent.slice(0, 4000)}` : ""}
${context.issueBody ? `Original issue:\n${context.issueBody}` : ""}

Submit your vote using the provided tool.`;
}

