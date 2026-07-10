import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

function newTestConvex() {
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  return t;
}

const minimalFormConfig = {
  headline: "Tell us what you think",
  questions: [],
  collectRating: false,
  collectNameCompanyPhoto: false,
  allowText: true,
  allowVideo: true,
};

async function seedSpace(
  t: ReturnType<typeof newTestConvex>,
  overrides: { isActive?: boolean; slug?: string } = {}
): Promise<Id<"spaces">> {
  return await t.run(async (ctx) => {
    const organizationId = await ctx.db.insert("organizations", {
      name: "Acme",
      createdAt: Date.now(),
    });
    return await ctx.db.insert("spaces", {
      organizationId,
      name: "Launch feedback",
      publicSlug: overrides.slug ?? `space-${Math.random().toString(36).slice(2)}`,
      formConfig: minimalFormConfig,
      branding: {},
      isActive: overrides.isActive ?? true,
      createdAt: Date.now(),
    });
  });
}

describe("public.generateUploadUrl", () => {
  test("rejects when the space does not exist", async () => {
    const t = newTestConvex();
    const bogusSpaceId = await t.run(async (ctx) => {
      const organizationId = await ctx.db.insert("organizations", {
        name: "Acme",
        createdAt: Date.now(),
      });
      const spaceId = await ctx.db.insert("spaces", {
        organizationId,
        name: "temp",
        publicSlug: "temp-slug",
        formConfig: minimalFormConfig,
        branding: {},
        isActive: true,
        createdAt: Date.now(),
      });
      await ctx.db.delete(spaceId);
      return spaceId;
    });

    await expect(
      t.mutation(api.public.generateUploadUrl, {
        spaceId: bogusSpaceId,
        visitorId: "visitor-1",
      })
    ).rejects.toThrow();
  });

  test("rejects when the space is disabled", async () => {
    const t = newTestConvex();
    const spaceId = await seedSpace(t, { isActive: false });

    await expect(
      t.mutation(api.public.generateUploadUrl, {
        spaceId,
        visitorId: "visitor-1",
      })
    ).rejects.toThrow();
  });

  test("allows up to 5 uploads per hour for a single visitor, then blocks", async () => {
    const t = newTestConvex();
    const spaceId = await seedSpace(t);

    for (let i = 0; i < 5; i++) {
      const url = await t.mutation(api.public.generateUploadUrl, {
        spaceId,
        visitorId: "same-visitor",
      });
      expect(typeof url).toBe("string");
      expect(url.length).toBeGreaterThan(0);
    }

    await expect(
      t.mutation(api.public.generateUploadUrl, {
        spaceId,
        visitorId: "same-visitor",
      })
    ).rejects.toThrow();
  });

  test("20 rapid requests from the same visitor: only the first 5 succeed", async () => {
    const t = newTestConvex();
    const spaceId = await seedSpace(t);

    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () =>
        t.mutation(api.public.generateUploadUrl, {
          spaceId,
          visitorId: "flood-visitor",
        })
      )
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    expect(succeeded).toBe(5);
    expect(failed).toBe(15);
  });

  test("different visitors on the same space share a 50/day space-wide cap", async () => {
    const t = newTestConvex();
    const spaceId = await seedSpace(t);

    for (let i = 0; i < 50; i++) {
      await expect(
        t.mutation(api.public.generateUploadUrl, {
          spaceId,
          visitorId: `visitor-${i}`,
        })
      ).resolves.toEqual(expect.any(String));
    }

    await expect(
      t.mutation(api.public.generateUploadUrl, {
        spaceId,
        visitorId: "visitor-51",
      })
    ).rejects.toThrow();
  });

  test("the per-visitor limit is scoped per visitor, not global", async () => {
    const t = newTestConvex();
    const spaceId = await seedSpace(t);

    for (let i = 0; i < 5; i++) {
      await t.mutation(api.public.generateUploadUrl, {
        spaceId,
        visitorId: "visitor-a",
      });
    }
    // A different visitor on the same space still has their own budget.
    await expect(
      t.mutation(api.public.generateUploadUrl, {
        spaceId,
        visitorId: "visitor-b",
      })
    ).resolves.toEqual(expect.any(String));
  });
});
