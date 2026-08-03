import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";

import { requireCurrentUser } from "./authz";

const allowedExtensions = new Set(["png", "jpg", "jpeg", "webp", "svg", "gif", "glb", "gltf"]);
const staleUploadThresholdMs = 5 * 60 * 1000;
const progressWriteIntervalMs = 1_500;

function normalizeExtension(extension: string) {
  return extension.trim().toLowerCase();
}

function validateMetadata(fileName: string, extension: string, size: number) {
  if (fileName.trim().length < 1 || fileName.trim().length > 160) throw new Error("File name must be between 1 and 160 characters");
  if (!allowedExtensions.has(extension)) throw new Error("Unsupported file type");
  if (size <= 0 || size > 250 * 1024 * 1024) throw new Error("File size must be between 1 byte and 250 MB");
}

function isCompatibleContentType(extension: string, contentType: string | undefined) {
  const normalized = contentType?.toLowerCase();
  if (normalized === undefined || normalized.length === 0) return false;
  if (["jpg", "jpeg"].includes(extension)) return normalized === "image/jpeg";
  if (extension === "png") return normalized === "image/png";
  if (extension === "webp") return normalized === "image/webp";
  if (extension === "svg") return normalized === "image/svg+xml";
  if (extension === "gif") return normalized === "image/gif";
  if (extension === "glb") return normalized === "model/gltf-binary" || normalized === "application/octet-stream";
  return normalized === "model/gltf+json" || normalized === "application/json" || normalized === "application/octet-stream";
}

async function requireProjectOwner(
  ctx: { db: { get: (id: Id<"projects">) => Promise<{ userId: string } | null> } },
  projectId: Id<"projects">,
  userId: string,
) {
  const project = await ctx.db.get(projectId);
  if (project === null || project.userId !== userId) throw new Error("Project not found");
}

async function requireTaskOwner(
  ctx: { auth: unknown; db: { get: (id: Id<"uploadTasks">) => Promise<Doc<"uploadTasks"> | null> } },
  id: Id<"uploadTasks">,
) {
  const { userId } = await requireCurrentUser(ctx as never);
  const task = await ctx.db.get(id);
  if (task === null || task.userId !== userId) throw new Error("Upload task not found");
  return { task, userId };
}

