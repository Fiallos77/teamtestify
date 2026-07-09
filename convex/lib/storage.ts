import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export type StorageRef = {
  provider: "convex" | "r2";
  storageId?: Id<"_storage">;
  key?: string;
};

interface StorageAdapter {
  generateUploadUrl(ctx: MutationCtx): Promise<string>;
  getServingUrl(
    ctx: QueryCtx | MutationCtx | ActionCtx,
    ref: StorageRef
  ): Promise<string | null>;
  delete(ctx: MutationCtx, ref: StorageRef): Promise<void>;
}

const convexStorageAdapter: StorageAdapter = {
  async generateUploadUrl(ctx) {
    return await ctx.storage.generateUploadUrl();
  },
  async getServingUrl(ctx, ref) {
    if (ref.provider !== "convex" || !ref.storageId) return null;
    return await ctx.storage.getUrl(ref.storageId);
  },
  async delete(ctx, ref) {
    if (ref.provider === "convex" && ref.storageId) {
      await ctx.storage.delete(ref.storageId);
    }
  },
};

// When R2 volume justifies the migration, add an r2StorageAdapter here
// (presigned PUT urls + R2 SDK calls) and switch the return value below.
// Existing rows keep working because videoStorage.provider lets "convex"
// and "r2" rows coexist — no forced bulk migration at cutover time.
export function getActiveStorageAdapter(): StorageAdapter {
  return convexStorageAdapter;
}
