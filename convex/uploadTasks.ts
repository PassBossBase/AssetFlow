import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Auth } from "convex/server";
import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";

const allowedExtensions = new Set(["png", "jpg", "jpeg", "webp", "svg", "gif", "glb", "gltf"]);
const staleUploadThresholdMs = 12_000;

async function requireUserId(ctx: { auth: Auth }) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  return String(userId);
}

async function requireProjectOwner(
  ctx: { db: { get: (id: Id<"projects">) => Promise<{ userId: string } | null> } },
  projectId: Id<"projects">,
  userId: string,
) {
  const project = await ctx.db.get(projectId);
  if (project === null || project.userId !== userId) throw new Error("Project not found");
}

function validateMetadata(fileName: string, extension: string, size: number) {
  if (fileName.trim().length < 1 || fileName.trim().length > 160) throw new Error("File name must be between 1 and 160 characters");
  if (!allowedExtensions.has(extension.trim().toLowerCase())) throw new Error("Unsupported file type");
  if (size <= 0 || size > 250 * 1024 * 1024) throw new Error("File size must be between 1 byte and 250 MB");
}

async function requireTaskOwner(ctx: { auth: Auth; db: { get: (id: Id<"uploadTasks">) => Promise<Doc<"uploadTasks"> | null> } }, id: Id<"uploadTasks">) {
  const userId = await requireUserId(ctx);
  const task = await ctx.db.get(id);
  if (task === null || task.userId !== userId) throw new Error("Upload task not found");
  return { task, userId };
}

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    fileName: v.string(),
    extension: v.string(),
    mimeType: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await requireProjectOwner(ctx, args.projectId, userId);
    const extension = args.extension.trim().toLowerCase();
    validateMetadata(args.fileName, extension, args.size);
    const now = Date.now();
    return await ctx.db.insert("uploadTasks", {
      projectId: args.projectId,
      userId,
      fileName: args.fileName.trim(),
      extension,
      mimeType: args.mimeType.trim().slice(0, 160),
      size: args.size,
      progress: 0,
      status: "uploading",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateProgress = mutation({
  args: { id: v.id("uploadTasks"), progress: v.number() },
  handler: async (ctx, args) => {
    const { task } = await requireTaskOwner(ctx, args.id);
    if (task.status !== "uploading") return;
    const progress = Math.max(0, Math.min(99, Math.round(args.progress)));
    await ctx.db.patch(args.id, { progress, updatedAt: Date.now() });
  },
});

export const heartbeat = mutation({
  args: { id: v.id("uploadTasks") },
  handler: async (ctx, args) => {
    const { task } = await requireTaskOwner(ctx, args.id);
    if (task.status !== "uploading") return;
    await ctx.db.patch(args.id, { updatedAt: Date.now() });
  },
});

export const retry = mutation({
  args: { id: v.id("uploadTasks") },
  handler: async (ctx, args) => {
    const { task } = await requireTaskOwner(ctx, args.id);
    if (task.status === "uploading") return;
    await ctx.db.patch(args.id, { status: "uploading", progress: 0, error: undefined, updatedAt: Date.now() });
  },
});

export const fail = mutation({
  args: { id: v.id("uploadTasks"), error: v.string() },
  handler: async (ctx, args) => {
    await requireTaskOwner(ctx, args.id);
    await ctx.db.patch(args.id, {
      status: "failed",
      error: args.error.trim().slice(0, 240),
      updatedAt: Date.now(),
    });
  },
});

export const complete = mutation({
  args: { id: v.id("uploadTasks"), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const { task, userId } = await requireTaskOwner(ctx, args.id);
    if (task.status !== "uploading") throw new Error("Upload task is not active");
    await requireProjectOwner(ctx, task.projectId, userId);

    const now = Date.now();
    await ctx.db.insert("assets", {
      projectId: task.projectId,
      userId,
      storageId: args.storageId,
      name: task.fileName,
      originalName: task.fileName,
      extension: task.extension,
      mimeType: task.mimeType,
      size: task.size,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.delete(args.id);
  },
});

export const remove = mutation({
  args: { id: v.id("uploadTasks") },
  handler: async (ctx, args) => {
    await requireTaskOwner(ctx, args.id);
    await ctx.db.delete(args.id);
  },
});

export const interruptActive = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const tasks = await ctx.db
      .query("uploadTasks")
      .withIndex("by_user_status", (query) => query.eq("userId", userId).eq("status", "uploading"))
      .collect();
    const now = Date.now();
    await Promise.all(tasks.map((task) => ctx.db.patch(task._id, {
      status: "interrupted",
      error: "Upload interrupted by sign out",
      updatedAt: now,
    })));
    return tasks.length;
  },
});

export const recoverInterrupted = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await requireProjectOwner(ctx, args.projectId, userId);
    const now = Date.now();
    const tasks = await ctx.db
      .query("uploadTasks")
      .withIndex("by_project", (query) => query.eq("projectId", args.projectId))
      .collect();
    const staleTasks = tasks.filter((task) => task.userId === userId && task.status === "uploading" && now - task.updatedAt >= staleUploadThresholdMs);
    await Promise.all(staleTasks.map((task) => ctx.db.patch(task._id, {
      status: "interrupted",
      error: "Upload connection was interrupted",
      updatedAt: now,
    })));
    return staleTasks.length;
  },
});

export const recoverStaleForCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const now = Date.now();
    const tasks = await ctx.db
      .query("uploadTasks")
      .withIndex("by_user_status", (query) =>
        query.eq("userId", userId).eq("status", "uploading"),
      )
      .collect();
    const staleTasks = tasks.filter(
      (task) => now - task.updatedAt >= staleUploadThresholdMs,
    );

    await Promise.all(
      staleTasks.map((task) =>
        ctx.db.patch(task._id, {
          status: "interrupted",
          error: "Upload connection was interrupted",
          updatedAt: now,
        }),
      ),
    );
    return staleTasks.length;
  },
});

export const listForProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await requireProjectOwner(ctx, args.projectId, userId);
    const tasks = await ctx.db
      .query("uploadTasks")
      .withIndex("by_project", (query) => query.eq("projectId", args.projectId))
      .collect();
    return tasks.filter((task) => task.userId === userId).sort((first, second) => first.createdAt - second.createdAt);
  },
});

export const activeCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const tasks = await ctx.db
      .query("uploadTasks")
      .withIndex("by_user_status", (query) => query.eq("userId", userId).eq("status", "uploading"))
      .collect();
    return tasks.length;
  },
});
