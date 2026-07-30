import { getAuthUserId } from "@convex-dev/auth/server";
import type { Auth } from "convex/server";
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

const maxAvatarSize = 5 * 1024 * 1024;
const allowedAvatarMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

async function requireUserId(ctx: { auth: Auth }) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  return String(userId);
}

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
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }

    const user = await ctx.db.get(userId);
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (query) => query.eq("userId", String(userId)))
      .unique();
    const avatarUrl = profile?.avatarStorageId === undefined ? undefined : await ctx.storage.getUrl(profile.avatarStorageId);

    return {
      subject: userId,
      email: user?.email,
      name: profile?.displayName ?? user?.name,
      image: avatarUrl ?? user?.image,
    };
  },
});

export const generateAvatarUploadUrl = mutation({
  args: { mimeType: v.string(), size: v.number() },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
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
    const userId = await requireUserId(ctx);
    const displayName = validateDisplayName(args.displayName);
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (query) => query.eq("userId", userId))
      .unique();
    const previousAvatarStorageId = profile?.avatarStorageId;
    const nextAvatarStorageId = args.removeAvatar ? undefined : args.avatarStorageId;
    const updatesAvatar = args.removeAvatar || args.avatarStorageId !== undefined;
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
