"use node";
// LLM Council orchestrator action.
// Runs each registered provider to vote on a proposed data change,
// then resolves the session based on the decision matrix.

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import type { CouncilEvaluationContext } from "./providers/types";
import { getActiveProviders } from "./providers/registry";

// ─── SOURCE CLASSIFICATION ──────────────────────────────────────────────────

export function classifySource(
  url: string
): "gov_eg" | "international_org" | "media" | "other" {
  const lower = url.toLowerCase();
  if (lower.includes(".gov.eg")) return "gov_eg";
  if (
    /worldbank\.org|imf\.org|undp\.org|who\.int|oecd\.org|afdb\.org/.test(lower)
  )
    return "international_org";
  if (
    /reuters\.com|aljazeera|bbc\.com|ahram\.org|youm7\.com|masrawy\.com/.test(
      lower
    )
  )
    return "media";
  return "other";
}

// ─── FETCH SOURCE CONTENT ───────────────────────────────────────────────────

async function fetchSourceContent(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, 8000);
  } catch {
    return null;
  }
}

// ─── COUNCIL REVIEW ORCHESTRATOR ────────────────────────────────────────────

export const runCouncilReview = internalAction({
  args: {
    sessionId: v.id("councilSessions"),
    category: v.string(),
    tableName: v.string(),
    fieldName: v.optional(v.string()),
    currentValue: v.optional(v.string()),
    proposedValue: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    issueBody: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ status: string; finalConfidence: string } | null> => {
    console.log(
      `[council] Starting review for session ${args.sessionId as string}`
    );

    // Fetch source content if URL provided
    let sourceContent: string | null = null;
    if (args.sourceUrl) {
      sourceContent = await fetchSourceContent(args.sourceUrl);
    }

    const evalContext: CouncilEvaluationContext = {
      category: args.category,
      tableName: args.tableName,
      fieldName: args.fieldName,
      currentValue: args.currentValue,
      proposedValue: args.proposedValue,
      sourceUrl: args.sourceUrl,
      sourceContent: sourceContent ?? undefined,
      issueBody: args.issueBody,
    };

    // Run each available provider — every configured model gets a vote
    const providers = getActiveProviders();
    console.log(`[council] ${providers.length} provider(s) active: ${providers.map((p) => p.name).join(", ")}`);

    for (const entry of providers) {
      console.log(`[council] Requesting vote from ${entry.name} (${entry.model})`);

      const result = await entry.provider.evaluateDataChange(evalContext);

      if (result) {
        await ctx.runMutation(internal.council.submitVote, {
          sessionId: args.sessionId,
          model: entry.model,
          provider: entry.name,
          vote: result.vote,
          confidence: result.confidence,
          reasoning: result.reasoning,
          sourceVerified: result.sourceVerified,
        });
        console.log(`[council] ${entry.name} voted: ${result.vote} (${result.confidence})`);
      } else {
        await ctx.runMutation(internal.council.submitVote, {
          sessionId: args.sessionId,
          model: entry.model,
          provider: entry.name,
          vote: "abstain" as const,
          confidence: "low" as const,
          reasoning: "Provider failed to return a vote",
          sourceVerified: false,
        });
        console.warn(`[council] ${entry.name} failed to vote, recorded abstain`);
      }
    }

    // Resolve the session
    const resolution: { status: string; finalConfidence: string } | null =
      await ctx.runMutation(internal.council.resolveSession, {
        sessionId: args.sessionId,
      });

    console.log(
      `[council] Session resolved: ${resolution?.status ?? "unknown"} (${resolution?.finalConfidence ?? "unknown"})`
    );

    return resolution;
  },
});
