import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { requireCurrentUser } from "./authz";

async function requireProject(ctx: { db: { get: (id: Id<"projects">) => Promise<{ userId: string } | null> } }, projectId: Id<"projects">, userId: string) {
  const project = await ctx.db.get(projectId);
  if (project === null || project.userId !== userId) {
    throw new Error("Project not found");
  }

  return project;
}

function validateBatchAssetIds(ids: Id<"assets">[]) {
  if (ids.length < 1 || ids.length > 100) {
    throw new Error("Select between 1 and 100 assets");
  }

  if (new Set(ids).size !== ids.length) {
    throw new Error("Assets must be unique");
  }
}

async function requireOwnedProjectAssets(
  ctx: {
    db: {
      get: (id: Id<"assets">) => Promise<{
        _id: Id<"assets">;
        projectId: Id<"projects">;
        storageId: Id<"_storage">;
        userId: string;
      } | null>;
    };
  },
  ids: Id<"assets">[],
  projectId: Id<"projects">,
  userId: string,
) {
  const assets = await Promise.all(ids.map((id) => ctx.db.get(id)));
  const ownedAssets = [] as Array<{
    _id: Id<"assets">;
    projectId: Id<"projects">;
    storageId: Id<"_storage">;
    userId: string;
  }>;

  for (const asset of assets) {
    if (asset === null || asset.userId !== userId || asset.projectId !== projectId) {
      throw new Error("Asset not found");
    }

    ownedAssets.push(asset);
  }

  return ownedAssets;
}

export const get = query({
  args: { id: v.id("assets") },
  handler: async (ctx, args) => {
    const { userId } = await requireCurrentUser(ctx);
    const asset = await ctx.db.get(args.id);

    if (asset === null || asset.userId !== userId) {
      return null;
    }

    return asset;
  },
});

export const list = query({
  args: {
    projectId: v.id("projects"),
    search: v.optional(v.string()),
    extension: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireCurrentUser(ctx);
    await requireProject(ctx, args.projectId, userId);

    const search = args.search?.trim().toLowerCase() ?? "";
    const extension = args.extension?.trim().toLowerCase();
    const assets = await ctx.db
      .query("assets")
      .withIndex("by_project_createdAt", (query) => query.eq("projectId", args.projectId))
      .order("desc")
      .collect();

    return assets.filter((asset) => {
      const matchesSearch = search.length === 0 || asset.name.toLowerCase().includes(search) || asset.originalName.toLowerCase().includes(search);
      const matchesExtension = extension === undefined || extension === "all" || asset.extension === extension;
      return matchesSearch && matchesExtension;
    });
  },
});

export const getDownloadUrl = query({
  args: { id: v.id("assets") },
  handler: async (ctx, args) => {
    const { userId } = await requireCurrentUser(ctx);
    const asset = await ctx.db.get(args.id);
    if (asset === null || asset.userId !== userId) {
      return null;
    }

    return await ctx.storage.getUrl(asset.storageId);
  },
});

export const rename = mutation({
  args: {
    id: v.id("assets"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireCurrentUser(ctx);
    const asset = await ctx.db.get(args.id);
    if (asset === null || asset.userId !== userId) {
      throw new Error("Asset not found");
    }

    const name = args.name.trim();
    if (name.length < 1 || name.length > 160) {
      throw new Error("File name must be between 1 and 160 characters");
    }

    await ctx.db.patch(args.id, { name, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("assets") },
  handler: async (ctx, args) => {
    const { userId } = await requireCurrentUser(ctx);
    const asset = await ctx.db.get(args.id);
    if (asset === null || asset.userId !== userId) {
      throw new Error("Asset not found");
    }

    await ctx.storage.delete(asset.storageId);
    await ctx.db.delete(args.id);
  },
});

export const batchMove = mutation({
  args: {
    ids: v.array(v.id("assets")),
    projectId: v.id("projects"),
    targetProjectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireCurrentUser(ctx);
    validateBatchAssetIds(args.ids);
    await requireProject(ctx, args.projectId, userId);
    await requireProject(ctx, args.targetProjectId, userId);
    if (args.projectId === args.targetProjectId) {
      throw new Error("Choose a different destination project");
    }

    const assets = await requireOwnedProjectAssets(ctx, args.ids, args.projectId, userId);
    const now = Date.now();
    await Promise.all(assets.map((asset) => ctx.db.patch(asset._id, {
      projectId: args.targetProjectId,
      updatedAt: now,
    })));
    return assets.length;
  },
});

export const batchRemove = mutation({
  args: {
    ids: v.array(v.id("assets")),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireCurrentUser(ctx);
    validateBatchAssetIds(args.ids);
    await requireProject(ctx, args.projectId, userId);
    const assets = await requireOwnedProjectAssets(ctx, args.ids, args.projectId, userId);

    await Promise.all(assets.map((asset) => ctx.storage.delete(asset.storageId)));
    await Promise.all(assets.map((asset) => ctx.db.delete(asset._id)));
    return assets.length;
  },
});
