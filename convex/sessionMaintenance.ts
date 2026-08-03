import { internalMutation } from "./_generated/server";
import { internal, components } from "./_generated/api";

const batchSize = 100;

export const revokeWeeklySessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const activeUploads = await ctx.db
      .query("uploadTasks")
      .withIndex("by_status", (query) => query.eq("status", "uploading"))
      .take(batchSize);
    const now = Date.now();
    await Promise.all(activeUploads.map((task) => ctx.db.patch(task._id, {
      status: "interrupted",
      error: "Upload interrupted by weekly sign-in refresh",
      updatedAt: now,
    })));

    if (activeUploads.length === batchSize) {
      await ctx.scheduler.runAfter(0, internal.sessionMaintenance.revokeWeeklySessions, {});
      return;
    }

    const result = await ctx.runMutation(components.betterAuth.maintenance.revokeSessionBatch, { limit: batchSize });
    if (result.hasMore) {
      await ctx.scheduler.runAfter(0, internal.sessionMaintenance.revokeWeeklySessions, {});
    }
  },
});
