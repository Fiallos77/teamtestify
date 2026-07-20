import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import schema from "./schema";
import { api } from "./_generated/api";
import { MAX_VIDEO_BYTES } from "./lib/videoValidation";
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

async function storeBlob(
  t: ReturnType<typeof newTestConvex>,
  blob: Blob
): Promise<Id<"_storage">> {
  return await t.run(async (ctx) => await ctx.storage.store(blob));
}

async function storageEntryExists(
  t: ReturnType<typeof newTestConvex>,
  storageId: Id<"_storage">
): Promise<boolean> {
  const meta = await t.run(
    async (ctx) => await ctx.db.system.get("_storage", storageId)
  );
  return meta !== null;
}

// convex-test's `ctx.storage.store()` mock never records a `contentType`
// (see node_modules/convex-test/dist/index.js, "storage/storeBlob" only
// persists `size`/`sha256`), and it doesn't implement the real
// `/api/storage/upload` HTTP endpoint that would normally set contentType
// from the client's Content-Type header. So every stored blob looks
// "typeless" here regardless of the Blob's own `.type` — every upload
// exercises the *rejection* path in this harness. Exact allow/deny-by-type
// and size-boundary coverage lives in convex/lib/videoValidation.test.ts,
// which tests the pure predicate directly. What we verify here is the
// integration behavior around rejection: the blob is deleted, no
// testimonial is created, and the mutation returns ok:false instead of
// throwing (throwing after ctx.storage.delete would roll the delete back,
// since a mutation is one atomic transaction).
describe("public.submitVideoTestimonial", () => {
  test("rejects an unverifiable upload, deletes the blob, and creates no testimonial", async () => {
    const t = newTestConvex();
    const spaceId = await seedSpace(t);
    const storageId = await storeBlob(
      t,
      new Blob(["fake webm bytes"], { type: "video/webm" })
    );

    const result = await t.mutation(api.public.submitVideoTestimonial, {
      spaceId,
      authorName: "Jane",
      storageId,
      mimeType: "video/webm",
      durationSeconds: 42,
      visitorId: "visitor-1",
    });

    expect(result.ok).toBe(false);
    expect(await storageEntryExists(t, storageId)).toBe(false);
    const testimonials = await t.run(
      async (ctx) =>
        await ctx.db
          .query("testimonials")
          .withIndex("by_space", (q) => q.eq("spaceId", spaceId))
          .collect()
    );
    expect(testimonials).toHaveLength(0);
  });

  test(
    "cleans up a large blob on rejection without erroring",
    async () => {
      const t = newTestConvex();
      const spaceId = await seedSpace(t);
      const large = new Uint8Array(MAX_VIDEO_BYTES + 1);
      const storageId = await storeBlob(t, new Blob([large], { type: "video/webm" }));

      const result = await t.mutation(api.public.submitVideoTestimonial, {
        spaceId,
        authorName: "Jane",
        storageId,
        mimeType: "video/webm",
        visitorId: "visitor-1",
      });

      expect(result.ok).toBe(false);
      expect(await storageEntryExists(t, storageId)).toBe(false);
    },
    15000
  );

  test("honeypot rejection never touches storage validation", async () => {
    const t = newTestConvex();
    const spaceId = await seedSpace(t);
    const storageId = await storeBlob(t, new Blob(["x"], { type: "video/webm" }));

    const result = await t.mutation(api.public.submitVideoTestimonial, {
      spaceId,
      authorName: "Jane",
      storageId,
      website: "http://spam.example",
      visitorId: "visitor-1",
    });

    expect(result).toEqual({ ok: false, error: "Submission rejected" });
    // Honeypot rejection happens before the storage check even runs, so
    // the (never-validated) blob is intentionally left alone.
    expect(await storageEntryExists(t, storageId)).toBe(true);
  });

  test("blocks a 6th video submission from the same visitor within an hour", async () => {
    const t = newTestConvex();
    const spaceId = await seedSpace(t);

    for (let i = 0; i < 5; i++) {
      const storageId = await storeBlob(t, new Blob(["x"], { type: "video/webm" }));
      // Each of these is rejected on content-type validation (see the
      // convex-test caveat above), but that happens AFTER the rate limit
      // check, so the limiter still consumes a token per call.
      await t.mutation(api.public.submitVideoTestimonial, {
        spaceId,
        authorName: "Jane",
        storageId,
        visitorId: "flood-visitor",
      });
    }

    await expect(
      t.mutation(api.public.submitVideoTestimonial, {
        spaceId,
        authorName: "Jane",
        storageId: await storeBlob(t, new Blob(["x"], { type: "video/webm" })),
        visitorId: "flood-visitor",
      })
    ).rejects.toThrow();
  });
});

