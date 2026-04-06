import {
  query,
  internalQuery,
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
  v.literal("economy"),
  v.literal("governorate_stats"),
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
      "economy",
      "governorate_stats",
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

/**
 * Checks which main data tables are empty. Used by the orchestrator
 * to force refresh even if the staleness check says "fresh".
 */
export const checkEmptyTables = internalQuery({
  args: {},
  handler: async (ctx) => {
    const govOfficials = await ctx.db
      .query("officials")
      .withIndex("by_role_and_isCurrent", (q) =>
        q.eq("role", "minister").eq("isCurrent", true)
      )
      .take(1);
    const budgetItems = await ctx.db.query("budgetItems").take(1);
    const debtRecords = await ctx.db.query("debtRecords").take(1);
    const members = await ctx.db.query("parliamentMembers").take(1);
    const econ = await ctx.db.query("economicIndicators").take(1);
    const govStats = await ctx.db.query("governorateStats").take(1);

    return {
      government: govOfficials.length === 0,
      budget: budgetItems.length === 0,
      debt: debtRecords.length === 0,
      parliament: members.length === 0,
      economy: econ.length === 0,
      governorate_stats: govStats.length === 0,
    };
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
    totalDebtService: v.optional(v.number()),
    totalInterestPayments: v.optional(v.number()),
    sourceUrl: v.optional(v.string()),
    sourceNameEn: v.optional(v.string()),
    sanadLevel: v.number(),
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
        totalDebtService: args.totalDebtService,
        totalInterestPayments: args.totalInterestPayments,
        sourceUrl: args.sourceUrl,
        sourceNameEn: args.sourceNameEn,
        sanadLevel: args.sanadLevel,
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
    if (args.totalDebtService !== undefined && args.totalDebtService !== existing.totalDebtService) {
      patch.totalDebtService = args.totalDebtService;
    }
    if (args.totalInterestPayments !== undefined && args.totalInterestPayments !== existing.totalInterestPayments) {
      patch.totalInterestPayments = args.totalInterestPayments;
    }
    if (args.sourceUrl !== undefined) {
      patch.sourceUrl = args.sourceUrl;
    }
    if (args.sourceNameEn !== undefined) {
      patch.sourceNameEn = args.sourceNameEn;
    }
    if (args.sanadLevel !== undefined) {
      patch.sanadLevel = args.sanadLevel;
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
    sanadLevel: v.number(),
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
        sanadLevel: args.sanadLevel,
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
        sanadLevel: args.sanadLevel,
      });
      return 1;
    }

    return 0;
  },
});

/**
 * Upserts an economic indicator value by indicator + date + sourceUrl.
 * Supports multiple sources for the same indicator+date (multi-source).
 * Matches by sourceUrl within the (indicator, date) bucket.
 * Creates a new record if no match; patches value + sanadLevel if value changed.
 * Returns 1 if a write occurred, 0 if the value was unchanged.
 */
export const upsertEconomicIndicator = internalMutation({
  args: {
    indicator: v.string(),
    date: v.string(),
    year: v.optional(v.string()),
    value: v.number(),
    unit: v.string(),
    sourceUrl: v.optional(v.string()),
    sourceNameEn: v.optional(v.string()),
    sanadLevel: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("economicIndicators")
      .withIndex("by_indicator_and_date", (q) =>
        q.eq("indicator", args.indicator).eq("date", args.date)
      )
      .collect();

    const match = existing.find((e) => e.sourceUrl === args.sourceUrl);

    if (!match) {
      await ctx.db.insert("economicIndicators", {
        indicator: args.indicator,
        date: args.date,
        year: args.year,
        value: args.value,
        unit: args.unit,
        sourceUrl: args.sourceUrl,
        sourceNameEn: args.sourceNameEn,
        sanadLevel: args.sanadLevel,
      });
      return 1;
    }

    if (match.value !== args.value) {
      await ctx.db.patch(match._id, {
        value: args.value,
        year: args.year,
        unit: args.unit,
        sanadLevel: args.sanadLevel,
      });
      return 1;
    }

    return 0;
  },
});

/**
 * Backfills sanadLevel for all economicIndicators records where it is undefined.
 * Determines level from sourceUrl:
 *   worldbank.org -> 2, imf.org -> 2, er-api.com -> 4, countryeconomy.com -> 4, others -> 4
 * Returns count of patched records.
 */
