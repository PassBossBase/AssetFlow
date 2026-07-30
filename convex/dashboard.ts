import { getAuthUserId } from "@convex-dev/auth/server";
import type { Auth } from "convex/server";

import { query } from "./_generated/server";

async function requireUserId(ctx: { auth: Auth }) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("Not authenticated");
  }

  return String(userId);
}

export const overview = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
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