async function deleteTaskStorage(ctx: { storage: { delete: (id: Id<"_storage">) => Promise<void> } }, task: Doc<"uploadTasks">) {
  if (task.storageId !== undefined) {
    await ctx.storage.delete(task.storageId);
  }
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
    const { userId } = await requireCurrentUser(ctx);
    await requireProjectOwner(ctx, args.projectId, userId);
    const extension = normalizeExtension(args.extension);
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

export const createBatch = mutation({
  args: {
    projectId: v.id("projects"),
    files: v.array(v.object({
      fileName: v.string(),
      extension: v.string(),
      mimeType: v.string(),
      size: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireCurrentUser(ctx);
    await requireProjectOwner(ctx, args.projectId, userId);
    if (args.files.length === 0) throw new Error("Select at least one file");

    const files = args.files.map((file) => {
      const extension = normalizeExtension(file.extension);
      validateMetadata(file.fileName, extension, file.size);
      return { ...file, extension, fileName: file.fileName.trim(), mimeType: file.mimeType.trim().slice(0, 160) };
    });
    const now = Date.now();
    const batchId = await ctx.db.insert("uploadBatches", {
      projectId: args.projectId,
      userId,
      fileCount: files.length,
      totalBytes: files.reduce((total, file) => total + file.size, 0),
      completedCount: 0,
      completedBytes: 0,
      createdAt: now,
      updatedAt: now,
    });

    return await Promise.all(files.map((file) => ctx.db.insert("uploadTasks", {
      projectId: args.projectId,
      userId,
      batchId,
      fileName: file.fileName,
      extension: file.extension,
      mimeType: file.mimeType,
      size: file.size,
      progress: 0,
      status: "uploading",
      createdAt: now,
      updatedAt: now,
    })));
  },
});

export const generateUploadUrl = mutation({
  args: { id: v.id("uploadTasks") },
  handler: async (ctx, args) => {
    const { task, userId } = await requireTaskOwner(ctx, args.id);
    if (task.status !== "uploading") throw new Error("Upload task is not active");
    await requireProjectOwner(ctx, task.projectId, userId);
    return await ctx.storage.generateUploadUrl();
  },
});

export const attachStorage = mutation({
  args: { id: v.id("uploadTasks"), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const { task, userId } = await requireTaskOwner(ctx, args.id);
    if (task.status !== "uploading") throw new Error("Upload task is not active");
    await requireProjectOwner(ctx, task.projectId, userId);

    const metadata = await ctx.db.system.get("_storage", args.storageId);
    if (metadata === null || metadata.size !== task.size || !isCompatibleContentType(task.extension, metadata.contentType)) {
      throw new Error("Uploaded file metadata does not match the selected file");
    }

    const existingAsset = await ctx.db
      .query("assets")
      .withIndex("by_storage", (query) => query.eq("storageId", args.storageId))
      .unique();
    const existingTask = await ctx.db
      .query("uploadTasks")
      .withIndex("by_storage", (query) => query.eq("storageId", args.storageId))
      .unique();
    if (existingAsset !== null || (existingTask !== null && existingTask._id !== task._id)) {
      throw new Error("Uploaded file is already attached to another record");
    }

    await ctx.db.patch(task._id, { storageId: args.storageId, status: "uploaded", progress: 100, updatedAt: Date.now() });
  },
});

export const updateProgress = mutation({
  args: { id: v.id("uploadTasks"), progress: v.number() },
  handler: async (ctx, args) => {
    const { userId } = await requireCurrentUser(ctx);
    const task = await ctx.db.get(args.id);
    if (task === null || task.userId !== userId) return;
    if (task.status !== "uploading") return;
    const progress = Math.max(task.progress, Math.min(99, Math.round(args.progress)));
    const now = Date.now();
    if (progress === task.progress && now - task.updatedAt < progressWriteIntervalMs) return;
    await ctx.db.patch(args.id, { progress, updatedAt: now });
  },
});

export const heartbeat = mutation({
  args: { id: v.id("uploadTasks") },
  handler: async (ctx, args) => {
    const { userId } = await requireCurrentUser(ctx);
    const task = await ctx.db.get(args.id);
    if (task === null || task.userId !== userId) return;
    if (task.status !== "uploading" || Date.now() - task.updatedAt < progressWriteIntervalMs) return;
    await ctx.db.patch(args.id, { updatedAt: Date.now() });
  },
});

export const retry = mutation({
  args: { id: v.id("uploadTasks") },
  handler: async (ctx, args) => {
    const { task } = await requireTaskOwner(ctx, args.id);
    if (task.status === "uploading") return;
    await deleteTaskStorage(ctx, task);
    await ctx.db.patch(args.id, { status: "uploading", storageId: undefined, progress: 0, error: undefined, updatedAt: Date.now() });
  },
});

export const fail = mutation({
  args: { id: v.id("uploadTasks"), error: v.string() },
  handler: async (ctx, args) => {
    const { task } = await requireTaskOwner(ctx, args.id);
    if (task.status === "uploaded") return;
    await ctx.db.patch(args.id, { status: "failed", error: args.error.trim().slice(0, 240), updatedAt: Date.now() });
  },
});

export const complete = mutation({
  args: { id: v.id("uploadTasks"), storageId: v.optional(v.id("_storage")) },
  handler: async (ctx, args) => {
    const { task, userId } = await requireTaskOwner(ctx, args.id);
    const storageId = task.status === "uploaded" ? task.storageId : args.storageId;
    if (task.status !== "uploading" && task.status !== "uploaded") throw new Error("Upload task is not active");
    if (storageId === undefined) throw new Error("Uploaded file is not ready");
    await requireProjectOwner(ctx, task.projectId, userId);
    const metadata = await ctx.db.system.get("_storage", storageId);
    if (metadata === null || metadata.size !== task.size || !isCompatibleContentType(task.extension, metadata.contentType)) {
      throw new Error("Uploaded file metadata could not be verified");
    }

    const existingAsset = await ctx.db
      .query("assets")
      .withIndex("by_storage", (query) => query.eq("storageId", storageId))
      .unique();
    const existingTask = await ctx.db
      .query("uploadTasks")
      .withIndex("by_storage", (query) => query.eq("storageId", storageId))
      .unique();
    if (existingAsset !== null || (existingTask !== null && existingTask._id !== task._id)) {
      throw new Error("Uploaded file is already attached to another record");
    }

    const now = Date.now();
    await ctx.db.insert("assets", {
      projectId: task.projectId,
      userId,
      storageId,
      name: task.fileName,
      originalName: task.fileName,
      extension: task.extension,
      mimeType: task.mimeType,
      size: metadata.size,
      createdAt: now,
      updatedAt: now,
    });
    if (task.batchId !== undefined) {
      const batch = await ctx.db.get(task.batchId);
      if (batch !== null && batch.userId === userId && batch.projectId === task.projectId) {
        const completedCount = batch.completedCount + 1;
        if (completedCount >= batch.fileCount) {
          await ctx.db.delete(batch._id);
        } else {
          await ctx.db.patch(batch._id, {
            completedCount,
            completedBytes: Math.min(batch.totalBytes, batch.completedBytes + task.size),
            updatedAt: now,
          });
        }
      }
    }
    await ctx.db.delete(task._id);
  },
});

export const remove = mutation({
  args: { id: v.id("uploadTasks") },
  handler: async (ctx, args) => {
    const { task } = await requireTaskOwner(ctx, args.id);
    await deleteTaskStorage(ctx, task);
    if (task.batchId !== undefined) {
      const batch = await ctx.db.get(task.batchId);
      if (batch !== null && batch.userId === task.userId && batch.projectId === task.projectId) {
        const fileCount = Math.max(0, batch.fileCount - 1);
        const totalBytes = Math.max(0, batch.totalBytes - task.size);
        if (fileCount <= batch.completedCount) {
          await ctx.db.delete(batch._id);
        } else {
          await ctx.db.patch(batch._id, { fileCount, totalBytes, updatedAt: Date.now() });
        }
      }
    }
    await ctx.db.delete(args.id);
  },
});

export const interruptActive = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireCurrentUser(ctx);
    const tasks = await ctx.db.query("uploadTasks").withIndex("by_user_status", (query) => query.eq("userId", userId).eq("status", "uploading")).collect();
    const now = Date.now();
    await Promise.all(tasks.map((task) => ctx.db.patch(task._id, { status: "interrupted", error: "Upload interrupted by sign out", updatedAt: now })));
    return tasks.length;
  },
});

export const recoverInterrupted = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const { userId } = await requireCurrentUser(ctx);
    await requireProjectOwner(ctx, args.projectId, userId);
    const now = Date.now();
    const tasks = await ctx.db.query("uploadTasks").withIndex("by_project", (query) => query.eq("projectId", args.projectId)).collect();
    const staleTasks = tasks.filter((task) => task.userId === userId && task.status === "uploading" && now - task.updatedAt >= staleUploadThresholdMs);
    await Promise.all(staleTasks.map((task) => ctx.db.patch(task._id, { status: "interrupted", error: "Upload connection was interrupted", updatedAt: now })));
    return staleTasks.length;
  },
});

