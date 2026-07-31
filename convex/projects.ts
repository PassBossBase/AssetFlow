import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Auth } from "convex/server";

async function requireUserId(ctx: { auth: Auth }) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("Not authenticated");
  }

  return String(userId);
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user_createdAt", (query) => query.eq("userId", userId))
      .order("desc")
      .collect();

    const projectsWithAssetCount = await Promise.all(projects.map(async (project) => {
      const assets = await ctx.db
        .query("assets")
        .withIndex("by_project_createdAt", (query) => query.eq("projectId", project._id))
        .order("desc")
        .collect();

      const recentAssets = await Promise.all(assets.slice(0, 4).map(async (asset) => ({
        _id: asset._id,
        extension: asset.extension,
        name: asset.name,
        previewUrl: ["png", "jpg", "jpeg", "webp", "svg", "gif"].includes(asset.extension)
          ? await ctx.storage.getUrl(asset.storageId)
          : null,
      })));

      return { ...project, assetCount: assets.length, recentAssets };
    }));

    const uploadTasks = await ctx.db
      .query("uploadTasks")
      .withIndex("by_user", (query) => query.eq("userId", userId))
      .collect();
    const uploadSummaryByProject = new Map<string, {
      failedCount: number;
      failedTasks: Array<{ _id: Id<"uploadTasks">; fileName: string; size: number; status: "failed" | "interrupted" }>;
      progressBytes: number;
      totalBytes: number;
      uploadingCount: number;
    }>();

    for (const task of uploadTasks) {
      const summary = uploadSummaryByProject.get(task.projectId) ?? { failedCount: 0, failedTasks: [], progressBytes: 0, totalBytes: 0, uploadingCount: 0 };
      if (task.status === "uploading") {
        summary.uploadingCount += 1;
        summary.progressBytes += task.size * (task.progress / 100);
        summary.totalBytes += task.size;
      } else {
        summary.failedCount += 1;
        if (summary.failedTasks.length < 2) {
          summary.failedTasks.push({ _id: task._id, fileName: task.fileName, size: task.size, status: task.status });
        }
      }
      uploadSummaryByProject.set(task.projectId, summary);
    }

    const projectsWithUploadSummary = projectsWithAssetCount.map((project) => {
      const summary = uploadSummaryByProject.get(project._id);
      return {
        ...project,
        uploadSummary: {
          failedCount: summary?.failedCount ?? 0,
          failedTasks: summary?.failedTasks ?? [],
          progress: summary === undefined || summary.totalBytes === 0 ? 0 : Math.round((summary.progressBytes / summary.totalBytes) * 100),
          uploadingCount: summary?.uploadingCount ?? 0,
        },
      };
    });

    return projectsWithUploadSummary.sort((first, second) => {
      if (first.sortOrder === undefined && second.sortOrder === undefined) {
        return second.createdAt - first.createdAt;
      }

      if (first.sortOrder === undefined) return 1;
      if (second.sortOrder === undefined) return -1;
      return first.sortOrder - second.sortOrder;
    });
  },
});

export const get = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const project = await ctx.db.get(args.id);

    if (project === null || project.userId !== userId) {
      return null;
    }

    return project;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const name = args.name.trim();

    if (name.length < 2 || name.length > 80) {
      throw new Error("Project name must be between 2 and 80 characters");
    }

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user_createdAt", (query) => query.eq("userId", userId))
      .collect();
    const firstSortOrder = projects.reduce((minimum, project) => Math.min(minimum, project.sortOrder ?? 0), 0);
    const now = Date.now();
    return await ctx.db.insert("projects", {
      name,
      description: args.description.trim().slice(0, 500),
      userId,
      sortOrder: firstSortOrder - 1,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("projects"),
    name: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const project = await ctx.db.get(args.id);

    if (project === null || project.userId !== userId) {
      throw new Error("Project not found");
    }

    const name = args.name.trim();
    if (name.length < 2 || name.length > 80) {
      throw new Error("Project name must be between 2 and 80 characters");
    }

    await ctx.db.patch(args.id, {
      name,
      description: args.description.trim().slice(0, 500),
      updatedAt: Date.now(),
    });
  },
});

export const reorder = mutation({
  args: { projectIds: v.array(v.id("projects")) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user_createdAt", (query) => query.eq("userId", userId))
      .collect();
    const ownedProjectIds = new Set(projects.map((project) => project._id));
    const requestedProjectIds = new Set(args.projectIds);

    if (requestedProjectIds.size !== args.projectIds.length || requestedProjectIds.size !== ownedProjectIds.size) {
      throw new Error("Invalid project order");
    }

    for (const projectId of requestedProjectIds) {
      if (!ownedProjectIds.has(projectId)) {
        throw new Error("Invalid project order");
      }
    }

    await Promise.all(args.projectIds.map((projectId, sortOrder) => ctx.db.patch(projectId, { sortOrder })));
  },
});

export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const project = await ctx.db.get(args.id);

    if (project === null || project.userId !== userId) {
      throw new Error("Project not found");
    }

    const assets = await ctx.db
      .query("assets")
      .withIndex("by_project", (query) => query.eq("projectId", args.id))
      .collect();
    const uploadTasks = await ctx.db
      .query("uploadTasks")
      .withIndex("by_project", (query) => query.eq("projectId", args.id))
      .collect();

    for (const asset of assets) {
      await ctx.storage.delete(asset.storageId);
      await ctx.db.delete(asset._id);
    }

    for (const uploadTask of uploadTasks) {
      await ctx.db.delete(uploadTask._id);
    }

    await ctx.db.delete(args.id);
  },
});
