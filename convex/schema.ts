import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  userProfiles: defineTable({
    userId: v.string(),
    displayName: v.string(),
    avatarStorageId: v.optional(v.id("_storage")),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_avatar", ["avatarStorageId"]),
  projects: defineTable({
      name: v.string(),
      description: v.string(),
      userId: v.string(),
      sortOrder: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
    .index("by_user", ["userId"])
    .index("by_user_createdAt", ["userId", "createdAt"]),
  assets: defineTable({
    projectId: v.id("projects"),
    userId: v.string(),
    storageId: v.id("_storage"),
    name: v.string(),
    originalName: v.string(),
    extension: v.string(),
    mimeType: v.string(),
    size: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_createdAt", ["projectId", "createdAt"])
    .index("by_user", ["userId"])
    .index("by_storage", ["storageId"]),
  uploadBatches: defineTable({
    projectId: v.id("projects"),
    userId: v.string(),
    fileCount: v.number(),
    totalBytes: v.number(),
    completedCount: v.number(),
    completedBytes: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_user", ["userId"]),
  uploadTasks: defineTable({
    projectId: v.id("projects"),
    userId: v.string(),
    batchId: v.optional(v.id("uploadBatches")),
    fileName: v.string(),
    extension: v.string(),
    mimeType: v.string(),
    size: v.number(),
    progress: v.number(),
    status: v.union(v.literal("uploading"), v.literal("uploaded"), v.literal("failed"), v.literal("interrupted")),
    storageId: v.optional(v.id("_storage")),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_status", ["status"])
    .index("by_batch", ["batchId"])
    .index("by_storage", ["storageId"]),
});
