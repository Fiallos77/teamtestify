import { internalMutation } from "./_generated/server";

// Files land in storage the moment a client POSTs to an upload URL, before
// any submit mutation ever runs — someone can generate a URL, upload, and
// abandon the form. Grace period is long enough that a file mid-submission
// (uploaded, submit mutation not yet called) never gets swept.
export const ORPHAN_GRACE_PERIOD_MS = 60 * 60 * 1000;

export const cleanupOrphanedUploads = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - ORPHAN_GRACE_PERIOD_MS;
    const files = await ctx.db.system.query("_storage").collect();
    if (files.length === 0) return { deleted: 0 };

    const [testimonials, spaces] = await Promise.all([
      ctx.db.query("testimonials").collect(),
      ctx.db.query("spaces").collect(),
    ]);
    const referenced = new Set<string>();
    for (const testimonial of testimonials) {
      if (testimonial.videoStorage?.storageId) {
        referenced.add(testimonial.videoStorage.storageId);
      }
      if (testimonial.authorPhotoStorageId) {
        referenced.add(testimonial.authorPhotoStorageId);
      }
    }
    for (const space of spaces) {
      if (space.branding.logoStorageId) {
        referenced.add(space.branding.logoStorageId);
      }
    }

    let deleted = 0;
    for (const file of files) {
      if (file._creationTime > cutoff) continue;
      if (referenced.has(file._id)) continue;
      await ctx.storage.delete(file._id);
      deleted++;
    }
    return { deleted };
  },
});
