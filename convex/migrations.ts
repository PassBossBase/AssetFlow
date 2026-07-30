import { getAuthUserId } from "@convex-dev/auth/server";

import { mutation } from "./_generated/server";

export const normalizeLegacyOwnership = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const stableUserId = String(userId);
    const completedMigration = await ctx.db
      .query("ownershipMigrations")
      .withIndex("by_user", (query) => query.eq("userId", stableUserId))
      .unique();

    if (completedMigration !== null) {
      return { migratedProjects: 0, migratedAssets: 0 };
    }

    const legacyPrefix = `${stableUserId}|`;
    const [projects, assets] = await Promise.all([
      ctx.db.query("projects").collect(),
      ctx.db.query("assets").collect(),
    ]);
    const legacyProjects = projects.filter((project) => project.userId.startsWith(legacyPrefix));
    const legacyAssets = assets.filter((asset) => asset.userId.startsWith(legacyPrefix));

    for (const project of legacyProjects) {
      await ctx.db.patch(project._id, { userId: stableUserId });
    }

    for (const asset of legacyAssets) {
      await ctx.db.patch(asset._id, { userId: stableUserId });
    }

    await ctx.db.insert("ownershipMigrations", {
      userId: stableUserId,
      completedAt: Date.now(),
    });

    return {
      migratedProjects: legacyProjects.length,
      migratedAssets: legacyAssets.length,
    };
  },
});
