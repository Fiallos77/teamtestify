import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

function newTestConvex() {
  return convexTest(schema, modules);
}

async function seedSpace(t: ReturnType<typeof newTestConvex>): Promise<Id<"spaces">> {
  const organizationId = await t.run(
    async (ctx) => await ctx.db.insert("organizations", { name: "Acme", createdAt: Date.now() })
  );
  return await t.run(
    async (ctx) =>
      await ctx.db.insert("spaces", {
        organizationId,
        name: "Acme Fitness",
        publicSlug: `acme-${Math.random().toString(36).slice(2)}`,
        formConfig: {
          headline: "Loved by our members",
          questions: [],
          collectRating: false,
          collectNameCompanyPhoto: false,
          allowText: true,
          allowVideo: true,
        },
        branding: {},
        isActive: true,
        createdAt: Date.now(),
      })
  );
}

async function seedWidget(
  t: ReturnType<typeof newTestConvex>,
  spaceId: Id<"spaces">,
  isPublished: boolean
): Promise<Id<"widgets">> {
  const space = await t.run(async (ctx) => (await ctx.db.get(spaceId))!);
  return await t.run(
    async (ctx) =>
      await ctx.db.insert("widgets", {
        organizationId: space.organizationId,
        spaceId,
        type: "wall",
        name: "Homepage wall",
        filter: {},
        style: {
          theme: "auto",
          layout: "grid",
          showRating: true,
          showAvatar: true,
        },
        isPublished,
        createdAt: Date.now(),
      })
  );
}

describe("embedPublic.getWidgetMeta", () => {
  test("returns the space's name and headline for a published widget", async () => {
    const t = newTestConvex();
    const spaceId = await seedSpace(t);
    const widgetId = await seedWidget(t, spaceId, true);

    const meta = await t.query(api.embedPublic.getWidgetMeta, { widgetId });
    expect(meta).toEqual({ spaceName: "Acme Fitness", headline: "Loved by our members" });
  });

  test("returns null for an unpublished widget", async () => {
    const t = newTestConvex();
    const spaceId = await seedSpace(t);
    const widgetId = await seedWidget(t, spaceId, false);

    expect(await t.query(api.embedPublic.getWidgetMeta, { widgetId })).toBeNull();
  });

  test("returns null for a nonexistent widget", async () => {
    const t = newTestConvex();
    const spaceId = await seedSpace(t);
    const widgetId = await seedWidget(t, spaceId, true);
    await t.run(async (ctx) => await ctx.db.delete(widgetId));

    expect(await t.query(api.embedPublic.getWidgetMeta, { widgetId })).toBeNull();
  });
});
