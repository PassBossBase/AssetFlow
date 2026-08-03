import { mutation } from "./_generated/server";
import { v } from "convex/values";

const maxBatchSize = 200;

// Component exports are never reachable from browsers. The parent app invokes
// this only from an internal scheduled mutation.
export const revokeSessionBatch = mutation({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit, maxBatchSize));
    const sessions = await ctx.db.query("session").take(limit);
    await Promise.all(sessions.map((session) => ctx.db.delete(session._id)));
    return { revoked: sessions.length, hasMore: sessions.length === limit };
  },
});

export const clearAllAuthData = mutation({
  args: {},
  handler: async (ctx) => {
    const [sessions, accounts, verifications, users, rateLimits, keys] = await Promise.all([
      ctx.db.query("session").collect(),
      ctx.db.query("account").collect(),
      ctx.db.query("verification").collect(),
      ctx.db.query("user").collect(),
      ctx.db.query("rateLimit").collect(),
      ctx.db.query("jwks").collect(),
    ]);
    await Promise.all([
      ...sessions.map((document) => ctx.db.delete(document._id)),
      ...accounts.map((document) => ctx.db.delete(document._id)),
      ...verifications.map((document) => ctx.db.delete(document._id)),
      ...users.map((document) => ctx.db.delete(document._id)),
      ...rateLimits.map((document) => ctx.db.delete(document._id)),
      ...keys.map((document) => ctx.db.delete(document._id)),
    ]);
    return { sessions: sessions.length, accounts: accounts.length, verifications: verifications.length, users: users.length, rateLimits: rateLimits.length, keys: keys.length };
  },
});
