import { internalMutation, internalQuery } from "./_generated/server";
import { components } from "./_generated/api";
import { v } from "convex/values";

function requireResetToken(token: string) {
  const configuredToken = process.env.TEST_DATA_RESET_TOKEN;
  if (configuredToken === undefined || configuredToken.length === 0 || token !== configuredToken) {
    throw new Error("Test data reset is not authorized");
  }
}

export const inventory = internalQuery({
  args: {},
  handler: async (ctx) => {
    const [profiles, projects, assets, tasks, batches, storage] = await Promise.all([
      ctx.db.query("userProfiles").collect(),
      ctx.db.query("projects").collect(),
      ctx.db.query("assets").collect(),
      ctx.db.query("uploadTasks").collect(),
      ctx.db.query("uploadBatches").collect(),
      ctx.db.system.query("_storage").collect(),
    ]);
    return { profiles: profiles.length, projects: projects.length, assets: assets.length, uploadTasks: tasks.length, uploadBatches: batches.length, storageFiles: storage.length };
  },
});

// This is intentionally internal: it has no browser-callable route. Invoke it
// only from a one-time, explicitly approved server-side maintenance operation.
export const resetInternal = internalMutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    requireResetToken(args.token);
    const [profiles, projects, assets, tasks, batches, storage] = await Promise.all([
      ctx.db.query("userProfiles").collect(),
      ctx.db.query("projects").collect(),
      ctx.db.query("assets").collect(),
      ctx.db.query("uploadTasks").collect(),
      ctx.db.query("uploadBatches").collect(),
      ctx.db.system.query("_storage").collect(),
    ]);
    await Promise.all(storage.map((file) => ctx.storage.delete(file._id)));
    await Promise.all([
      ...tasks.map((document) => ctx.db.delete(document._id)),
      ...batches.map((document) => ctx.db.delete(document._id)),
      ...assets.map((document) => ctx.db.delete(document._id)),
      ...projects.map((document) => ctx.db.delete(document._id)),
      ...profiles.map((document) => ctx.db.delete(document._id)),
    ]);
    const auth = await ctx.runMutation(components.betterAuth.maintenance.clearAllAuthData, {});
    return {
      profiles: profiles.length,
      projects: projects.length,
      assets: assets.length,
      uploadTasks: tasks.length,
      uploadBatches: batches.length,
      storageFiles: storage.length,
      auth,
    };
  },
});
