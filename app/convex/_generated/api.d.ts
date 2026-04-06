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
import type * as agents_providers_anthropic from "../agents/providers/anthropic.js";
import type * as agents_providers_registry from "../agents/providers/registry.js";
import type * as agents_validators from "../agents/validators.js";
import type * as budget from "../budget.js";
import type * as constitution from "../constitution.js";
import type * as constitutionQueries from "../constitutionQueries.js";
import type * as council from "../council.js";
import type * as crons from "../crons.js";
import type * as data_referenceRecords from "../data/referenceRecords.js";
import type * as dataRefresh from "../dataRefresh.js";
import type * as debt from "../debt.js";
import type * as elections from "../elections.js";
import type * as funding from "../funding.js";
import type * as githubIssueQueries from "../githubIssueQueries.js";
import type * as government from "../government.js";
import type * as lineage from "../lineage.js";
import type * as maintenance from "../maintenance.js";
import type * as parliament from "../parliament.js";
import type * as referenceData from "../referenceData.js";
import type * as seedConstitutionMissing from "../seedConstitutionMissing.js";
import type * as seedData from "../seedData.js";
import type * as taxData from "../taxData.js";
import type * as transparency from "../transparency.js";

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
  "agents/providers/anthropic": typeof agents_providers_anthropic;
  "agents/providers/registry": typeof agents_providers_registry;
  "agents/validators": typeof agents_validators;
  budget: typeof budget;
  constitution: typeof constitution;
  constitutionQueries: typeof constitutionQueries;
  council: typeof council;
  crons: typeof crons;
  "data/referenceRecords": typeof data_referenceRecords;
  dataRefresh: typeof dataRefresh;
  debt: typeof debt;
  elections: typeof elections;
  funding: typeof funding;
  githubIssueQueries: typeof githubIssueQueries;
  government: typeof government;
  lineage: typeof lineage;
  maintenance: typeof maintenance;
  parliament: typeof parliament;
  referenceData: typeof referenceData;
  seedConstitutionMissing: typeof seedConstitutionMissing;
  seedData: typeof seedData;
  taxData: typeof taxData;
  transparency: typeof transparency;
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
