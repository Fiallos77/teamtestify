import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "cleanup orphaned uploads",
  { hours: 6 },
  internal.storageCleanup.cleanupOrphanedUploads
);

export default crons;
