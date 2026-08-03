import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./authz";

const maxAvatarSize = 5 * 1024 * 1024;
const allowedAvatarMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function validateDisplayName(displayName: string) {
  const trimmedDisplayName = displayName.trim();
  if (trimmedDisplayName.length < 2 || trimmedDisplayName.length > 80) {
    throw new Error("Display name must be between 2 and 80 characters");
  }

  return trimmedDisplayName;
}

function validateAvatar(mimeType: string, size: number) {
  if (!allowedAvatarMimeTypes.has(mimeType)) {
    throw new Error("Avatar must be a JPG, PNG, or WEBP image");
  }
  if (size <= 0 || size > maxAvatarSize) {
    throw new Error("Avatar must be between 1 byte and 5 MB");
  }
}

export const current = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx).catch(() => null);
    if (user === null) {
      return null;
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (query) => query.eq("userId", user.userId))
      .unique();
    const avatarUrl = profile?.avatarStorageId === undefined ? undefined : await ctx.storage.getUrl(profile.avatarStorageId);

    return {
      subject: user.userId,
      email: user.email,
      name: profile?.displayName ?? user.name,
      image: avatarUrl ?? user.image,
    };
  },
});

export const generateAvatarUploadUrl = mutation({
  args: { mimeType: v.string(), size: v.number() },
  handler: async (ctx, args) => {
    await requireCurrentUser(ctx);
    validateAvatar(args.mimeType, args.size);
    return await ctx.storage.generateUploadUrl();
  },
});

export const updateProfile = mutation({
  args: {
    displayName: v.string(),
    avatarStorageId: v.optional(v.id("_storage")),
    removeAvatar: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireCurrentUser(ctx);
    const displayName = validateDisplayName(args.displayName);
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (query) => query.eq("userId", userId))
      .unique();
    const previousAvatarStorageId = profile?.avatarStorageId;
    const nextAvatarStorageId = args.removeAvatar ? undefined : args.avatarStorageId;
    const updatesAvatar = args.removeAvatar || args.avatarStorageId !== undefined;
    if (nextAvatarStorageId !== undefined) {
      const metadata = await ctx.db.system.get("_storage", nextAvatarStorageId);
      if (metadata === null) throw new Error("Profile photo upload was not found");
      validateAvatar(metadata.contentType ?? "", metadata.size);
      const existingProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_avatar", (query) => query.eq("avatarStorageId", nextAvatarStorageId))
        .unique();
      if (existingProfile !== null && existingProfile.userId !== userId) {
        throw new Error("Profile photo is already attached to another account");
      }
      const existingAsset = await ctx.db
        .query("assets")
        .withIndex("by_storage", (query) => query.eq("storageId", nextAvatarStorageId))
        .unique();
      const existingUploadTask = await ctx.db
        .query("uploadTasks")
        .withIndex("by_storage", (query) => query.eq("storageId", nextAvatarStorageId))
        .unique();
      if (existingAsset !== null || existingUploadTask !== null) {
        throw new Error("Profile photo is already attached to another record");
      }
    }
    const now = Date.now();

    if (profile === null) {
      await ctx.db.insert("userProfiles", {
        userId,
        displayName,
        ...(nextAvatarStorageId === undefined ? {} : { avatarStorageId: nextAvatarStorageId }),
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(profile._id, {
        displayName,
        ...(updatesAvatar ? { avatarStorageId: nextAvatarStorageId } : {}),
        updatedAt: now,
      });
    }

    if (updatesAvatar && previousAvatarStorageId !== undefined && previousAvatarStorageId !== nextAvatarStorageId) {
      await ctx.storage.delete(previousAvatarStorageId);
    }
  },
});
