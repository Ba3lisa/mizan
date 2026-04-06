import {
  query,
  internalMutation,
  internalAction,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const categoryValidator = v.union(
  v.literal("government"),
  v.literal("parliament"),
  v.literal("constitution"),
  v.literal("budget"),
  v.literal("debt"),
  v.literal("all")
);

// ─── PUBLIC QUERIES ─────────────────────────────────────────────────────────

export const getLastUpdated = query({
  args: { category: categoryValidator },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("dataRefreshLog")
      .withIndex("by_category_and_status_and_startedAt", (q) =>
        q.eq("category", args.category).eq("status", "success")
      )
      .order("desc")
      .first();

    if (!entry) return null;

    return {
      lastUpdated: entry.completedAt ?? entry.startedAt,
      source: entry.sourceUrl ?? null,
    };
  },
});

export const getAllLastUpdated = query({
  args: {},
  handler: async (ctx) => {
    const categories = [
      "government",
      "parliament",
      "constitution",
      "budget",
      "debt",
      "all",
    ] as const;

    const result: Record<string, number | null> = {};

    for (const category of categories) {
      const entry = await ctx.db
        .query("dataRefreshLog")
        .withIndex("by_category_and_status_and_startedAt", (q) =>
          q.eq("category", category).eq("status", "success")
        )
        .order("desc")
        .first();

      result[category] = entry
        ? (entry.completedAt ?? entry.startedAt)
        : null;
    }

    return result;
  },
});

export const getRefreshHistory = query({
  args: {
    category: categoryValidator,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    return await ctx.db
      .query("dataRefreshLog")
      .withIndex("by_category_and_startedAt", (q) =>
        q.eq("category", args.category)
      )
      .order("desc")
      .take(limit);
  },
});

// ─── INTERNAL MUTATIONS ──────────────────────────────────────────────────────

export const logRefreshStart = internalMutation({
  args: { category: categoryValidator },
  handler: async (ctx, args) => {
    return await ctx.db.insert("dataRefreshLog", {
      category: args.category,
      status: "in_progress",
      startedAt: Date.now(),
    });
  },
});

export const logRefreshComplete = internalMutation({
  args: {
    logId: v.id("dataRefreshLog"),
    recordsUpdated: v.number(),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.logId, {
      status: "success",
      recordsUpdated: args.recordsUpdated,
      sourceUrl: args.sourceUrl,
      completedAt: Date.now(),
    });
  },
});

export const logRefreshFailed = internalMutation({
  args: {
    logId: v.id("dataRefreshLog"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.logId, {
      status: "failed",
      errorMessage: args.errorMessage,
      completedAt: Date.now(),
    });
  },
});

// ─── INTERNAL MUTATIONS (for agent writes) ───────────────────────────────────

/**
 * Upserts a debt record by date. Creates a new record if none exists for that
 * date; patches the existing one otherwise. Returns the number of records that
 * were actually changed (0 or 1).
 */
export const upsertDebtRecord = internalMutation({
  args: {
    date: v.string(),
    totalExternalDebt: v.optional(v.number()),
    totalDomesticDebt: v.optional(v.number()),
    debtToGdpRatio: v.optional(v.number()),
    foreignReserves: v.optional(v.number()),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("debtRecords")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();

    if (!existing) {
      await ctx.db.insert("debtRecords", {
        date: args.date,
        totalExternalDebt: args.totalExternalDebt,
        totalDomesticDebt: args.totalDomesticDebt,
        debtToGdpRatio: args.debtToGdpRatio,
        foreignReserves: args.foreignReserves,
        sourceUrl: args.sourceUrl,
      });
      return 1;
    }

    // Only patch fields that are explicitly provided (not undefined).
    // This prevents WB API data (which only has totalExternalDebt) from
    // overwriting existing domestic debt, GDP ratio, or reserves.
    const patch: Record<string, unknown> = {};
    if (args.totalExternalDebt !== undefined && args.totalExternalDebt !== existing.totalExternalDebt) {
      patch.totalExternalDebt = args.totalExternalDebt;
    }
    if (args.totalDomesticDebt !== undefined && args.totalDomesticDebt !== existing.totalDomesticDebt) {
      patch.totalDomesticDebt = args.totalDomesticDebt;
    }
    if (args.debtToGdpRatio !== undefined && args.debtToGdpRatio !== existing.debtToGdpRatio) {
      patch.debtToGdpRatio = args.debtToGdpRatio;
    }
    if (args.foreignReserves !== undefined && args.foreignReserves !== existing.foreignReserves) {
      patch.foreignReserves = args.foreignReserves;
    }
    if (args.sourceUrl !== undefined) {
      patch.sourceUrl = args.sourceUrl;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(existing._id, patch);
      return 1;
    }

    return 0;
  },
});

