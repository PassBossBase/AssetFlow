import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import type { GenericCtx } from "@convex-dev/better-auth/utils";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { captcha } from "better-auth/plugins";

import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import authSchema from "./betterAuth/schema";

function requireRuntimeEnv(name: "BETTER_AUTH_SECRET" | "SITE_URL" | "TURNSTILE_SECRET_KEY") {
  const value = process.env[name];
  if (value === undefined || value.length === 0) {
    throw new Error(`${name} must be configured in the Convex deployment`);
  }
  return value;
}

export const authComponent = createClient<DataModel, typeof authSchema>(components.betterAuth, {
  local: { schema: authSchema },
  verbose: false,
});

export function createAuthOptions(ctx: GenericCtx<DataModel>) {
  const isSchemaGeneration = Object.keys(ctx).length === 0;
  const secret = isSchemaGeneration ? "schema-generation-secret-not-for-runtime" : requireRuntimeEnv("BETTER_AUTH_SECRET");
  const baseURL = isSchemaGeneration ? "http://localhost:3000" : requireRuntimeEnv("SITE_URL");
  const turnstileSecret = isSchemaGeneration ? "schema-generation-secret-not-for-runtime" : requireRuntimeEnv("TURNSTILE_SECRET_KEY");

  return {
    appName: "AssetFlow AI",
    baseURL,
    secret,
    trustedOrigins: [baseURL],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: true,
    },
    session: {
      disableSessionRefresh: true,
      expiresIn: Number(process.env.AUTH_SESSION_EXPIRES_IN_SECONDS ?? 7 * 24 * 60 * 60),
      cookieCache: { enabled: false },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 20,
      customRules: {
        "/sign-up/email": { window: 60 * 60, max: 5 },
        "/sign-in/email": { window: 60, max: 5 },
      },
    },
    plugins: [
      captcha({
        provider: "cloudflare-turnstile",
        secretKey: turnstileSecret,
        endpoints: ["/sign-up/email", "/sign-in/email"],
      }),
      convex({ authConfig }),
    ],
  } satisfies BetterAuthOptions;
}

export function createAuth(ctx: GenericCtx<DataModel>) {
  return betterAuth(createAuthOptions(ctx));
}

export const { getAuthUser } = authComponent.clientApi();
