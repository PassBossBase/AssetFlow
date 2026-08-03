import { ConvexError } from "convex/values";

import { authComponent } from "./auth";
import type { DataModel } from "./_generated/dataModel";
import type { GenericCtx } from "@convex-dev/better-auth/utils";

export type CurrentUser = {
  userId: string;
  email: string;
  name: string;
  image: string | null | undefined;
};

/**
 * The only application authorization boundary. Unlike raw JWT identity access,
 * this verifies that the Better Auth session still exists and has not expired or
 * been revoked by the weekly session cleanup.
 */
export async function requireCurrentUser(ctx: GenericCtx<DataModel>): Promise<CurrentUser> {
  const user = await authComponent.getAuthUser(ctx);
  if (user === undefined || user === null) {
    throw new ConvexError("Unauthenticated");
  }

  return {
    userId: String(user._id),
    email: user.email,
    name: user.name,
    image: user.image,
  };
}
