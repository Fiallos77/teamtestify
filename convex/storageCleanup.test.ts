import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import schema from "./schema";
import { internal } from "./_generated/api";
import { ORPHAN_GRACE_PERIOD_MS } from "./storageCleanup";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

function newTestConvex() {
  return convexTest(schema, modules);
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

async function fileExists(
  t: ReturnType<typeof newTestConvex>,
  storageId: Id<"_storage">
): Promise<boolean> {
  const meta = await t.run(
    async (ctx) => await ctx.db.system.get("_storage", storageId)
  );
  return meta !== null;
}

describe("storageCleanup.cleanupOrphanedUploads", () => {
  test("deletes unreferenced files past the grace period", async () => {
    const t = newTestConvex();
    const storageId = await t.run(
      async (ctx) => await ctx.storage.store(new Blob(["orphan"]))
    );

    vi.advanceTimersByTime(ORPHAN_GRACE_PERIOD_MS + 1000);

    await t.mutation(internal.storageCleanup.cleanupOrphanedUploads, {});

    expect(await fileExists(t, storageId)).toBe(false);
  });

  test("leaves unreferenced files alone during the grace period", async () => {
    const t = newTestConvex();
    const storageId = await t.run(
      async (ctx) => await ctx.storage.store(new Blob(["fresh upload"]))
    );

    // No time advance: this file was just uploaded, possibly mid-submission.
    await t.mutation(internal.storageCleanup.cleanupOrphanedUploads, {});

    expect(await fileExists(t, storageId)).toBe(true);
  });

  test("never deletes a file referenced by a testimonial's video", async () => {
    const t = newTestConvex();
    const { spaceId, organizationId } = await t.run(async (ctx) => {
      const organizationId = await ctx.db.insert("organizations", {
        name: "Acme",
        createdAt: Date.now(),
      });
      const spaceId = await ctx.db.insert("spaces", {
        organizationId,
        name: "Space",
        publicSlug: "space-cleanup-video",
        formConfig: {
          headline: "h",
          questions: [],
          collectRating: false,
          collectNameCompanyPhoto: false,
          allowText: true,
          allowVideo: true,
        },
        branding: {},
        isActive: true,
        createdAt: Date.now(),
      });
      return { spaceId, organizationId };
    });
    const storageId = await t.run(
      async (ctx) => await ctx.storage.store(new Blob(["video bytes"]))
    );
    await t.run(async (ctx) => {
      await ctx.db.insert("testimonials", {
        spaceId,
        organizationId,
        type: "video",
        status: "pending",
        authorName: "Jane",
        videoStorage: { provider: "convex", storageId },
        featured: false,
        tags: [],
        source: "form",
        submittedAt: Date.now(),
      });
    });

    vi.advanceTimersByTime(ORPHAN_GRACE_PERIOD_MS + 1000);
    await t.mutation(internal.storageCleanup.cleanupOrphanedUploads, {});

    expect(await fileExists(t, storageId)).toBe(true);
  });

  test("never deletes a file referenced as a space logo", async () => {
    const t = newTestConvex();
    const storageId = await t.run(
      async (ctx) => await ctx.storage.store(new Blob(["logo bytes"]))
    );
    await t.run(async (ctx) => {
      const organizationId = await ctx.db.insert("organizations", {
        name: "Acme",
        createdAt: Date.now(),
      });
      await ctx.db.insert("spaces", {
        organizationId,
        name: "Space",
        publicSlug: "space-cleanup-logo",
        formConfig: {
          headline: "h",
          questions: [],
          collectRating: false,
          collectNameCompanyPhoto: false,
          allowText: true,
          allowVideo: true,
        },
        branding: { logoStorageId: storageId },
        isActive: true,
        createdAt: Date.now(),
      });
    });

    vi.advanceTimersByTime(ORPHAN_GRACE_PERIOD_MS + 1000);
    await t.mutation(internal.storageCleanup.cleanupOrphanedUploads, {});

    expect(await fileExists(t, storageId)).toBe(true);
  });
});