export const recoverStaleForCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireCurrentUser(ctx);
    const now = Date.now();
    const tasks = await ctx.db.query("uploadTasks").withIndex("by_user_status", (query) => query.eq("userId", userId).eq("status", "uploading")).collect();
    const staleTasks = tasks.filter((task) => now - task.updatedAt >= staleUploadThresholdMs);
    await Promise.all(staleTasks.map((task) => ctx.db.patch(task._id, { status: "interrupted", error: "Upload connection was interrupted", updatedAt: now })));
    return staleTasks.length;
  },
});

export const listForProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const { userId } = await requireCurrentUser(ctx);
    const project = await ctx.db.get(args.projectId);
    // A mounted upload dialog can briefly retain a project ID after that project
    // is deleted or after the authenticated account changes. This read-only
    // subscription must not surface that expected cleanup race as a client error.
    if (project === null || project.userId !== userId) return [];
    const tasks = await ctx.db.query("uploadTasks").withIndex("by_project", (query) => query.eq("projectId", args.projectId)).collect();
    return tasks.filter((task) => task.userId === userId).sort((first, second) => first.createdAt - second.createdAt);
  },
});

export const activeCount = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireCurrentUser(ctx);
    const tasks = await ctx.db.query("uploadTasks").withIndex("by_user_status", (query) => query.eq("userId", userId).eq("status", "uploading")).collect();
    return tasks.length;
  },
});