/**
 * Upserts a fiscal year record. Creates or patches by year string.
 * Returns the number of records changed (0 or 1).
 */
export const upsertFiscalYear = internalMutation({
  args: {
    year: v.string(),
    totalRevenue: v.optional(v.number()),
    totalExpenditure: v.optional(v.number()),
    deficit: v.optional(v.number()),
    gdp: v.optional(v.number()),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("fiscalYears")
      .withIndex("by_year", (q) => q.eq("year", args.year))
      .unique();

    if (!existing) {
      // Derive conventional start/end dates from fiscal year string "YYYY/YYYY"
      const parts = args.year.split("/");
      const startYear = parts[0] ?? args.year;
      const endYear = parts[1] ?? args.year;
      await ctx.db.insert("fiscalYears", {
        year: args.year,
        startDate: `${startYear}-07-01`,
        endDate: `${endYear}-06-30`,
        totalRevenue: args.totalRevenue,
        totalExpenditure: args.totalExpenditure,
        deficit: args.deficit,
        gdp: args.gdp,
        sourceUrl: args.sourceUrl,
      });
      return 1;
    }

    const hasChange =
      args.totalRevenue !== existing.totalRevenue ||
      args.totalExpenditure !== existing.totalExpenditure ||
      args.deficit !== existing.deficit ||
      args.gdp !== existing.gdp;

    if (hasChange) {
      await ctx.db.patch(existing._id, {
        totalRevenue: args.totalRevenue,
        totalExpenditure: args.totalExpenditure,
        deficit: args.deficit,
        gdp: args.gdp,
        sourceUrl: args.sourceUrl,
      });
      return 1;
    }

    return 0;
  },
});

/**
 * Receives a list of ministers detected by the AI agent and flags any that do
 * not match existing records for human review (by logging a console warning).
 * This does NOT automatically overwrite officials — government structure changes
 * require human confirmation.
 * Returns the count of potential discrepancies found.
 */
export const flagGovernmentChanges = internalMutation({
  args: {
    detectedMinisters: v.array(
      v.object({
        nameEn: v.string(),
        titleEn: v.string(),
        nameAr: v.string(),
        titleAr: v.string(),
      })
    ),
    sourceUrl: v.string(),
  },
  handler: async (ctx, args) => {
    // Fetch current active ministers from the database
    const currentMinisters = await ctx.db
      .query("officials")
      .withIndex("by_role_and_isCurrent", (q) =>
        q.eq("role", "minister").eq("isCurrent", true)
      )
      .take(200);

    const currentNamesEn = new Set(currentMinisters.map((m) => m.nameEn.toLowerCase()));

    let discrepancies = 0;

    for (const detected of args.detectedMinisters) {
      if (!currentNamesEn.has(detected.nameEn.toLowerCase())) {
        console.warn(
          `[dataAgent] Possible new/changed minister detected (requires human review): ` +
            `"${detected.nameEn}" — "${detected.titleEn}" (source: ${args.sourceUrl})`
        );
        discrepancies++;
      }
    }

    if (discrepancies > 0) {
      console.warn(
        `[dataAgent] ${discrepancies} potential government change(s) flagged for review.`
      );
    }

    return discrepancies;
  },
});

// ─── INTERNAL MUTATION: logChange ───────────────────────────────────────────

const changeCategoryValidator = v.union(
  v.literal("government"),
  v.literal("parliament"),
  v.literal("constitution"),
  v.literal("budget"),
  v.literal("debt"),
  v.literal("elections")
);

const changeActionValidator = v.union(
  v.literal("created"),
  v.literal("updated"),
  v.literal("validated"),
  v.literal("flagged"),
  v.literal("no_change")
);

/**
 * Inserts a dataChangeLog entry describing exactly what the AI agent did
 * for a specific operation within a refresh run.
 */
