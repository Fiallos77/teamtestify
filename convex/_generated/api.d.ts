/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as embed from "../embed.js";
import type * as embedPublic from "../embedPublic.js";
import type * as entitlements from "../entitlements.js";
import type * as http from "../http.js";
import type * as lib_aiProvider from "../lib/aiProvider.js";
import type * as lib_authz from "../lib/authz.js";
import type * as lib_email from "../lib/email.js";
import type * as lib_storage from "../lib/storage.js";
import type * as lib_stripeStatus from "../lib/stripeStatus.js";
import type * as lib_videoValidation from "../lib/videoValidation.js";
import type * as lib_widgetPayload from "../lib/widgetPayload.js";
import type * as notifications from "../notifications.js";
import type * as organizations from "../organizations.js";
import type * as public_ from "../public.js";
import type * as spaces from "../spaces.js";
import type * as storageCleanup from "../storageCleanup.js";
import type * as stripe from "../stripe.js";
import type * as stripeWebhook from "../stripeWebhook.js";
import type * as subscriptions from "../subscriptions.js";
import type * as testimonials from "../testimonials.js";
import type * as widgets from "../widgets.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  auth: typeof auth;
  crons: typeof crons;
  embed: typeof embed;
  embedPublic: typeof embedPublic;
  entitlements: typeof entitlements;
  http: typeof http;
  "lib/aiProvider": typeof lib_aiProvider;
  "lib/authz": typeof lib_authz;
  "lib/email": typeof lib_email;
  "lib/storage": typeof lib_storage;
  "lib/stripeStatus": typeof lib_stripeStatus;
  "lib/videoValidation": typeof lib_videoValidation;
  "lib/widgetPayload": typeof lib_widgetPayload;
  notifications: typeof notifications;
  organizations: typeof organizations;
  public: typeof public_;
  spaces: typeof spaces;
  storageCleanup: typeof storageCleanup;
  stripe: typeof stripe;
  stripeWebhook: typeof stripeWebhook;
  subscriptions: typeof subscriptions;
  testimonials: typeof testimonials;
  widgets: typeof widgets;
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

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