describe("public.submitTextTestimonial", () => {
  test("creates a pending testimonial", async () => {
    const t = newTestConvex();
    const spaceId = await seedSpace(t);

    await t.mutation(api.public.submitTextTestimonial, {
      spaceId,
      authorName: "Jane",
      textContent: "Loved it!",
      visitorId: "visitor-1",
    });

    const testimonials = await t.run(
      async (ctx) =>
        await ctx.db
          .query("testimonials")
          .withIndex("by_space", (q) => q.eq("spaceId", spaceId))
          .collect()
    );
    expect(testimonials).toHaveLength(1);
    expect(testimonials[0].status).toBe("pending");
  });

  test("rejects a honeypot-filled submission and creates no testimonial", async () => {
    const t = newTestConvex();
    const spaceId = await seedSpace(t);

    await expect(
      t.mutation(api.public.submitTextTestimonial, {
        spaceId,
        authorName: "Jane",
        textContent: "Loved it!",
        website: "http://spam.example",
        visitorId: "visitor-1",
      })
    ).rejects.toThrow();

    const testimonials = await t.run(
      async (ctx) =>
        await ctx.db
          .query("testimonials")
          .withIndex("by_space", (q) => q.eq("spaceId", spaceId))
          .collect()
    );
    expect(testimonials).toHaveLength(0);
  });

  test("allows up to 5 submissions per hour for a single visitor, then blocks", async () => {
    const t = newTestConvex();
    const spaceId = await seedSpace(t);

    for (let i = 0; i < 5; i++) {
      await t.mutation(api.public.submitTextTestimonial, {
        spaceId,
        authorName: "Jane",
        textContent: `Submission ${i}`,
        visitorId: "flood-visitor",
      });
    }

    await expect(
      t.mutation(api.public.submitTextTestimonial, {
        spaceId,
        authorName: "Jane",
        textContent: "One too many",
        visitorId: "flood-visitor",
      })
    ).rejects.toThrow();
  });

  test("the per-visitor submission limit is scoped per visitor, not global", async () => {
    const t = newTestConvex();
    const spaceId = await seedSpace(t);

    for (let i = 0; i < 5; i++) {
      await t.mutation(api.public.submitTextTestimonial, {
        spaceId,
        authorName: "Jane",
        textContent: `Submission ${i}`,
        visitorId: "visitor-a",
      });
    }

    await expect(
      t.mutation(api.public.submitTextTestimonial, {
        spaceId,
        authorName: "Jane",
        textContent: "Still fine",
        visitorId: "visitor-b",
      })
    ).resolves.toBeNull();
  });

  test("text and video submissions from the same visitor share one rate-limit budget", async () => {
    const t = newTestConvex();
    const spaceId = await seedSpace(t);

    for (let i = 0; i < 3; i++) {
      await t.mutation(api.public.submitTextTestimonial, {
        spaceId,
        authorName: "Jane",
        textContent: `Submission ${i}`,
        visitorId: "mixed-visitor",
      });
    }
    for (let i = 0; i < 2; i++) {
      const storageId = await storeBlob(t, new Blob(["x"], { type: "video/webm" }));
      await t.mutation(api.public.submitVideoTestimonial, {
        spaceId,
        authorName: "Jane",
        storageId,
        visitorId: "mixed-visitor",
      });
    }

    await expect(
      t.mutation(api.public.submitTextTestimonial, {
        spaceId,
        authorName: "Jane",
        textContent: "One too many",
        visitorId: "mixed-visitor",
      })
    ).rejects.toThrow();
  });

  test("different visitors on the same space share a 50/day space-wide submission cap", async () => {
    const t = newTestConvex();
    const spaceId = await seedSpace(t);

    for (let i = 0; i < 50; i++) {
      await expect(
        t.mutation(api.public.submitTextTestimonial, {
          spaceId,
          authorName: "Jane",
          textContent: `Submission ${i}`,
          visitorId: `visitor-${i}`,
        })
      ).resolves.toBeNull();
    }

    await expect(
      t.mutation(api.public.submitTextTestimonial, {
        spaceId,
        authorName: "Jane",
        textContent: "One too many",
        visitorId: "visitor-51",
      })
    ).rejects.toThrow();
  });
});

describe("public.getSpaceBySlug maxVideoSeconds", () => {
  test("free org's space reports the free video length cap", async () => {
    const t = newTestConvex();
    const slug = `slug-${Math.random().toString(36).slice(2)}`;
    await seedSpace(t, { slug });

    const result = await t.query(api.public.getSpaceBySlug, { publicSlug: slug });
    expect(result?.maxVideoSeconds).toBe(120);
  });

  test("pro org's space reports the pro video length cap", async () => {
    const t = newTestConvex();
    const slug = `slug-${Math.random().toString(36).slice(2)}`;
    const spaceId = await seedSpace(t, { slug });
    await t.run(async (ctx) => {
      const space = await ctx.db.get(spaceId);
      await ctx.db.insert("subscriptions", {
        organizationId: space!.organizationId,
        plan: "pro",
        status: "active",
      });
    });

    const result = await t.query(api.public.getSpaceBySlug, { publicSlug: slug });
    expect(result?.maxVideoSeconds).toBe(180);
  });
});
