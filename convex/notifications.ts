"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { buildNewTestimonialEmail } from "./lib/email";

export const sendNewTestimonialEmail = internalAction({
  args: {
    organizationId: v.id("organizations"),
    spaceId: v.id("spaces"),
    testimonialId: v.id("testimonials"),
  },
  handler: async (ctx, { organizationId, spaceId }) => {
    const { notificationEmail, spaceName } = await ctx.runQuery(
      internal.organizations.getNotificationContext,
      { organizationId, spaceId }
    );
    if (!notificationEmail) return;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildNewTestimonialEmail({ spaceName, notificationEmail })),
    });
  },
});
