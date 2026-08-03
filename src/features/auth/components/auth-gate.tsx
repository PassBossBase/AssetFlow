"use client";

import Link from "next/link";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/components/language-provider";

const convexIsConfigured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

export function ConvexSetupNotice() {
  const { t } = useLanguage();

  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-6 py-16">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{t("connectConvex")}</CardTitle>
          <CardDescription>{t("convexSetupDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/">{t("backHome")}</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

function SignInRequired({ nextPath }: { nextPath: string }) {
  const { t } = useLanguage();

  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-6 py-16">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{t("signInRequired")}</CardTitle>
          <CardDescription>{t("signInRequiredDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href={`/sign-in?next=${encodeURIComponent(nextPath)}`}>{t("signIn")}</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

export function AuthGate({ children, nextPath = "/dashboard" }: { children: React.ReactNode; nextPath?: string }) {
  if (!convexIsConfigured) {
    return <ConvexSetupNotice />;
  }

  return (
    <>
      <AuthLoading>
        <LoadingWorkspace />
      </AuthLoading>
      <Unauthenticated>
        <SignInRequired nextPath={nextPath} />
      </Unauthenticated>
      <Authenticated>{children}</Authenticated>
    </>
  );
}

function LoadingWorkspace() {
  const { t } = useLanguage();

  return (
    <main className="min-h-[100dvh] bg-slate-950 px-6 py-16" aria-busy="true" aria-live="polite">
      <div className="mx-auto max-w-6xl space-y-8 motion-safe:animate-pulse motion-reduce:animate-none">
        <div className="flex items-center justify-between">
          <div className="h-8 w-44 rounded-lg bg-white/10" />
          <div className="h-9 w-28 rounded-lg bg-white/10" />
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {["first", "second", "third"].map((item) => <div key={item} className="h-40 rounded-2xl border border-white/10 bg-white/5" />)}
        </div>
        <p className="text-sm text-slate-300">{t("loadingWorkspace")}</p>
      </div>
    </main>
  );
}
