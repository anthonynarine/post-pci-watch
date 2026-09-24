/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as audit from "../audit.js";
import type * as authz from "../authz.js";
import type * as eventRules from "../eventRules.js";
import type * as fixtures from "../fixtures.js";
import type * as measurements from "../measurements.js";
import type * as migrations from "../migrations.js";
import type * as monitoringEvents from "../monitoringEvents.js";
import type * as patients from "../patients.js";
import type * as simulator from "../simulator.js";
import type * as simulatorModel from "../simulatorModel.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  audit: typeof audit;
  authz: typeof authz;
  eventRules: typeof eventRules;
  fixtures: typeof fixtures;
  measurements: typeof measurements;
  migrations: typeof migrations;
  monitoringEvents: typeof monitoringEvents;
  patients: typeof patients;
  simulator: typeof simulator;
  simulatorModel: typeof simulatorModel;
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
