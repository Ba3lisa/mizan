import { query } from "./_generated/server";


// Source URLs keyed by category — used for display in the admin data management page.
const SOURCE_URLS: Record<string, string> = {
  officials: "https://www.cabinet.gov.eg/English/TheMinistry/Pages/default.aspx",
  ministries: "https://www.cabinet.gov.eg/English/TheMinistry/Pages/default.aspx",
  governorates: "https://www.capmas.gov.eg",
  parliamentMembers: "https://www.parliament.gov.eg/en/MPs",
  parties: "https://www.parliament.gov.eg/en/MPs",
  constitutionArticles: "https://www.presidency.eg",
  fiscalYears: "https://www.mof.gov.eg/en/posts/statementsAndReports/5",
  budgetItems: "https://www.mof.gov.eg/en/posts/statementsAndReports/5",
  debtRecords: "https://www.cbe.org.eg/en/economic-research/statistics",
  elections: "https://www.elections.eg",
  dataRefreshLog: "",
  dataChangeLog: "",
};

// Maps a data category name to the dataRefreshLog category value used for
// querying last refresh status.
const CATEGORY_MAP: Record<
  string,
  | "government"
  | "parliament"
  | "constitution"
  | "budget"
  | "debt"
  | "all"
  | null
> = {
  officials: "government",
  ministries: "government",
  governorates: "government",
  parliamentMembers: "parliament",
  parties: "parliament",
  constitutionArticles: "constitution",
  fiscalYears: "budget",
  budgetItems: "budget",
  debtRecords: "debt",
  elections: null,
  dataRefreshLog: null,
  dataChangeLog: null,
};

type DataCategoryOverview = {
  tableName: string;
  recordCount: number;
  lastRefreshAt: number | null;
  lastRefreshStatus: "success" | "failed" | null;
  sourceUrl: string;
};

/**
 * Returns an overview of every data category for the admin data management page.
 * Includes record counts, last refresh timestamp + status, and the primary source URL.
 */
export const getDataOverview = query({
  args: {},
  handler: async (ctx): Promise<Record<string, DataCategoryOverview>> => {
    // Count each table. For large tables we use take(10000) as a practical upper
    // bound since Convex has no native count() operator. For the admin dashboard
    // these counts are indicative rather than exact when records exceed the limit.
    const [
      officials,
      ministries,
      governorates,
      parliamentMembers,
      parties,
      constitutionArticles,
      fiscalYears,
      budgetItems,
      debtRecords,
      elections,
      dataRefreshLog,
      dataChangeLog,
    ] = await Promise.all([
      ctx.db.query("officials").take(10000),
      ctx.db.query("ministries").take(10000),
      ctx.db.query("governorates").take(10000),
      ctx.db.query("parliamentMembers").take(10000),
      ctx.db.query("parties").take(10000),
      ctx.db.query("constitutionArticles").take(10000),
      ctx.db.query("fiscalYears").take(10000),
      ctx.db.query("budgetItems").take(10000),
      ctx.db.query("debtRecords").take(10000),
      ctx.db.query("elections").take(10000),
      ctx.db.query("dataRefreshLog").take(10000),
      ctx.db.query("dataChangeLog").take(10000),
    ]);

    // Helper: get the last refresh entry for a given log category.
    const getLastRefresh = async (
      category:
        | "government"
        | "parliament"
        | "constitution"
        | "budget"
        | "debt"
        | "all"
    ) => {
      // Most recent entry of any status for this category.
      return await ctx.db
        .query("dataRefreshLog")
        .withIndex("by_category_and_startedAt", (q) =>
          q.eq("category", category)
        )
        .order("desc")
        .first();
    };

    // Pre-fetch the refresh log entries we need (one per distinct log category).
    const [
      govRefresh,
      parliamentRefresh,
      constitutionRefresh,
      budgetRefresh,
      debtRefresh,
    ] = await Promise.all([
      getLastRefresh("government"),
      getLastRefresh("parliament"),
      getLastRefresh("constitution"),
      getLastRefresh("budget"),
      getLastRefresh("debt"),
    ]);

    const refreshByCategory = {
      government: govRefresh,
      parliament: parliamentRefresh,
      constitution: constitutionRefresh,
      budget: budgetRefresh,
      debt: debtRefresh,
    } as const;

    // Build an entry for each data category.
    const buildEntry = (
      tableName: string,
      records: unknown[],
      logCategory:
        | "government"
        | "parliament"
        | "constitution"
        | "budget"
        | "debt"
        | "all"
        | null
    ): DataCategoryOverview => {
      const logEntry =
        logCategory !== null && logCategory !== "all"
          ? refreshByCategory[logCategory]
          : null;

      const lastRefreshAt = logEntry
        ? (logEntry.completedAt ?? logEntry.startedAt)
        : null;
      // If no pipeline log exists but data is present (loaded by reference data), treat as success
      const lastRefreshStatus =
        logEntry &&
        (logEntry.status === "success" || logEntry.status === "failed")
          ? logEntry.status
          : records.length > 0
          ? ("success" as const)
          : null;

      return {
        tableName,
        recordCount: records.length,
        lastRefreshAt,
        lastRefreshStatus,
        sourceUrl: SOURCE_URLS[tableName] ?? "",
      };
    };

    const result: Record<string, DataCategoryOverview> = {
      officials: buildEntry("officials", officials, CATEGORY_MAP.officials),
      ministries: buildEntry("ministries", ministries, CATEGORY_MAP.ministries),
      governorates: buildEntry(
        "governorates",
        governorates,
        CATEGORY_MAP.governorates
      ),
      parliamentMembers: buildEntry(
        "parliamentMembers",
        parliamentMembers,
        CATEGORY_MAP.parliamentMembers
      ),
      parties: buildEntry("parties", parties, CATEGORY_MAP.parties),
      constitutionArticles: buildEntry(
        "constitutionArticles",
        constitutionArticles,
        CATEGORY_MAP.constitutionArticles
      ),
      fiscalYears: buildEntry(
        "fiscalYears",
        fiscalYears,
        CATEGORY_MAP.fiscalYears
      ),
      budgetItems: buildEntry(
        "budgetItems",
        budgetItems,
        CATEGORY_MAP.budgetItems
      ),
      debtRecords: buildEntry(
        "debtRecords",
        debtRecords,
        CATEGORY_MAP.debtRecords
      ),
      elections: buildEntry("elections", elections, CATEGORY_MAP.elections),
      dataRefreshLog: buildEntry(
        "dataRefreshLog",
        dataRefreshLog,
        CATEGORY_MAP.dataRefreshLog
      ),
      dataChangeLog: buildEntry(
        "dataChangeLog",
        dataChangeLog,
        CATEGORY_MAP.dataChangeLog
      ),
    };

    return result;
  },
});
