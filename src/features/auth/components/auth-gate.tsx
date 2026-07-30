"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Authenticated, AuthLoading, Unauthenticated, useMutation } from "convex/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/components/language-provider";
import { api } from "@/lib/convex";

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
      <Authenticated><OwnershipMigrationGate>{children}</OwnershipMigrationGate></Authenticated>
    </>
  );
}

function OwnershipMigrationGate({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const normalizeLegacyOwnership = useMutation(api.migrations.normalizeLegacyOwnership);
  const [isReady, setIsReady] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isActive = true;

    void normalizeLegacyOwnership()
      .then(() => {
        if (isActive) setIsReady(true);
      })
      .catch(() => {
        if (isActive) setHasFailed(true);
      });

    return () => {
      isActive = false;
    };
  }, [attempt, normalizeLegacyOwnership]);

  if (isReady) return <>{children}</>;

  if (hasFailed) {
    return <main className="flex min-h-[100dvh] items-center justify-center px-6 py-16"><div className="space-y-4 text-center"><p className="text-sm text-muted-foreground">{t("couldNotLoadWorkspace")}</p><Button type="button" onClick={() => { setHasFailed(false); setAttempt((current) => current + 1); }}>{t("tryAgain")}</Button></div></main>;
  }

  return <LoadingWorkspace />;
}

function LoadingWorkspace() {
  const { t } = useLanguage();

  return <main className="flex min-h-[100dvh] items-center justify-center px-6 py-16 text-sm text-muted-foreground">{t("loadingWorkspace")}</main>;
}
