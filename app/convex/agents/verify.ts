"use node";
/**
 * Centralized LLM output verifier.
 *
 * All LLM responses MUST pass through verifyLLMOutput() before being
 * written to Convex. This enforces:
 * 1. Schema compliance (Zod validation)
 * 2. Business rules (domain-specific checks)
 * 3. Audit logging (what passed/failed and why)
 *
 * Usage:
 *   const result = verifyLLMOutput(BudgetDataSchema, rawLLMOutput, "budget");
 *   if (!result.ok) { console.error(result.errors); return; }
 *   // result.data is typed and validated
 */

import { z } from "zod";

export interface VerifyResult<T> {
  ok: true;
  data: T;
}

export interface VerifyError {
  ok: false;
  errors: string[];
  raw: unknown;
}

/**
 * Verify LLM output against a Zod schema.
 *
 * @param schema - Zod schema to validate against
 * @param raw - Raw LLM output (parsed JSON or unknown)
 * @param category - Pipeline category for logging (e.g. "budget", "government")
 * @returns Typed result or error with details
 */
export function verifyLLMOutput<T>(
  schema: z.ZodType<T>,
  raw: unknown,
  category: string,
): VerifyResult<T> | VerifyError {
  const result = schema.safeParse(raw);

  if (!result.success) {
    const errors = result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`
    );
    console.error(
      `[verify/${category}] REJECTED LLM output — ${errors.length} validation error(s):`,
      errors.join("; ")
    );
    return { ok: false, errors, raw };
  }

  console.log(`[verify/${category}] Verified successfully.`);
  return { ok: true, data: result.data };
}

/**
 * Parse free-form LLM text into JSON, then verify against a schema.
 * Handles markdown fences, prose wrapping, and other common LLM quirks.
 *
 * @param text - Raw text from LLM response
 * @param schema - Zod schema to validate against
 * @param category - Pipeline category for logging
 * @returns Typed result or error
 */
export function parseAndVerify<T>(
  text: string,
  schema: z.ZodType<T>,
  category: string,
): VerifyResult<T> | VerifyError {
  // Step 1: Extract JSON from text
  let jsonStr = text;

  // Strip markdown fences
  const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) jsonStr = fence[1];

  // Try to find a JSON object or array if text doesn't start with { or [
  const trimmed = jsonStr.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    const objMatch = jsonStr.match(/(\{[\s\S]*\})/);
    const arrMatch = jsonStr.match(/(\[[\s\S]*\])/);
    if (objMatch) jsonStr = objMatch[1];
    else if (arrMatch) jsonStr = arrMatch[1];
  }

  // Step 2: Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr.trim());
  } catch {
    console.error(`[verify/${category}] JSON parse failed: ${text.slice(0, 200)}`);
    return { ok: false, errors: ["Failed to parse JSON from LLM response"], raw: text };
  }

  // Step 3: Validate against schema
  return verifyLLMOutput(schema, parsed, category);
}
