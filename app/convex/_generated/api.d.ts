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
import type * as agents_dataAgent from "../agents/dataAgent.js";
import type * as agents_githubAgent from "../agents/githubAgent.js";
import type * as agents_validators from "../agents/validators.js";
import type * as budget from "../budget.js";
import type * as constitution from "../constitution.js";
import type * as crons from "../crons.js";
import type * as dataRefresh from "../dataRefresh.js";
import type * as debt from "../debt.js";
import type * as elections from "../elections.js";
import type * as government from "../government.js";
import type * as lineage from "../lineage.js";
import type * as parliament from "../parliament.js";
import type * as seedConstitutionMissing from "../seedConstitutionMissing.js";
import type * as seedData from "../seedData.js";
import type * as transparency from "../transparency.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  adminDashboard: typeof adminDashboard;
  "agents/dataAgent": typeof agents_dataAgent;
  "agents/githubAgent": typeof agents_githubAgent;
  "agents/validators": typeof agents_validators;
  budget: typeof budget;
  constitution: typeof constitution;
  crons: typeof crons;
  dataRefresh: typeof dataRefresh;
  debt: typeof debt;
  elections: typeof elections;
  government: typeof government;
  lineage: typeof lineage;
  parliament: typeof parliament;
  seedConstitutionMissing: typeof seedConstitutionMissing;
  seedData: typeof seedData;
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
