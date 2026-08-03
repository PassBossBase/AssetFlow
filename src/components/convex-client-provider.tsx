"use client";

import type { ReactNode } from "react";
import { ConvexBetterAuthProvider, type AuthClient } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { authClient } from "@/lib/auth-client";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl === undefined ? null : new ConvexReactClient(convexUrl);
// The provider's published union omits additional Better Auth client plugins.
// Runtime compatibility is guaranteed by the shared convexClient plugin.
const providerAuthClient = authClient as unknown as AuthClient;

export function ConvexClientProvider({ children, initialToken }: { children: ReactNode; initialToken?: string | null }) {
  if (convex === null) {
    return <>{children}</>;
  }

  return <ConvexBetterAuthProvider client={convex} authClient={providerAuthClient} initialToken={initialToken}>{children}</ConvexBetterAuthProvider>;
}
