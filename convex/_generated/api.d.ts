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
import type * as admirers from "../admirers.js";
import type * as albums from "../albums.js";
import type * as crons from "../crons.js";
import type * as dev from "../dev.js";
import type * as lib_moderationCheck from "../lib/moderationCheck.js";
import type * as lookingNow from "../lookingNow.js";
import type * as messages from "../messages.js";
import type * as moderation from "../moderation.js";
import type * as pushNotifications from "../pushNotifications.js";
import type * as pushNotificationsNode from "../pushNotificationsNode.js";
import type * as referrals from "../referrals.js";
import type * as users from "../users.js";
import type * as venues from "../venues.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  admirers: typeof admirers;
  albums: typeof albums;
  crons: typeof crons;
  dev: typeof dev;
  "lib/moderationCheck": typeof lib_moderationCheck;
  lookingNow: typeof lookingNow;
  messages: typeof messages;
  moderation: typeof moderation;
  pushNotifications: typeof pushNotifications;
  pushNotificationsNode: typeof pushNotificationsNode;
  referrals: typeof referrals;
  users: typeof users;
  venues: typeof venues;
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
