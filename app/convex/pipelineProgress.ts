import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal as _internal } from "./_generated/api";

// All steps in pipeline order
const PIPELINE_STEPS = [
  "reference_data",
  "government",
  "parliament",
  "budget",
  "debt",
  "economy",
  "governorate_stats",
  "constitution",
  "github_issues",
  "narrative",
  "llm_export",
  "cleanup",
] as const;

type PipelineStep = (typeof PIPELINE_STEPS)[number];

/**
 * Internal mutation: clears old progress entries and creates fresh pending
 * entries for all steps under a new runId.
 *
 * Convex mutations are bounded, so we delete in a batch and schedule a
 * continuation if there are more old records to purge.
 */
export const startRun = internalMutation({
  args: {
    runId: v.string(),
  },
  handler: async (ctx, args) => {
    // Delete all existing pipelineProgress records (from previous runs)
    const existing = await ctx.db
      .query("pipelineProgress")
      .collect();

    for (const doc of existing) {
      await ctx.db.delete(doc._id);
    }

    // Insert pending entries for each step in order
    for (const step of PIPELINE_STEPS) {
      await ctx.db.insert("pipelineProgress", {
        runId: args.runId,
        step,
        status: "pending",
      });
    }
  },
});

/**
 * Internal mutation: patches the step entry for a given runId with updated
 * status, message, recordsUpdated, and/or error.
 */
export const updateStep = internalMutation({
  args: {
    runId: v.string(),
    step: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("success"),
      v.literal("failed"),
      v.literal("skipped")
    ),
    message: v.optional(v.string()),
    messageAr: v.optional(v.string()),
    recordsUpdated: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pipelineProgress")
      .withIndex("by_runId", (q) => q.eq("runId", args.runId))
      .collect();

    const doc = existing.find((d) => d.step === args.step);
    if (!doc) {
      console.warn(
        `[pipelineProgress] No entry found for runId=${args.runId}, step=${args.step}`
      );
      return;
    }

    const now = Date.now();
    const patch: Partial<{
      status: "pending" | "running" | "success" | "failed" | "skipped";
      message: string;
      messageAr: string;
      recordsUpdated: number;
      startedAt: number;
      completedAt: number;
      error: string;
    }> = { status: args.status };

    if (args.message !== undefined) patch.message = args.message;
    if (args.messageAr !== undefined) patch.messageAr = args.messageAr;
    if (args.recordsUpdated !== undefined) patch.recordsUpdated = args.recordsUpdated;
    if (args.error !== undefined) patch.error = args.error;

    if (args.status === "running") {
      patch.startedAt = now;
    } else if (
      args.status === "success" ||
      args.status === "failed" ||
      args.status === "skipped"
    ) {
      patch.completedAt = now;
    }

    await ctx.db.patch(doc._id, patch);
  },
});

/**
 * Public query: returns the most recent run's progress entries plus the last
 * successful run's completion timestamp (for countdown calculation).
 *
 * Frontend subscribes to this for real-time pipeline progress updates.
 */
export const getProgress = query({
  args: {},
  handler: async (ctx) => {
    // Collect all progress records — the table only ever holds the current run
    // (startRun clears previous entries)
    const allDocs = await ctx.db
      .query("pipelineProgress")
      .collect();

    if (allDocs.length === 0) {
      return { steps: [], runId: null, lastCompletedAt: null };
    }

    // Group by runId and use the most recent one (highest runId, which is a
    // timestamp string, so lexicographic sort is equivalent to chronological)
    const runIds = [...new Set(allDocs.map((d) => d.runId))];
    runIds.sort((a, b) => b.localeCompare(a));
    const currentRunId = runIds[0];

    const steps = allDocs
      .filter((d) => d.runId === currentRunId)
      .sort((a, b) => {
        const ai = PIPELINE_STEPS.indexOf(a.step as PipelineStep);
        const bi = PIPELINE_STEPS.indexOf(b.step as PipelineStep);
        return ai - bi;
      });

    // Find the timestamp of the most recently completed run (any step marked
    // success or failed with a completedAt)
    const lastCompletedAt =
      steps
        .map((s) => s.completedAt ?? null)
        .filter((t): t is number => t !== null)
        .sort((a, b) => b - a)[0] ?? null;

    return { steps, runId: currentRunId, lastCompletedAt };
  },
});

/**
 * Public query: returns the timestamp of the last pipeline run that had any
 * completed step. Used by the frontend countdown timer.
 */
export const getLastRunTime = query({
  args: {},
  handler: async (ctx) => {
    const allDocs = await ctx.db
      .query("pipelineProgress")
      .collect();

    const completedTimes = allDocs
      .map((d) => d.completedAt ?? null)
      .filter((t): t is number => t !== null);

    if (completedTimes.length === 0) return null;

    completedTimes.sort((a, b) => b - a);
    return completedTimes[0];
  },
});
