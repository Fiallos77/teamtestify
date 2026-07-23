import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

function newTestConvex() {
  return convexTest(schema, modules);
}

describe("userSettings.hasAcceptedTerms", () => {
  test("false for a user with no userSettings row at all", async () => {
    const t = newTestConvex();
    const authUserId = `user_${Math.random().toString(36).slice(2)}`;
    const asUser = t.withIdentity({ subject: authUserId });

    expect(await asUser.query(api.userSettings.hasAcceptedTerms, {})).toBe(false);
  });

  test("false for a user with a userSettings row that hasn't accepted", async () => {
    const t = newTestConvex();
    const authUserId = `user_${Math.random().toString(36).slice(2)}`;
    await t.run(async (ctx) => {
      await ctx.db.insert("userSettings", { authUserId });
    });
    const asUser = t.withIdentity({ subject: authUserId });

    expect(await asUser.query(api.userSettings.hasAcceptedTerms, {})).toBe(false);
  });

  test("true after acceptTerms has been called", async () => {
    const t = newTestConvex();
    const authUserId = `user_${Math.random().toString(36).slice(2)}`;
    const asUser = t.withIdentity({ subject: authUserId });

    await asUser.mutation(api.userSettings.acceptTerms, {});

    expect(await asUser.query(api.userSettings.hasAcceptedTerms, {})).toBe(true);
  });

  test("false for an unauthenticated caller", async () => {
    const t = newTestConvex();
    expect(await t.query(api.userSettings.hasAcceptedTerms, {})).toBe(false);
  });
});

describe("userSettings.acceptTerms", () => {
  test("creates a userSettings row when none exists yet", async () => {
    const t = newTestConvex();
    const authUserId = `user_${Math.random().toString(36).slice(2)}`;
    const asUser = t.withIdentity({ subject: authUserId });

    await asUser.mutation(api.userSettings.acceptTerms, {});

    const settings = await t.run(async (ctx) =>
      ctx.db
        .query("userSettings")
        .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUserId))
        .unique()
    );
    expect(settings?.acceptedTermsAt).toBeTypeOf("number");
  });

  test("preserves an existing activeOrganizationId when accepting terms later", async () => {
    const t = newTestConvex();
    const authUserId = `user_${Math.random().toString(36).slice(2)}`;
    const organizationId = await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", { name: "Acme", createdAt: Date.now() });
      await ctx.db.insert("userSettings", { authUserId, activeOrganizationId: orgId });
      return orgId;
    });
    const asUser = t.withIdentity({ subject: authUserId });

    await asUser.mutation(api.userSettings.acceptTerms, {});

    const settings = await t.run(async (ctx) =>
      ctx.db
        .query("userSettings")
        .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUserId))
        .unique()
    );
    expect(settings?.activeOrganizationId).toBe(organizationId);
    expect(settings?.acceptedTermsAt).toBeTypeOf("number");
  });

  test("rejects an unauthenticated caller", async () => {
    const t = newTestConvex();
    await expect(t.mutation(api.userSettings.acceptTerms, {})).rejects.toThrow();
  });
});
