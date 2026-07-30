"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/components/language-provider";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLanguage();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-6 py-16 text-foreground">
      <Card className="w-full max-w-lg border-destructive/30 bg-card/80 backdrop-blur-xl">
        <CardHeader>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-destructive">{t("somethingWentWrong")}</p>
          <CardTitle>{t("couldNotLoadWorkspace")}</CardTitle>
          <CardDescription>{t("retryDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => reset()}>{t("tryAgain")}</Button>
          <Button asChild variant="outline"><Link href="/dashboard">{t("backToDashboard")}</Link></Button>
        </CardContent>
      </Card>
    </main>
  );
}
