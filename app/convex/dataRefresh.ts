import {
  query,
  mutation,
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
  v.literal("industry"),
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

    const industry = await ctx.db.query("investmentOpportunities").take(1);
    // Also consider industry "empty" if all records lack cost data (forces cost estimation)
    let industryNeedsCosts = false;
    if (industry.length > 0) {
      const allOpps = await ctx.db.query("investmentOpportunities").collect();
      industryNeedsCosts = allOpps.every((o) => o.costEgp === undefined);
    }

    return {
      government: govOfficials.length === 0,
      budget: budgetItems.length === 0,
      debt: debtRecords.length === 0,
      parliament: members.length === 0,
      economy: econ.length === 0,
      governorate_stats: govStats.length === 0,
      industry: industry.length === 0 || industryNeedsCosts,
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
    // Normalize year format: "2024/2025" → "2024-2025" to prevent duplicates
    const normalizedYear = args.year.replace("/", "-");

    // Try both the normalized form and the original to find existing records
    let existing = await ctx.db
      .query("fiscalYears")
      .withIndex("by_year", (q) => q.eq("year", normalizedYear))
      .unique();

    if (!existing && normalizedYear !== args.year) {
      existing = await ctx.db
        .query("fiscalYears")
        .withIndex("by_year", (q) => q.eq("year", args.year))
        .unique();
    }

    if (!existing) {
      // Derive conventional start/end dates from fiscal year string "YYYY-YYYY"
      const parts = normalizedYear.split("-");
      const startYear = parts[0] ?? normalizedYear;
      const endYear = parts[1] ?? normalizedYear;
      await ctx.db.insert("fiscalYears", {
        year: normalizedYear,
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
  v.literal("governorate_stats"),
  v.literal("industry")
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
 * Returns the count of records for a given economic indicator (capped at 100).
 * Used by the data agent to decide whether historical backfill is needed.
 */
export const countIndicatorRecords = internalQuery({
  args: {
    indicator: v.string(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("economicIndicators")
      .withIndex("by_indicator_and_date", (q) =>
        q.eq("indicator", args.indicator)
      )
      .take(100);
    return rows.length;
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
      v.literal("economy"),
      v.literal("industry")
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
        v.literal("industry"),
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

/**
 * One-time backfill of EGX 30 annual closing values (2010–2025).
 * Inserts only if fewer than 10 egx30 records already exist.
 * Source: Egyptian Exchange (EGX) public historical data.
 * sanadLevel 1 = Official Government / Exchange source.
 * Safe to run repeatedly — upsertEconomicIndicator is idempotent.
 */
export const backfillEgx30History = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("economicIndicators")
      .withIndex("by_indicator_and_date", (q) =>
        q.eq("indicator", "egx30")
      )
      .take(100);

    if (existing.length >= 10) {
      console.log(
        `[backfillEgx30History] Already have ${existing.length} egx30 records — skipping.`
      );
      return 0;
    }

    const EGX_SOURCE_URL = "https://www.egx.com.eg";
    const EGX_SOURCE_NAME = "Egyptian Exchange (EGX) — annual closing values";

    const historicalData: Array<{ year: string; value: number }> = [
      { year: "2010", value: 7142 },
      { year: "2011", value: 3622 },
      { year: "2012", value: 5462 },
      { year: "2013", value: 6783 },
      { year: "2014", value: 8927 },
      { year: "2015", value: 7006 },
      { year: "2016", value: 12346 },
      { year: "2017", value: 15019 },
      { year: "2018", value: 13036 },
      { year: "2019", value: 13962 },
      { year: "2020", value: 10845 },
      { year: "2021", value: 11949 },
      { year: "2022", value: 14854 },
      { year: "2023", value: 24036 },
      { year: "2024", value: 28358 },
      { year: "2025", value: 32186 },
    ];

    let inserted = 0;
    for (const entry of historicalData) {
      const date = `${entry.year}-12-31`;
      const existingRow = existing.find((r) => r.date === date && r.sourceUrl === EGX_SOURCE_URL);
      if (!existingRow) {
        await ctx.db.insert("economicIndicators", {
          indicator: "egx30",
          date,
          year: entry.year,
          value: entry.value,
          unit: "index",
          sourceUrl: EGX_SOURCE_URL,
          sourceNameEn: EGX_SOURCE_NAME,
          sanadLevel: 1,
        });
        inserted++;
      }
    }

    console.log(`[backfillEgx30History] Inserted ${inserted} EGX 30 historical records.`);
    return inserted;
  },
});

// ─── INVESTMENT OPPORTUNITY UPSERTS ─────────────────────────────────────────

/**
 * Upserts an investment opportunity by (source, externalId). Creates if new,
 * patches changed fields if existing. Returns 0 or 1.
 */
export const upsertInvestmentOpportunity = internalMutation({
  args: {
    externalId: v.string(),
    source: v.union(v.literal("ida"), v.literal("gafi")),
    nameAr: v.string(),
    nameEn: v.string(),
    descriptionAr: v.optional(v.string()),
    descriptionEn: v.optional(v.string()),
    sector: v.string(),
    sectorAr: v.optional(v.string()),
    sectorEn: v.optional(v.string()),
    governorate: v.optional(v.string()),
    governorateAr: v.optional(v.string()),
    type: v.union(
      v.literal("industrial_unit"),
      v.literal("land_plot"),
      v.literal("major_opportunity"),
      v.literal("free_zone"),
      v.literal("investment_zone"),
      v.literal("sme_program")
    ),
    costEgp: v.optional(v.number()),
    costUsd: v.optional(v.number()),
    unitAreaSqm: v.optional(v.number()),
    landAreaSqm: v.optional(v.number()),
    pricePerSqmEgp: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("available"),
        v.literal("under_development"),
        v.literal("reserved"),
        v.literal("unknown")
      )
    ),
    sourceUrl: v.string(),
    sanadLevel: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("investmentOpportunities")
      .withIndex("by_source_and_externalId", (q) =>
        q.eq("source", args.source).eq("externalId", args.externalId)
      )
      .unique();

    if (!existing) {
      await ctx.db.insert("investmentOpportunities", {
        ...args,
        lastScrapedAt: Date.now(),
      });
      return 1;
    }

    const patch: Record<string, unknown> = {};
    const fields = [
      "nameAr", "nameEn", "descriptionAr", "descriptionEn",
      "sector", "sectorAr", "sectorEn", "governorate", "governorateAr",
      "type", "costEgp", "costUsd", "unitAreaSqm", "landAreaSqm",
      "pricePerSqmEgp", "status", "sourceUrl", "sanadLevel",
    ] as const;

    for (const field of fields) {
      if (args[field] !== undefined && args[field] !== existing[field]) {
        patch[field] = args[field];
      }
    }

    // Always update lastScrapedAt
    patch.lastScrapedAt = Date.now();

    if (Object.keys(patch).length > 1) {
      // More than just lastScrapedAt changed
      await ctx.db.patch(existing._id, patch);
      return 1;
    }

    // Only lastScrapedAt changed — still patch it but report 0 data changes
    await ctx.db.patch(existing._id, patch);
    return 0;
  },
});

/**
 * Upserts project detail (cost breakdown) by opportunityId.
 * Creates if new, patches changed fields if existing. Returns 0 or 1.
 */
export const upsertInvestmentProjectDetail = internalMutation({
  args: {
    opportunityId: v.id("investmentOpportunities"),
    landCostEgp: v.optional(v.number()),
    constructionCostEgp: v.optional(v.number()),
    equipmentCostEgp: v.optional(v.number()),
    laborCostEgp: v.optional(v.number()),
    licensingFeesEgp: v.optional(v.number()),
    workingCapitalEgp: v.optional(v.number()),
    expectedRevenueEgp: v.optional(v.number()),
    expectedProfitMarginPct: v.optional(v.number()),
    paybackPeriodYears: v.optional(v.number()),
    employeesNeeded: v.optional(v.number()),
    incentivesAr: v.optional(v.string()),
    incentivesEn: v.optional(v.string()),
    licensingStepsAr: v.optional(v.string()),
    licensingStepsEn: v.optional(v.string()),
    rawDataJson: v.optional(v.string()),
    sourceUrl: v.string(),
    sanadLevel: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("investmentProjectDetails")
      .withIndex("by_opportunityId", (q) =>
        q.eq("opportunityId", args.opportunityId)
      )
      .unique();

    if (!existing) {
      await ctx.db.insert("investmentProjectDetails", args);
      return 1;
    }

    const patch: Record<string, unknown> = {};
    const fields = [
      "landCostEgp", "constructionCostEgp", "equipmentCostEgp",
      "laborCostEgp", "licensingFeesEgp", "workingCapitalEgp",
      "expectedRevenueEgp", "expectedProfitMarginPct", "paybackPeriodYears",
      "employeesNeeded", "incentivesAr", "incentivesEn",
      "licensingStepsAr", "licensingStepsEn", "rawDataJson",
      "sourceUrl", "sanadLevel",
    ] as const;

    for (const field of fields) {
      if (args[field] !== undefined && args[field] !== existing[field]) {
        patch[field] = args[field];
      }
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(existing._id, patch);
      return 1;
    }
    return 0;
  },
});

/**
 * Deduplicate fiscal years that differ only by separator ("/" vs "-").
 * Keeps the record with more budget items linked; deletes the orphan.
 * Called automatically at the start of each pipeline run.
 */
export const deduplicateFiscalYears = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("fiscalYears").collect();

    // Group by normalized key
    const byNormalized = new Map<string, typeof all>();
    for (const fy of all) {
      const key = fy.year.replace("/", "-");
      const group = byNormalized.get(key) ?? [];
      group.push(fy);
      byNormalized.set(key, group);
    }

    let deleted = 0;
    for (const [, group] of byNormalized) {
      if (group.length <= 1) continue;

      // Count budget items per record to find the one with actual data
      const scored = await Promise.all(
        group.map(async (fy) => {
          const items = await ctx.db
            .query("budgetItems")
            .withIndex("by_fiscalYearId_and_category", (q) =>
              q.eq("fiscalYearId", fy._id)
            )
            .collect();
          return { fy, itemCount: items.length, total: (fy.totalRevenue ?? 0) + (fy.totalExpenditure ?? 0) };
        })
      );

      // Keep the record with most items (then highest totals as tiebreaker)
      scored.sort((a, b) => b.itemCount - a.itemCount || b.total - a.total);
      const keep = scored[0];

      // Normalize the kept record's year format to use "-"
      const normalizedYear = keep.fy.year.replace("/", "-");
      if (keep.fy.year !== normalizedYear) {
        await ctx.db.patch(keep.fy._id, { year: normalizedYear });
      }

      // Delete duplicates and reassign any orphaned budget items
      for (let i = 1; i < scored.length; i++) {
        const dup = scored[i];
        // Move any budget items from the duplicate to the keeper
        const orphanItems = await ctx.db
          .query("budgetItems")
          .withIndex("by_fiscalYearId_and_category", (q) =>
            q.eq("fiscalYearId", dup.fy._id)
          )
          .collect();
        for (const item of orphanItems) {
          await ctx.db.patch(item._id, { fiscalYearId: keep.fy._id });
        }
        await ctx.db.delete(dup.fy._id);
        deleted++;
      }
    }

    return { deleted };
  },
});

/**
 * Admin: delete a specific fiscal year by ID.
 * Usage: npx convex run dataRefresh:adminDeleteFiscalYear '{"fiscalYearId":"<id>"}'
 */
export const adminDeleteFiscalYear = mutation({
  args: { fiscalYearId: v.id("fiscalYears") },
  handler: async (ctx, args) => {
    const fy = await ctx.db.get(args.fiscalYearId);
    if (!fy) return { deleted: false, reason: "not found" };

    // Also delete any budget items linked to this fiscal year
    const items = await ctx.db
      .query("budgetItems")
      .withIndex("by_fiscalYearId_and_category", (q) =>
        q.eq("fiscalYearId", args.fiscalYearId)
      )
      .collect();
    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    await ctx.db.delete(args.fiscalYearId);
    return { deleted: true, year: fy.year, itemsDeleted: items.length };
  },
});