export const backfillEconomicSanadLevels = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("economicIndicators").collect();
    let patched = 0;

    for (const record of all) {
      if (record.sanadLevel !== undefined) continue;

      const url = record.sourceUrl ?? "";
      let sanadLevel: number;
      if (url.includes("worldbank.org")) {
        sanadLevel = 2;
      } else if (url.includes("imf.org")) {
        sanadLevel = 2;
      } else if (url.includes("er-api.com")) {
        sanadLevel = 4;
      } else if (url.includes("countryeconomy.com")) {
        sanadLevel = 4;
      } else {
        sanadLevel = 4;
      }

      await ctx.db.patch(record._id, { sanadLevel });
      patched++;
    }

    return patched;
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

/**
 * Upserts government officials from AI-extracted cabinet data.
 * Matches by English name. Creates new officials if not found.
 * Marks officials no longer in the list as isCurrent=false.
 * This is the SOLE source of truth for government officials -- no seed data.
 */
export const upsertGovernmentOfficials = internalMutation({
  args: {
    officials: v.array(
      v.object({
        nameEn: v.string(),
        nameAr: v.string(),
        titleEn: v.string(),
        titleAr: v.string(),
        role: v.union(
          v.literal("president"),
          v.literal("prime_minister"),
          v.literal("minister"),
          v.literal("governor")
        ),
      })
    ),
    sourceUrl: v.string(),
    sanadLevel: v.number(),
  },
  handler: async (ctx, args) => {
    let updated = 0;

    // Get all current officials (president, PM, ministers)
    const currentOfficials = await ctx.db
      .query("officials")
      .withIndex("by_isCurrent", (q) => q.eq("isCurrent", true))
      .collect();

    // Filter to only government roles (not MPs/senators)
    const govOfficials = currentOfficials.filter(
      (o) => o.role === "president" || o.role === "prime_minister" || o.role === "minister" || o.role === "deputy_minister" || o.role === "governor"
    );

    const existingByName = new Map(
      govOfficials.map((o) => [o.nameEn.toLowerCase(), o])
    );

    const newNames = new Set(
      args.officials.map((o) => o.nameEn.toLowerCase())
    );

    // Get existing ministries for matching
    const existingMinistries = await ctx.db.query("ministries").collect();
    const ministriesByName = new Map(
      existingMinistries.map((m) => [m.nameEn.toLowerCase(), m])
    );

    // Upsert each official + their ministry
    for (const official of args.officials) {
      const existing = existingByName.get(official.nameEn.toLowerCase());
      let officialId: string;

      if (existing) {
        officialId = existing._id as string;
        if (existing.titleEn !== official.titleEn || existing.titleAr !== official.titleAr) {
          await ctx.db.patch(existing._id, {
            titleEn: official.titleEn,
            titleAr: official.titleAr,
            role: official.role,
            sourceUrl: args.sourceUrl,
            sanadLevel: args.sanadLevel,
          });
          updated++;
        }
      } else {
        officialId = await ctx.db.insert("officials", {
          nameEn: official.nameEn,
          nameAr: official.nameAr,
          titleEn: official.titleEn,
          titleAr: official.titleAr,
          role: official.role,
          isCurrent: true,
          sourceUrl: args.sourceUrl,
          sanadLevel: args.sanadLevel,
        }) as string;
        updated++;
      }

      // Link governors to their governorate
      if (official.role === "governor") {
        const govName = official.titleEn.replace(/^Governor of /, "").trim();
        const allGovernorates = await ctx.db.query("governorates").collect();
        const gov = allGovernorates.find(
          (g) => g.nameEn.toLowerCase() === govName.toLowerCase() ||
                 g.nameEn.toLowerCase().includes(govName.toLowerCase()) ||
                 govName.toLowerCase().includes(g.nameEn.toLowerCase())
        );
        if (gov) {
          await ctx.db.patch(gov._id, {
            currentGovernorId: officialId as unknown as typeof gov["currentGovernorId"],
          });
        }
      }

      // Create/update ministry for ministers (not president/PM)
      if (official.role === "minister") {
        // Extract ministry name from title (e.g. "Minister of Health" -> "Ministry of Health")
        const ministryNameEn = official.titleEn.replace(/^Minister of /, "Ministry of ").replace(/^Deputy Prime Minister.*/, "Deputy PM Office");
        const ministryNameAr = official.titleAr.replace(/^وزير /, "وزارة ").replace(/^نائب رئيس الوزراء.*/, "مكتب نائب رئيس الوزراء");

        const existingMinistry = ministriesByName.get(ministryNameEn.toLowerCase());
        if (existingMinistry) {
          // Update current minister
          await ctx.db.patch(existingMinistry._id, {
            currentMinisterId: officialId as unknown as typeof existingMinistries[0]["currentMinisterId"],
          });
        } else {
          // Create new ministry
          const sortOrder = existingMinistries.length + updated;
          await ctx.db.insert("ministries", {
            nameEn: ministryNameEn,
            nameAr: ministryNameAr,
            currentMinisterId: officialId as unknown as typeof existingMinistries[0]["currentMinisterId"],
            sortOrder,
          });
          updated++;
        }
      }
    }

    // Mark officials NOT in the new list as no longer current
    // ONLY mark officials whose role matches the roles in the new list
    // (prevents governor upsert from deactivating ministers and vice versa)
    const rolesInNewList = new Set(args.officials.map((o) => o.role));
    for (const existing of govOfficials) {
      if (
        rolesInNewList.has(existing.role as "president" | "prime_minister" | "minister" | "governor") &&
        !newNames.has(existing.nameEn.toLowerCase())
      ) {
        await ctx.db.patch(existing._id, {
          isCurrent: false,
          endDate: new Date().toISOString().slice(0, 10),
        });
        updated++;
      }
    }

    return updated;
  },
});

