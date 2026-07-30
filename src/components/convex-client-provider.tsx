"use client";

import type { ReactNode } from "react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl === undefined ? null : new ConvexReactClient(convexUrl);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (convex === null) {
    return <>{children}</>;
  }

  return <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>;
}
