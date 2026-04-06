// Reference data loading system for Mizan.
//
// These are internalMutations that check if a table is empty before inserting.
// If the table already has data, each function skips with zero writes.
// Cross-table ID references are remapped via in-memory maps built during insertion.
//
// Entry point: ensureAllReferenceData (called from orchestrateRefresh)

import { internalMutation, MutationCtx } from "./_generated/server";

import {
  ref_officials,
  ref_governorates,
  ref_parties,
  ref_constitutionParts,
  ref_constitutionArticles,
  ref_articleCrossReferences,
  ref_elections,
  ref_electionResults,
  ref_governorateElectionData,
  ref_committees,
  ref_committeeMemberships,
  ref_dataSources,
  ref_ministries,
  ref_parliamentMembers,
  ref_budgetItems,
  ref_debtByCreditor,
  ref_debtRecords,
  ref_fiscalYears,
} from "./data/referenceRecords";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type GroupReport = {
  group: string;
  skipped: boolean;
  tablesLoaded: string[];
  recordsInserted: number;
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Remap a required field using an ID map. Throws if not found. */
function remapId(
  idMap: Record<string, string>,
  oldId: string,
  fieldDesc: string
): string {
  const newId = idMap[oldId];
  if (!newId) {
    throw new Error(
      `[referenceData] Cannot remap ${fieldDesc}: backup ID "${oldId}" not found in map`
    );
  }
  return newId;
}

/** Remap an optional field using an ID map. Returns undefined if the field is absent. */
function remapOptionalId(
  idMap: Record<string, string>,
  oldId: string | undefined,
  fieldDesc: string
): string | undefined {
  if (!oldId) return undefined;
  return remapId(idMap, oldId, fieldDesc);
}

// ─── GROUP HANDLERS (plain async functions, called by ensureAllReferenceData) ─

async function loadMetadata(ctx: MutationCtx): Promise<GroupReport> {
  const existing = await ctx.db.query("dataSources").collect();
  if (existing.length > 0) {
    return { group: "metadata", skipped: true, tablesLoaded: [], recordsInserted: 0 };
  }
  let count = 0;
  for (const rec of ref_dataSources) {
    const { _backupId: _b, ...doc } = rec;
    await ctx.db.insert("dataSources", doc as Parameters<typeof ctx.db.insert<"dataSources">>[1]);
    count++;
  }
  return { group: "metadata", skipped: false, tablesLoaded: ["dataSources"], recordsInserted: count };
}

async function loadGovernmentStructure(ctx: MutationCtx): Promise<GroupReport> {
  const existingOfficials = await ctx.db.query("officials").collect();
  if (existingOfficials.length > 0) {
    return { group: "government", skipped: true, tablesLoaded: [], recordsInserted: 0 };
  }

  // Insert officials first, build ID map
  const officialsIdMap: Record<string, string> = {};
  for (const rec of ref_officials) {
    const { _backupId, ...doc } = rec;
    const newId = await ctx.db.insert("officials", doc as Parameters<typeof ctx.db.insert<"officials">>[1]);
    officialsIdMap[_backupId] = newId as string;
  }

  // Insert ministries with remapped currentMinisterId
  for (const rec of ref_ministries) {
    const { _backupId: _b, currentMinisterId, ...rest } =
      rec as typeof rec & { currentMinisterId?: string };
    const doc: Record<string, unknown> = { ...rest };
    if (currentMinisterId) {
      doc["currentMinisterId"] = remapId(
        officialsIdMap,
        currentMinisterId,
        "ministries.currentMinisterId"
      );
    }
    await ctx.db.insert("ministries", doc as Parameters<typeof ctx.db.insert<"ministries">>[1]);
  }

  const count = ref_officials.length + ref_ministries.length;
  return {
    group: "government",
    skipped: false,
    tablesLoaded: ["officials", "ministries"],
    recordsInserted: count,
  };
}

async function loadGeographicData(ctx: MutationCtx): Promise<GroupReport> {
  const existing = await ctx.db.query("governorates").collect();
  if (existing.length > 0) {
    return { group: "geographic", skipped: true, tablesLoaded: [], recordsInserted: 0 };
  }

  // Governorates: backup has no currentGovernorId set, so insert directly
  for (const rec of ref_governorates) {
    const { _backupId: _b, ...doc } = rec;
    await ctx.db.insert("governorates", doc as Parameters<typeof ctx.db.insert<"governorates">>[1]);
  }

  return {
    group: "geographic",
    skipped: false,
    tablesLoaded: ["governorates"],
    recordsInserted: ref_governorates.length,
  };
}

async function loadParliamentData(ctx: MutationCtx): Promise<GroupReport> {
  const existing = await ctx.db.query("parties").collect();
  if (existing.length > 0) {
    return { group: "parliament", skipped: true, tablesLoaded: [], recordsInserted: 0 };
  }

  // Rebuild officials ID map by matching nameEn against what was already inserted
  const allOfficials = await ctx.db.query("officials").collect();
  const officialsByName: Record<string, string> = {};
  for (const o of allOfficials) {
    officialsByName[o.nameEn] = o._id as string;
  }
  const officialsIdMap: Record<string, string> = {};
  for (const rec of ref_officials) {
    const newId = officialsByName[rec["nameEn"] as string];
    if (newId) officialsIdMap[rec._backupId] = newId;
  }

  // Rebuild governorates ID map by matching nameEn
  const allGovernorates = await ctx.db.query("governorates").collect();
  const govByName: Record<string, string> = {};
  for (const g of allGovernorates) {
    govByName[g.nameEn] = g._id as string;
  }
  const governoratesIdMap: Record<string, string> = {};
  for (const rec of ref_governorates) {
    const newId = govByName[rec["nameEn"] as string];
    if (newId) governoratesIdMap[rec._backupId] = newId;
  }

  // Insert parties
  const partiesIdMap: Record<string, string> = {};
  for (const rec of ref_parties) {
    const { _backupId, ...doc } = rec;
    const newId = await ctx.db.insert("parties", doc as Parameters<typeof ctx.db.insert<"parties">>[1]);
    partiesIdMap[_backupId] = newId as string;
  }

  // Insert parliamentMembers with remapped IDs
  const pmIdMap: Record<string, string> = {};
  for (const rec of ref_parliamentMembers) {
    const { _backupId, officialId, partyId, governorateId, ...rest } =
      rec as typeof rec & { officialId: string; partyId?: string; governorateId?: string };
    const doc: Record<string, unknown> = { ...rest };
    doc["officialId"] = remapId(officialsIdMap, officialId, "parliamentMembers.officialId");
    if (partyId) {
      doc["partyId"] = remapOptionalId(partiesIdMap, partyId, "parliamentMembers.partyId");
    }
    if (governorateId) {
      doc["governorateId"] = remapOptionalId(
        governoratesIdMap,
        governorateId,
        "parliamentMembers.governorateId"
      );
    }
    const newId = await ctx.db.insert(
      "parliamentMembers",
      doc as Parameters<typeof ctx.db.insert<"parliamentMembers">>[1]
    );
    pmIdMap[_backupId] = newId as string;
  }

  // Insert committees
  const committeesIdMap: Record<string, string> = {};
  for (const rec of ref_committees) {
    const { _backupId, chairpersonId, ...rest } =
      rec as typeof rec & { chairpersonId?: string };
    const doc: Record<string, unknown> = { ...rest };
    if (chairpersonId) {
      doc["chairpersonId"] = remapOptionalId(
        officialsIdMap,
        chairpersonId,
        "committees.chairpersonId"
      );
    }
    const newId = await ctx.db.insert(
      "committees",
      doc as Parameters<typeof ctx.db.insert<"committees">>[1]
    );
    committeesIdMap[_backupId] = newId as string;
  }

  // Insert committeeMemberships
  for (const rec of ref_committeeMemberships) {
    const { _backupId: _b, committeeId, memberId, ...rest } =
      rec as typeof rec & { committeeId: string; memberId: string };
    const doc: Record<string, unknown> = { ...rest };
    doc["committeeId"] = remapId(committeesIdMap, committeeId, "committeeMemberships.committeeId");
    doc["memberId"] = remapId(pmIdMap, memberId, "committeeMemberships.memberId");
    await ctx.db.insert(
      "committeeMemberships",
      doc as Parameters<typeof ctx.db.insert<"committeeMemberships">>[1]
    );
  }

  const count =
    ref_parties.length +
    ref_parliamentMembers.length +
    ref_committees.length +
    ref_committeeMemberships.length;

  return {
    group: "parliament",
    skipped: false,
    tablesLoaded: ["parties", "parliamentMembers", "committees", "committeeMemberships"],
    recordsInserted: count,
  };
}

async function loadConstitutionData(ctx: MutationCtx): Promise<GroupReport> {
  const existing = await ctx.db.query("constitutionParts").collect();
  if (existing.length > 0) {
    return { group: "constitution", skipped: true, tablesLoaded: [], recordsInserted: 0 };
  }

  // Insert constitutionParts
  const partsIdMap: Record<string, string> = {};
  for (const rec of ref_constitutionParts) {
    const { _backupId, ...doc } = rec;
    const newId = await ctx.db.insert(
      "constitutionParts",
      doc as Parameters<typeof ctx.db.insert<"constitutionParts">>[1]
    );
    partsIdMap[_backupId] = newId as string;
  }

  // Insert constitutionArticles
  const articlesIdMap: Record<string, string> = {};
  for (const rec of ref_constitutionArticles) {
    const { _backupId, partId, ...rest } =
      rec as typeof rec & { partId: string };
    const doc: Record<string, unknown> = { ...rest };
    doc["partId"] = remapId(partsIdMap, partId, "constitutionArticles.partId");
    const newId = await ctx.db.insert(
      "constitutionArticles",
      doc as Parameters<typeof ctx.db.insert<"constitutionArticles">>[1]
    );
    articlesIdMap[_backupId] = newId as string;
  }

  // Insert articleCrossReferences
  for (const rec of ref_articleCrossReferences) {
    const { _backupId: _b, fromArticleId, toArticleId, ...rest } =
      rec as typeof rec & { fromArticleId: string; toArticleId: string };
    const doc: Record<string, unknown> = { ...rest };
    doc["fromArticleId"] = remapId(
      articlesIdMap,
      fromArticleId,
      "articleCrossReferences.fromArticleId"
    );
    doc["toArticleId"] = remapId(articlesIdMap, toArticleId, "articleCrossReferences.toArticleId");
    await ctx.db.insert(
      "articleCrossReferences",
      doc as Parameters<typeof ctx.db.insert<"articleCrossReferences">>[1]
    );
  }

  const count =
    ref_constitutionParts.length +
    ref_constitutionArticles.length +
    ref_articleCrossReferences.length;

  return {
    group: "constitution",
    skipped: false,
    tablesLoaded: ["constitutionParts", "constitutionArticles", "articleCrossReferences"],
    recordsInserted: count,
  };
}

async function loadBudgetData(ctx: MutationCtx): Promise<GroupReport> {
  const existing = await ctx.db.query("fiscalYears").collect();
  if (existing.length > 0) {
    return { group: "budget", skipped: true, tablesLoaded: [], recordsInserted: 0 };
  }

  // Insert fiscalYears
  const fiscalYearsIdMap: Record<string, string> = {};
  for (const rec of ref_fiscalYears) {
    const { _backupId, ...doc } = rec;
    const newId = await ctx.db.insert(
      "fiscalYears",
      doc as Parameters<typeof ctx.db.insert<"fiscalYears">>[1]
    );
    fiscalYearsIdMap[_backupId] = newId as string;
  }

  // Insert budgetItems
  for (const rec of ref_budgetItems) {
    const { _backupId: _b, fiscalYearId, ...rest } =
      rec as typeof rec & { fiscalYearId: string };
    const doc: Record<string, unknown> = { ...rest };
    doc["fiscalYearId"] = remapId(fiscalYearsIdMap, fiscalYearId, "budgetItems.fiscalYearId");
    await ctx.db.insert(
      "budgetItems",
      doc as Parameters<typeof ctx.db.insert<"budgetItems">>[1]
    );
  }

  const count = ref_fiscalYears.length + ref_budgetItems.length;
  return {
    group: "budget",
    skipped: false,
    tablesLoaded: ["fiscalYears", "budgetItems"],
    recordsInserted: count,
  };
}

async function loadDebtData(ctx: MutationCtx): Promise<GroupReport> {
  const existing = await ctx.db.query("debtRecords").collect();
  if (existing.length > 0) {
    return { group: "debt", skipped: true, tablesLoaded: [], recordsInserted: 0 };
  }

  // Insert debtRecords
  const debtRecordsIdMap: Record<string, string> = {};
  for (const rec of ref_debtRecords) {
    const { _backupId, ...doc } = rec;
    const newId = await ctx.db.insert(
      "debtRecords",
      doc as Parameters<typeof ctx.db.insert<"debtRecords">>[1]
    );
    debtRecordsIdMap[_backupId] = newId as string;
  }

  // Insert debtByCreditor
  for (const rec of ref_debtByCreditor) {
    const { _backupId: _b, debtRecordId, ...rest } =
      rec as typeof rec & { debtRecordId: string };
    const doc: Record<string, unknown> = { ...rest };
    doc["debtRecordId"] = remapId(debtRecordsIdMap, debtRecordId, "debtByCreditor.debtRecordId");
    await ctx.db.insert(
      "debtByCreditor",
      doc as Parameters<typeof ctx.db.insert<"debtByCreditor">>[1]
    );
  }

  const count = ref_debtRecords.length + ref_debtByCreditor.length;
  return {
    group: "debt",
    skipped: false,
    tablesLoaded: ["debtRecords", "debtByCreditor"],
    recordsInserted: count,
  };
}

async function loadElectionData(ctx: MutationCtx): Promise<GroupReport> {
  const existing = await ctx.db.query("elections").collect();
  if (existing.length > 0) {
    return { group: "elections", skipped: true, tablesLoaded: [], recordsInserted: 0 };
  }

  // Rebuild governorates ID map by nameEn
  const allGovernorates = await ctx.db.query("governorates").collect();
  const govByName: Record<string, string> = {};
  for (const g of allGovernorates) {
    govByName[g.nameEn] = g._id as string;
  }
  const governoratesIdMap: Record<string, string> = {};
  for (const rec of ref_governorates) {
    const newId = govByName[rec["nameEn"] as string];
    if (newId) governoratesIdMap[rec._backupId] = newId;
  }

  // Insert elections
  const electionsIdMap: Record<string, string> = {};
  for (const rec of ref_elections) {
    const { _backupId, ...doc } = rec;
    const newId = await ctx.db.insert(
      "elections",
      doc as Parameters<typeof ctx.db.insert<"elections">>[1]
    );
    electionsIdMap[_backupId] = newId as string;
  }

  // Insert electionResults
  for (const rec of ref_electionResults) {
    const { _backupId: _b, electionId, ...rest } =
      rec as typeof rec & { electionId: string };
    const doc: Record<string, unknown> = { ...rest };
    doc["electionId"] = remapId(electionsIdMap, electionId, "electionResults.electionId");
    await ctx.db.insert(
      "electionResults",
      doc as Parameters<typeof ctx.db.insert<"electionResults">>[1]
    );
  }

  // Insert governorateElectionData
  for (const rec of ref_governorateElectionData) {
    const { _backupId: _b, electionId, governorateId, ...rest } =
      rec as typeof rec & { electionId: string; governorateId: string };
    const doc: Record<string, unknown> = { ...rest };
    doc["electionId"] = remapId(electionsIdMap, electionId, "governorateElectionData.electionId");
    doc["governorateId"] = remapId(
      governoratesIdMap,
      governorateId,
      "governorateElectionData.governorateId"
    );
    await ctx.db.insert(
      "governorateElectionData",
      doc as Parameters<typeof ctx.db.insert<"governorateElectionData">>[1]
    );
  }

  const count =
    ref_elections.length + ref_electionResults.length + ref_governorateElectionData.length;

  return {
    group: "elections",
    skipped: false,
    tablesLoaded: ["elections", "electionResults", "governorateElectionData"],
    recordsInserted: count,
  };
}

// ─── EXPORTED MUTATIONS ───────────────────────────────────────────────────────
// Each can be called individually if needed (e.g. from admin dashboard or manual trigger).

export const ensureMetadata = internalMutation({
  args: {},
  handler: async (ctx): Promise<GroupReport> => loadMetadata(ctx),
});

export const ensureGovernmentStructure = internalMutation({
  args: {},
  handler: async (ctx): Promise<GroupReport> => loadGovernmentStructure(ctx),
});

export const ensureGeographicData = internalMutation({
  args: {},
  handler: async (ctx): Promise<GroupReport> => loadGeographicData(ctx),
});

export const ensureParliamentData = internalMutation({
  args: {},
  handler: async (ctx): Promise<GroupReport> => loadParliamentData(ctx),
});

export const ensureConstitutionData = internalMutation({
  args: {},
  handler: async (ctx): Promise<GroupReport> => loadConstitutionData(ctx),
});

export const ensureBudgetData = internalMutation({
  args: {},
  handler: async (ctx): Promise<GroupReport> => loadBudgetData(ctx),
});

export const ensureDebtData = internalMutation({
  args: {},
  handler: async (ctx): Promise<GroupReport> => loadDebtData(ctx),
});

export const ensureElectionData = internalMutation({
  args: {},
  handler: async (ctx): Promise<GroupReport> => loadElectionData(ctx),
});

// ─── ORCHESTRATOR ─────────────────────────────────────────────────────────────
// Run all groups in dependency order. Each group checks emptiness before writing.
// Dependency order:
//   metadata (no deps)
//   government: officials -> ministries
//   geographic: governorates
//   parliament: parties -> parliamentMembers (needs officials + governorates) -> committees -> committeeMemberships
//   constitution: constitutionParts -> constitutionArticles -> articleCrossReferences
//   budget: fiscalYears -> budgetItems
//   debt: debtRecords -> debtByCreditor
//   elections: elections -> electionResults, governorateElectionData (needs governorates)

export const ensureAllReferenceData = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ totalInserted: number; groups: GroupReport[] }> => {
    console.log("[referenceData] Checking reference data tables...");

    const groups: GroupReport[] = [];

    groups.push(await loadMetadata(ctx));
    groups.push(await loadGovernmentStructure(ctx));
    groups.push(await loadGeographicData(ctx));
    groups.push(await loadParliamentData(ctx));
    groups.push(await loadConstitutionData(ctx));
    groups.push(await loadBudgetData(ctx));
    groups.push(await loadDebtData(ctx));
    groups.push(await loadElectionData(ctx));

    const totalInserted = groups.reduce((sum, g) => sum + g.recordsInserted, 0);
    const loadedGroups = groups.filter((g) => !g.skipped);

    if (totalInserted > 0) {
      console.log(
        `[referenceData] Loaded ${totalInserted} records across ${loadedGroups.length} group(s): ${loadedGroups.map((g) => g.group).join(", ")}`
      );
    } else {
      console.log(
        "[referenceData] All reference tables already populated — no writes needed."
      );
    }

    return { totalInserted, groups };
  },
});
