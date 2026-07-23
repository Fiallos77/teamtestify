import { mutation, query } from "./_generated/server";
import { AuthzError } from "./lib/authz";

export const hasAcceptedTerms = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", identity.subject))
      .unique();
    return settings?.acceptedTermsAt !== undefined;
  },
});

export const acceptTerms = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new AuthzError("Unauthenticated");
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", identity.subject))
      .unique();
    if (settings) {
      await ctx.db.patch(settings._id, { acceptedTermsAt: Date.now() });
    } else {
      await ctx.db.insert("userSettings", {
        authUserId: identity.subject,
        acceptedTermsAt: Date.now(),
      });
    }
  },
});