// ─── INTERNAL MUTATION: upsertGovernorateStat ─────────────────────────────

export const upsertGovernorateStat = internalMutation({
  args: {
    governorateId: v.id("governorates"),
    indicator: v.string(),
    year: v.string(),
    value: v.number(),
    unit: v.string(),
    sourceUrl: v.string(),
    sourceNameEn: v.optional(v.string()),
    sourceNameAr: v.optional(v.string()),
    sanadLevel: v.number(),
  },
  handler: async (ctx, args) => {
    // Dedup by governorateId + indicator + year, then match by sourceUrl
    const existing = await ctx.db
      .query("governorateStats")
      .withIndex("by_governorateId_indicator_year", (q) =>
        q.eq("governorateId", args.governorateId)
          .eq("indicator", args.indicator)
          .eq("year", args.year)
      )
      .collect();

    const match = existing.find((e) => e.sourceUrl === args.sourceUrl);

    if (!match) {
      await ctx.db.insert("governorateStats", {
        governorateId: args.governorateId,
        indicator: args.indicator,
        year: args.year,
        value: args.value,
        unit: args.unit,
        sourceUrl: args.sourceUrl,
        sourceNameEn: args.sourceNameEn,
        sourceNameAr: args.sourceNameAr,
        sanadLevel: args.sanadLevel,
      });
      return 1;
    }

    if (match.value !== args.value) {
      await ctx.db.patch(match._id, {
        value: args.value,
        unit: args.unit,
        sourceNameEn: args.sourceNameEn,
        sourceNameAr: args.sourceNameAr,
        sanadLevel: args.sanadLevel,
      });
      return 1;
    }

    return 0;
  },
});

// ─── INTERNAL MUTATION: logChange ───────────────────────────────────────────

