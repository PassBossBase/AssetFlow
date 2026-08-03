import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;

if (convexUrl === undefined || convexSiteUrl === undefined) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL and NEXT_PUBLIC_CONVEX_SITE_URL must be configured");
}

export const { handler, getToken } = convexBetterAuthNextJs({ convexUrl, convexSiteUrl });
