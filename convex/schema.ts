import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  organizations: defineTable({
    name: v.string(),
    slug: v.optional(v.string()),
    notificationEmail: v.optional(v.string()),
    createdAt: v.number(),
  }),

  organizationMembers: defineTable({
    organizationId: v.id("organizations"),
    authUserId: v.string(),
    role: v.union(v.literal("owner"), v.literal("member")),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_user", ["authUserId"])
    .index("by_org_and_user", ["organizationId", "authUserId"]),

  userSettings: defineTable({
    authUserId: v.string(),
    activeOrganizationId: v.optional(v.id("organizations")),
  }).index("by_auth_user_id", ["authUserId"]),

  spaces: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    publicSlug: v.string(),
    formConfig: v.object({
      headline: v.string(),
      subheading: v.optional(v.string()),
      questions: v.array(
        v.object({
          id: v.string(),
          label: v.string(),
          required: v.boolean(),
        })
      ),
      collectRating: v.boolean(),
      collectNameCompanyPhoto: v.boolean(),
      collectAuthorEmail: v.optional(v.boolean()),
      thankYouMessage: v.optional(v.string()),
      allowText: v.boolean(),
      allowVideo: v.boolean(),
    }),
    branding: v.object({
      primaryColor: v.optional(v.string()),
      logoStorageId: v.optional(v.id("_storage")),
      backgroundStyle: v.optional(v.string()),
    }),
    // Phase 4A AI request assistant. businessDescription is the owner's
    // one-sentence description of their business; requestAssistant caches the
    // latest generated kit so the dashboard can show it again without spending
    // another credit.
    businessDescription: v.optional(v.string()),
    requestAssistant: v.optional(
      v.object({
        outreachEmail: v.string(),
        outreachWhatsApp: v.string(),
        followUp: v.string(),
        guideQuestions: v.array(v.string()),
        language: v.optional(v.string()),
        generatedAt: v.number(),
      })
    ),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_slug", ["publicSlug"]),

  testimonials: defineTable({
    spaceId: v.id("spaces"),
    organizationId: v.id("organizations"),
    type: v.union(v.literal("text"), v.literal("video")),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    authorName: v.string(),
    authorEmail: v.optional(v.string()),
    authorTitle: v.optional(v.string()),
    authorCompany: v.optional(v.string()),
    authorPhotoStorageId: v.optional(v.id("_storage")),
    rating: v.optional(v.number()),
    textContent: v.optional(v.string()),
    answers: v.optional(
      v.array(v.object({ questionId: v.string(), answer: v.string() }))
    ),
    videoStorage: v.optional(
      v.object({
        provider: v.union(v.literal("convex"), v.literal("r2")),
        storageId: v.optional(v.id("_storage")),
        key: v.optional(v.string()),
        durationSeconds: v.optional(v.number()),
        mimeType: v.optional(v.string()),
        thumbnailStorageId: v.optional(v.id("_storage")),
      })
    ),
    featured: v.boolean(),
    tags: v.array(v.string()),
    displayOrder: v.optional(v.number()),
    source: v.union(v.literal("form"), v.literal("manual_import")),
    submittedAt: v.number(),
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.string()),
    // True while this testimonial was approved but got forced back to
    // pending by a plan downgrade (over the free publish/video cap) — lets
    // re-upgrade restore exactly these, and only these, to approved. See
    // applyDowngradeToFree / applyReUpgradeToPro in convex/entitlements.ts.
    downgradeHidden: v.optional(v.boolean()),
  })
    .index("by_space", ["spaceId"])
    .index("by_space_and_status", ["spaceId", "status"])
    .index("by_org", ["organizationId"])
    .index("by_space_status_featured", ["spaceId", "status", "featured"]),

  widgets: defineTable({
    spaceId: v.id("spaces"),
    organizationId: v.id("organizations"),
    type: v.union(v.literal("wall"), v.literal("single")),
    name: v.string(),
    singleTestimonialId: v.optional(v.id("testimonials")),
    filter: v.object({
      includeTags: v.optional(v.array(v.string())),
      onlyFeatured: v.optional(v.boolean()),
      minRating: v.optional(v.number()),
      maxItems: v.optional(v.number()),
    }),
    style: v.object({
      theme: v.union(v.literal("light"), v.literal("dark"), v.literal("auto")),
      accentColor: v.optional(v.string()),
      backgroundColor: v.optional(v.string()),
      layout: v.union(
        v.literal("grid"),
        v.literal("masonry"),
        v.literal("masonry-animated"),
        v.literal("carousel")
      ),
      columns: v.optional(v.number()),
      rows: v.optional(v.number()),
      showRating: v.boolean(),
      showAvatar: v.boolean(),
      showDate: v.optional(v.boolean()),
      autoplaySeconds: v.optional(v.number()),
      maxHeight: v.optional(v.number()),
      scrollDirection: v.optional(v.union(v.literal("vertical"), v.literal("horizontal"))),
      scrollSpeed: v.optional(
        v.union(v.literal("slow"), v.literal("normal"), v.literal("fast"))
      ),
      reverseDirection: v.optional(v.boolean()),
      showHeartAnimation: v.optional(v.boolean()),
    }),
    isPublished: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_space", ["spaceId"])
    .index("by_org", ["organizationId"]),

  widgetEvents: defineTable({
    widgetId: v.id("widgets"),
    type: v.union(v.literal("impression"), v.literal("click")),
    testimonialId: v.optional(v.id("testimonials")),
    ts: v.number(),
  }).index("by_widget_and_time", ["widgetId", "ts"]),

  // Free is the absence of an active "pro" row here — see
  // convex/entitlements.ts. Written by convex/subscriptions.ts:
  // setPlanForTesting (dev/tests) or processStripeWebhookEvent (real
  // Stripe events, via convex/stripeWebhook.ts).
  subscriptions: defineTable({
    organizationId: v.id("organizations"),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    plan: v.union(v.literal("free"), v.literal("pro")),
    status: v.union(
      v.literal("active"),
      v.literal("canceled"),
      v.literal("past_due"),
      v.literal("incomplete")
    ),
    currentPeriodEnd: v.optional(v.number()),
  })
    .index("by_org", ["organizationId"])
    .index("by_stripe_customer_id", ["stripeCustomerId"])
    .index("by_stripe_subscription_id", ["stripeSubscriptionId"]),

  // Idempotency ledger for convex/stripeWebhook.ts — Stripe may deliver the
  // same event more than once (retries, redelivery from the dashboard).
  stripeWebhookEvents: defineTable({
    eventId: v.string(),
    eventType: v.string(),
    processedAt: v.number(),
  }).index("by_event_id", ["eventId"]),

  // Per-org, per-month AI generation counters (Phase 4). Metered by feature so
  // Free can cap request/image independently while Pro shares one combined
  // pool — see convex/entitlements.ts. reserveAiCredit in convex/ai.ts
  // increments these before any provider call, so the cap fails closed.
  aiUsage: defineTable({
    organizationId: v.id("organizations"),
    month: v.string(), // "YYYY-MM" (UTC)
    requestGenCount: v.number(),
    imageGenCount: v.number(),
  }).index("by_org_and_month", ["organizationId", "month"]),
});