const changeCategoryValidator = v.union(
  v.literal("government"),
  v.literal("parliament"),
  v.literal("constitution"),
  v.literal("budget"),
  v.literal("debt"),
  v.literal("elections"),
  v.literal("economy"),
  v.literal("governorate_stats")
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

/**
 * Returns the most recent record for a given economic indicator.
 * Used by the narrative generator in the data agent.
 */
export const getLatestIndicator = internalQuery({
  args: {
    indicator: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("economicIndicators")
      .withIndex("by_indicator_and_date", (q) =>
        q.eq("indicator", args.indicator)
      )
      .order("desc")
      .first();
  },
});

/**
 * Inserts a new AI research report into the aiResearchReports table.
 * Called by the narrative generator after generating economic insights.
 */
export const insertAiResearchReport = internalMutation({
  args: {
    titleEn: v.string(),
    titleAr: v.string(),
    category: v.union(
      v.literal("government"),
      v.literal("parliament"),
      v.literal("constitution"),
      v.literal("budget"),
      v.literal("debt"),
      v.literal("elections"),
      v.literal("economy")
    ),
    summaryEn: v.string(),
    summaryAr: v.string(),
    contentEn: v.string(),
    contentAr: v.string(),
    sourcesChecked: v.array(
      v.object({
        nameEn: v.string(),
        url: v.string(),
        accessible: v.boolean(),
      })
    ),
    findingsCount: v.number(),
    discrepanciesFound: v.number(),
    agentModel: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("aiResearchReports", {
      titleEn: args.titleEn,
      titleAr: args.titleAr,
      category: args.category,
      summaryEn: args.summaryEn,
      summaryAr: args.summaryAr,
      contentEn: args.contentEn,
      contentAr: args.contentAr,
      sourcesChecked: args.sourcesChecked,
      findingsCount: args.findingsCount,
      discrepanciesFound: args.discrepanciesFound,
      generatedAt: Date.now(),
      agentModel: args.agentModel,
    });
    return null;
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
        v.literal("economy"),
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

/**
 * Backfills sanadLevel on existing records that don't yet have it set.
 * Debt → 2 (World Bank), fiscalYears → 1 (MOF), budgetItems → 1 (MOF).
 * Officials: inferred from sourceUrl (ahram→3, wikipedia→4, .gov.eg→1, else→4).
 * Returns total count of records updated.
 */
export const backfillAllSanadLevels = internalMutation({
  args: {},
  handler: async (ctx) => {
    let total = 0;

    // Debt records → sanadLevel 2 (World Bank)
    const debtRecords = await ctx.db.query("debtRecords").collect();
    for (const record of debtRecords) {
      if (record.sanadLevel === undefined) {
        await ctx.db.patch(record._id, { sanadLevel: 2 });
        total++;
      }
    }

    // Fiscal years → sanadLevel 1 (Ministry of Finance)
    const fiscalYears = await ctx.db.query("fiscalYears").collect();
    for (const record of fiscalYears) {
      if (record.sanadLevel === undefined) {
        await ctx.db.patch(record._id, { sanadLevel: 1 });
        total++;
      }
    }

    // Budget items → sanadLevel 1 (Ministry of Finance)
    const budgetItems = await ctx.db.query("budgetItems").collect();
    for (const record of budgetItems) {
      if (record.sanadLevel === undefined) {
        await ctx.db.patch(record._id, { sanadLevel: 1 });
        total++;
      }
    }

    // Officials → infer from sourceUrl
    const officials = await ctx.db.query("officials").collect();
    for (const record of officials) {
      if (record.sanadLevel === undefined) {
        const url = record.sourceUrl ?? "";
        let level: number;
        if (url.includes("ahram")) {
          level = 3;
        } else if (url.includes("wikipedia")) {
          level = 4;
        } else if (url.includes(".gov.eg")) {
          level = 1;
        } else {
          level = 4;
        }
        await ctx.db.patch(record._id, { sanadLevel: level });
        total++;
      }
    }

    // Elections → sanadLevel 1 (official results)
    const elections = await ctx.db.query("elections").collect();
    for (const record of elections) {
      if (record.sanadLevel === undefined) {
        await ctx.db.patch(record._id, { sanadLevel: 1 });
        total++;
      }
    }

    // Election results → sanadLevel 1 (official results)
    const electionResults = await ctx.db.query("electionResults").collect();
    for (const record of electionResults) {
      if (record.sanadLevel === undefined) {
        await ctx.db.patch(record._id, { sanadLevel: 1 });
        total++;
      }
    }

    // Tax brackets → sanadLevel 1 (Tax Authority)
    const taxBrackets = await ctx.db.query("taxBrackets").collect();
    for (const record of taxBrackets) {
      if (record.sanadLevel === undefined) {
        await ctx.db.patch(record._id, { sanadLevel: 1 });
        total++;
      }
    }

    // Sovereign ratings → sanadLevel 2 (international rating agencies)
    const sovereignRatings = await ctx.db.query("sovereignRatings").collect();
    for (const record of sovereignRatings) {
      if (record.sanadLevel === undefined) {
        await ctx.db.patch(record._id, { sanadLevel: 2 });
        total++;
      }
    }

    // Data sources → infer from type field
    const dataSources = await ctx.db.query("dataSources").collect();
    for (const record of dataSources) {
      if (record.sanadLevel === undefined) {
        const typeMap: Record<string, number> = {
          official_government: 1,
          international_org: 2,
          media: 3,
          academic: 2,
          other: 4,
        };
        await ctx.db.patch(record._id, { sanadLevel: typeMap[record.type] ?? 4 });
        total++;
      }
    }

    return total;
  },
});
