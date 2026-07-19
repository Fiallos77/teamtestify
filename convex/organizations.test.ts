import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

function newTestConvex() {
  return convexTest(schema, modules);
}

async function seedOrgWithMember(
  t: ReturnType<typeof newTestConvex>,
  role: "owner" | "member"
) {
  const authUserId = `user_${Math.random().toString(36).slice(2)}`;
  const organizationId = await t.run(async (ctx) => {
    const orgId = await ctx.db.insert("organizations", { name: "Acme", createdAt: Date.now() });
    await ctx.db.insert("organizationMembers", {
      organizationId: orgId,
      authUserId,
      role,
      createdAt: Date.now(),
    });
    await ctx.db.insert("userSettings", { authUserId, activeOrganizationId: orgId });
    return orgId;
  });
  return { organizationId, asUser: t.withIdentity({ subject: authUserId }) };
}

describe("organizations.requireOwnerContext", () => {
  test("resolves for an owner", async () => {
    const t = newTestConvex();
    const { organizationId, asUser } = await seedOrgWithMember(t, "owner");

    const result = await asUser.query(internal.organizations.requireOwnerContext, {});
    expect(result.organizationId).toBe(organizationId);
  });

  test("rejects a non-owner member", async () => {
    const t = newTestConvex();
    const { asUser } = await seedOrgWithMember(t, "member");

    await expect(asUser.query(internal.organizations.requireOwnerContext, {})).rejects.toThrow();
  });

  test("rejects an unauthenticated caller", async () => {
    const t = newTestConvex();

    await expect(t.query(internal.organizations.requireOwnerContext, {})).rejects.toThrow();
  });
});

describe("organizations.updateName", () => {
  async function getOrgName(
    t: ReturnType<typeof newTestConvex>,
    organizationId: Id<"organizations">
  ) {
    return await t.run(async (ctx) => (await ctx.db.get(organizationId))?.name);
  }

  test("renames the active organization for a member", async () => {
    const t = newTestConvex();
    const { organizationId, asUser } = await seedOrgWithMember(t, "owner");

    await asUser.mutation(api.organizations.updateName, { name: "New Name" });

    expect(await getOrgName(t, organizationId)).toBe("New Name");
  });

  test("trims surrounding whitespace", async () => {
    const t = newTestConvex();
    const { organizationId, asUser } = await seedOrgWithMember(t, "owner");

    await asUser.mutation(api.organizations.updateName, { name: "  Padded  " });

    expect(await getOrgName(t, organizationId)).toBe("Padded");
  });

  test("rejects a blank name", async () => {
    const t = newTestConvex();
    const { asUser } = await seedOrgWithMember(t, "owner");

    await expect(
      asUser.mutation(api.organizations.updateName, { name: "   " })
    ).rejects.toThrow();
  });

  test("rejects an unauthenticated caller", async () => {
    const t = newTestConvex();

    await expect(
      t.mutation(api.organizations.updateName, { name: "Nope" })
    ).rejects.toThrow();
  });
});
