import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

function newTestConvex() {
  return convexTest(schema, modules);
}

async function seedOrgContext(t: ReturnType<typeof newTestConvex>) {
  const authUserId = `user_${Math.random().toString(36).slice(2)}`;
  const organizationId = await t.run(async (ctx) => {
    const orgId = await ctx.db.insert("organizations", { name: "Acme", createdAt: Date.now() });
    await ctx.db.insert("organizationMembers", {
      organizationId: orgId,
      authUserId,
      role: "owner",
      createdAt: Date.now(),
    });
    await ctx.db.insert("userSettings", { authUserId, activeOrganizationId: orgId });
    return orgId;
  });
  return { organizationId, asUser: t.withIdentity({ subject: authUserId }) };
}

async function makePro(t: ReturnType<typeof newTestConvex>, organizationId: Id<"organizations">) {
  await t.run(
    async (ctx) =>
      await ctx.db.insert("subscriptions", { organizationId, plan: "pro", status: "active" })
  );
}

const minimalFormConfig = {
  headline: "Tell us what you think",
  questions: [],
  collectRating: false,
  collectNameCompanyPhoto: false,
  allowText: true,
  allowVideo: true,
};

function createArgs(slug: string) {
  return {
    name: "My Space",
    publicSlug: slug,
    formConfig: minimalFormConfig,
    branding: {},
  };
}

describe("spaces.create entitlement enforcement", () => {
  test("free org can create its first space", async () => {
    const t = newTestConvex();
    const { asUser } = await seedOrgContext(t);

    await expect(
      asUser.mutation(api.spaces.create, createArgs("free-space-1"))
    ).resolves.toEqual(expect.any(String));
  });

  test("free org cannot create a second space", async () => {
    const t = newTestConvex();
    const { asUser } = await seedOrgContext(t);
    await asUser.mutation(api.spaces.create, createArgs("free-space-a"));

    await expect(
      asUser.mutation(api.spaces.create, createArgs("free-space-b"))
    ).rejects.toThrow();
  });

  test("pro org can create up to 5 spaces", async () => {
    const t = newTestConvex();
    const { organizationId, asUser } = await seedOrgContext(t);
    await makePro(t, organizationId);

    for (let i = 0; i < 5; i++) {
      await asUser.mutation(api.spaces.create, createArgs(`pro-space-${i}`));
    }

    await expect(
      asUser.mutation(api.spaces.create, createArgs("pro-space-6"))
    ).rejects.toThrow();
  });
});

describe("spaces.update public slug", () => {
  async function slugOf(
    t: ReturnType<typeof newTestConvex>,
    spaceId: Id<"spaces">
  ): Promise<string | undefined> {
    return await t.run(async (ctx) => (await ctx.db.get(spaceId))?.publicSlug);
  }

  test("changes the slug to a new unique value", async () => {
    const t = newTestConvex();
    const { asUser } = await seedOrgContext(t);
    const spaceId = await asUser.mutation(api.spaces.create, createArgs("original-slug"));

    await asUser.mutation(api.spaces.update, { spaceId, publicSlug: "renamed-slug" });

    expect(await slugOf(t, spaceId)).toBe("renamed-slug");
  });

  test("keeping the same slug is allowed", async () => {
    const t = newTestConvex();
    const { asUser } = await seedOrgContext(t);
    const spaceId = await asUser.mutation(api.spaces.create, createArgs("keep-slug"));

    await asUser.mutation(api.spaces.update, { spaceId, publicSlug: "keep-slug", name: "Renamed" });

    expect(await slugOf(t, spaceId)).toBe("keep-slug");
  });

  test("rejects a slug already taken by another space", async () => {
    const t = newTestConvex();
    const { organizationId, asUser } = await seedOrgContext(t);
    await makePro(t, organizationId);
    await asUser.mutation(api.spaces.create, createArgs("taken-slug"));
    const second = await asUser.mutation(api.spaces.create, createArgs("second-slug"));

    await expect(
      asUser.mutation(api.spaces.update, { spaceId: second, publicSlug: "taken-slug" })
    ).rejects.toThrow();
  });

  test("rejects a blank slug", async () => {
    const t = newTestConvex();
    const { asUser } = await seedOrgContext(t);
    const spaceId = await asUser.mutation(api.spaces.create, createArgs("some-slug"));

    await expect(
      asUser.mutation(api.spaces.update, { spaceId, publicSlug: "   " })
    ).rejects.toThrow();
  });
});

describe("spaces.getLogoUrl", () => {
  test("rejects an unauthenticated caller", async () => {
    const t = newTestConvex();
    const storageId = await t.run(async (ctx) => await ctx.storage.store(new Blob(["logo"])));

    await expect(t.query(api.spaces.getLogoUrl, { logoStorageId: storageId })).rejects.toThrow();
  });

  test("returns a servable URL for an authenticated org member", async () => {
    const t = newTestConvex();
    const { asUser } = await seedOrgContext(t);
    const storageId = await t.run(async (ctx) => await ctx.storage.store(new Blob(["logo"])));

    const url = await asUser.query(api.spaces.getLogoUrl, { logoStorageId: storageId });

    expect(typeof url).toBe("string");
  });
});
