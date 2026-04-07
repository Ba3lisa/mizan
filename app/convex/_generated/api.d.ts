/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as adminDashboard from "../adminDashboard.js";
import type * as agents_constitutionAgent from "../agents/constitutionAgent.js";
import type * as agents_council from "../agents/council.js";
import type * as agents_dataAgent from "../agents/dataAgent.js";
import type * as agents_githubAgent from "../agents/githubAgent.js";
import type * as agents_maintenance from "../agents/maintenance.js";
import type * as agents_parliamentAgent from "../agents/parliamentAgent.js";
import type * as agents_parliamentScraper from "../agents/parliamentScraper.js";
import type * as agents_pollAgent from "../agents/pollAgent.js";
import type * as agents_providers_anthropic from "../agents/providers/anthropic.js";
import type * as agents_providers_councilPrompt from "../agents/providers/councilPrompt.js";
import type * as agents_providers_google from "../agents/providers/google.js";
import type * as agents_providers_openai from "../agents/providers/openai.js";
import type * as agents_providers_openrouter from "../agents/providers/openrouter.js";
import type * as agents_providers_registry from "../agents/providers/registry.js";
import type * as agents_providers_types from "../agents/providers/types.js";
import type * as agents_validators from "../agents/validators.js";
import type * as budget from "../budget.js";
import type * as constitution from "../constitution.js";
import type * as constitutionQueries from "../constitutionQueries.js";
import type * as council from "../council.js";
import type * as counts from "../counts.js";
import type * as crons from "../crons.js";
import type * as data_referenceRecords from "../data/referenceRecords.js";
import type * as dataRefresh from "../dataRefresh.js";
import type * as debt from "../debt.js";
import type * as debtInterestData from "../debtInterestData.js";
import type * as economy from "../economy.js";
import type * as elections from "../elections.js";
import type * as funding from "../funding.js";
import type * as githubIssueQueries from "../githubIssueQueries.js";
import type * as government from "../government.js";
import type * as governmentCleanup from "../governmentCleanup.js";
import type * as imfData from "../imfData.js";
import type * as lib_tokenCost from "../lib/tokenCost.js";
import type * as lib_urlValidator from "../lib/urlValidator.js";
import type * as lineage from "../lineage.js";
import type * as maintenance from "../maintenance.js";
import type * as parliament from "../parliament.js";
import type * as parliamentCleanup from "../parliamentCleanup.js";
import type * as parliamentQueries from "../parliamentQueries.js";
import type * as pipelineProgress from "../pipelineProgress.js";
import type * as polls from "../polls.js";
import type * as ratings from "../ratings.js";
import type * as ratingsData from "../ratingsData.js";
import type * as referenceData from "../referenceData.js";
import type * as regionalData from "../regionalData.js";
import type * as seedConstitutionMissing from "../seedConstitutionMissing.js";
import type * as seedData from "../seedData.js";
import type * as sources from "../sources.js";
import type * as taxData from "../taxData.js";
import type * as testFetch from "../testFetch.js";
import type * as tools from "../tools.js";
import type * as transparency from "../transparency.js";
import type * as usage from "../usage.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  adminDashboard: typeof adminDashboard;
  "agents/constitutionAgent": typeof agents_constitutionAgent;
  "agents/council": typeof agents_council;
  "agents/dataAgent": typeof agents_dataAgent;
  "agents/githubAgent": typeof agents_githubAgent;
  "agents/maintenance": typeof agents_maintenance;
  "agents/parliamentAgent": typeof agents_parliamentAgent;
  "agents/parliamentScraper": typeof agents_parliamentScraper;
  "agents/pollAgent": typeof agents_pollAgent;
  "agents/providers/anthropic": typeof agents_providers_anthropic;
  "agents/providers/councilPrompt": typeof agents_providers_councilPrompt;
  "agents/providers/google": typeof agents_providers_google;
  "agents/providers/openai": typeof agents_providers_openai;
  "agents/providers/openrouter": typeof agents_providers_openrouter;
  "agents/providers/registry": typeof agents_providers_registry;
  "agents/providers/types": typeof agents_providers_types;
  "agents/validators": typeof agents_validators;
  budget: typeof budget;
  constitution: typeof constitution;
  constitutionQueries: typeof constitutionQueries;
  council: typeof council;
  counts: typeof counts;
  crons: typeof crons;
  "data/referenceRecords": typeof data_referenceRecords;
  dataRefresh: typeof dataRefresh;
  debt: typeof debt;
  debtInterestData: typeof debtInterestData;
  economy: typeof economy;
  elections: typeof elections;
  funding: typeof funding;
  githubIssueQueries: typeof githubIssueQueries;
  government: typeof government;
  governmentCleanup: typeof governmentCleanup;
  imfData: typeof imfData;
  "lib/tokenCost": typeof lib_tokenCost;
  "lib/urlValidator": typeof lib_urlValidator;
  lineage: typeof lineage;
  maintenance: typeof maintenance;
  parliament: typeof parliament;
  parliamentCleanup: typeof parliamentCleanup;
  parliamentQueries: typeof parliamentQueries;
  pipelineProgress: typeof pipelineProgress;
  polls: typeof polls;
  ratings: typeof ratings;
  ratingsData: typeof ratingsData;
  referenceData: typeof referenceData;
  regionalData: typeof regionalData;
  seedConstitutionMissing: typeof seedConstitutionMissing;
  seedData: typeof seedData;
  sources: typeof sources;
  taxData: typeof taxData;
  testFetch: typeof testFetch;
  tools: typeof tools;
  transparency: typeof transparency;
  usage: typeof usage;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
