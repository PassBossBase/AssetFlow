"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";
import { PopConfirm } from "@/components/ui/popconfirm";
import { api } from "@/lib/convex";
import { authClient } from "@/lib/auth-client";

type SignOutDestination = "/" | "/sign-in";
type SessionTransitionPhase = "idle" | "signingOut" | "redirecting";

export function AccountSessionActions() {
  const { t } = useLanguage();
  const router = useRouter();
  const activeUploadCount = useQuery(api.uploadTasks.activeCount);
  const interruptActiveUploads = useMutation(api.uploadTasks.interruptActive);
  const [sessionTransitionPhase, setSessionTransitionPhase] = useState<SessionTransitionPhase>("idle");
  const [pendingDestination, setPendingDestination] = useState<SignOutDestination | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isSessionTransitioning = sessionTransitionPhase !== "idle";

  async function handleSignOut(destination: SignOutDestination) {
    if (isSessionTransitioning) return;
    setError(null);
    setPendingDestination(destination);
    setSessionTransitionPhase("signingOut");

    try {
      if ((activeUploadCount ?? 0) > 0) await interruptActiveUploads({});
      const result = await authClient.signOut();
      if (result.error !== null) throw new Error(result.error.message);
      setSessionTransitionPhase("redirecting");
      router.replace(destination);
      router.refresh();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Could not sign out");
      setPendingDestination(null);
      setSessionTransitionPhase("idle");
    }
  }

  function renderAction(label: string, destination: SignOutDestination, className: string) {
    const progressLabel = pendingDestination === "/sign-in" ? t("switchingAccount") : t("signingOut");
    const actionLabel = isSessionTransitioning ? <><LoaderCircle aria-hidden="true" className="size-3.5 animate-spin motion-reduce:animate-none" />{progressLabel}</> : label;
    const action = (
      <Button type="button" size="sm" className={`h-9 flex-1 px-2 text-xs text-white ${className}`} disabled={isSessionTransitioning} aria-busy={isSessionTransitioning}>
        {actionLabel}
      </Button>
    );

    if ((activeUploadCount ?? 0) === 0) {
      return <Button key={destination} type="button" size="sm" className={`h-9 flex-1 px-2 text-xs text-white ${className}`} disabled={isSessionTransitioning} aria-busy={isSessionTransitioning} onClick={() => void handleSignOut(destination)}>{actionLabel}</Button>;
    }

    return (
      <PopConfirm
        key={destination}
        title={t("uploadsInProgress")}
        description={t("signOutInterruptsUploads").replace("{count}", String(activeUploadCount))}
        confirmLabel={t("signOutAnyway")}
        cancelLabel={t("cancel")}
        disabled={isSessionTransitioning}
        onConfirm={() => handleSignOut(destination)}
        trigger={action}
      />
    );
  }

  return (
    <div className="space-y-2">
      {error !== null ? <p className="px-1 text-xs text-destructive" role="alert">{error}</p> : null}
      <div className="flex gap-2">
        {renderAction(t("switchAccount"), "/sign-in", "bg-blue-600 hover:bg-blue-500")}
        {renderAction(t("signOut"), "/", "bg-red-600 hover:bg-red-500")}
      </div>
    </div>
  );
}