export const logChange = internalMutation({
  args: {
    refreshLogId: v.id("dataRefreshLog"),
    category: changeCategoryValidator,
    action: changeActionValidator,
    tableName: v.string(),
    recordId: v.optional(v.string()),
    descriptionAr: v.string(),
    descriptionEn: v.string(),
    previousValue: v.optional(v.string()),
    newValue: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("dataChangeLog", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

// ─── INTERNAL ACTIONS ────────────────────────────────────────────────────────

export const refreshDebtData = internalAction({
  args: {},
  handler: async (ctx) => {
    const logId: Id<"dataRefreshLog"> = await ctx.runMutation(
      internal.dataRefresh.logRefreshStart,
      { category: "debt" }
    );

    try {
      // TODO: Replace with actual World Bank API call, e.g.:
      // const response = await fetch(
      //   "https://api.worldbank.org/v2/country/EG/indicator/DT.DOD.DECT.CD?format=json&mrv=5"
      // );
      // const data = await response.json();
      // ... parse and upsert into debtRecords table via a mutation

      await ctx.runMutation(internal.dataRefresh.logRefreshComplete, {
        logId,
        recordsUpdated: 0,
        sourceUrl: "https://data.worldbank.org/country/egypt-arab-rep",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.dataRefresh.logRefreshFailed, {
        logId,
        errorMessage: message,
      });
    }
  },
});

export const refreshBudgetData = internalAction({
  args: {},
  handler: async (ctx) => {
    const logId: Id<"dataRefreshLog"> = await ctx.runMutation(
      internal.dataRefresh.logRefreshStart,
      { category: "budget" }
    );

    try {
      // TODO: Replace with actual Ministry of Finance API call, e.g.:
      // const response = await fetch("https://www.mof.gov.eg/en/open-data");
      // const data = await response.json();
      // ... parse and upsert into fiscalYears / budgetItems tables via a mutation

      await ctx.runMutation(internal.dataRefresh.logRefreshComplete, {
        logId,
        recordsUpdated: 0,
        sourceUrl: "https://www.mof.gov.eg",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.dataRefresh.logRefreshFailed, {
        logId,
        errorMessage: message,
      });
    }
  },
});

export const refreshAllData = internalAction({
  args: {},
  handler: async (ctx) => {
    // Delegate to the AI orchestrator which handles staleness checks,
    // external API fetches, Claude-powered parsing, and per-category logging.
    await ctx.runAction(internal.agents.dataAgent.orchestrateRefresh, {});
  },
});

/**
 * Manually trigger a full pipeline refresh, bypassing staleness checks.
 * Use via: npx convex run dataRefresh:manualRefresh
 * Or trigger from the Convex dashboard.
 */
export const manualRefresh = internalAction({
  args: {
    category: v.optional(
      v.union(
        v.literal("government"),
        v.literal("parliament"),
        v.literal("constitution"),
        v.literal("budget"),
        v.literal("debt"),
        v.literal("all")
      )
    ),
  },
  handler: async (ctx, args) => {
    const category = args.category ?? "all";
    console.log(`[manualRefresh] Manually triggering refresh for: ${category}`);

    if (category === "all") {
      // Run the full orchestrator (includes reference data + constitution + all categories)
      await ctx.runAction(internal.agents.dataAgent.orchestrateRefresh, {});
    } else if (category === "constitution") {
      // Force constitution refresh from PDF
      await ctx.runAction(
        internal.agents.constitutionAgent.refreshConstitution,
        { force: true }
      );
    } else {
      // Run a single category (debt, budget, government, parliament)
      // Log start
      const logId = await ctx.runMutation(
        internal.dataRefresh.logRefreshStart,
        { category }
      );
      try {
        // The orchestrateRefresh handles individual categories internally.
        // For manual single-category, just run the full orchestrator.
        await ctx.runAction(internal.agents.dataAgent.orchestrateRefresh, {});
        await ctx.runMutation(internal.dataRefresh.logRefreshComplete, {
          logId,
          recordsUpdated: 0,
          sourceUrl: undefined,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await ctx.runMutation(internal.dataRefresh.logRefreshFailed, {
          logId,
          errorMessage: message,
        });
      }
    }

    console.log(`[manualRefresh] Refresh complete for: ${category}`);
    return null;
  },
});
