import { query } from "./_generated/server";
import { requireCurrentUser } from "./authz";

export const overview = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireCurrentUser(ctx);
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user_createdAt", (query) => query.eq("userId", userId))
      .order("desc")
      .collect();
    const assets = await ctx.db
      .query("assets")
      .withIndex("by_user", (query) => query.eq("userId", userId))
      .collect();

    const recentAssets = await Promise.all(
      assets
        .sort((left, right) => right.createdAt - left.createdAt)
        .slice(0, 6)
        .map(async (asset) => ({
          ...asset,
          url: await ctx.storage.getUrl(asset.storageId),
        })),
    );

    return {
      projectCount: projects.length,
      assetCount: assets.length,
      assetStorageUsed: assets.reduce((total, asset) => total + asset.size, 0),
      recentAssets,
      recentProjects: projects.slice(0, 3),
    };
  },
});
