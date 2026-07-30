"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";
import { PopConfirm } from "@/components/ui/popconfirm";
import { api } from "@/lib/convex";

type SignOutDestination = "/" | "/sign-in";

export function AccountSessionActions() {
  const { t } = useLanguage();
  const router = useRouter();
  const { signOut } = useAuthActions();
  const activeUploadCount = useQuery(api.uploadTasks.activeCount);
  const interruptActiveUploads = useMutation(api.uploadTasks.interruptActive);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut(destination: SignOutDestination) {
    setError(null);
    setIsSigningOut(true);

    try {
      if ((activeUploadCount ?? 0) > 0) await interruptActiveUploads({});
      await signOut();
      router.push(destination);
      router.refresh();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Could not sign out");
    } finally {
      setIsSigningOut(false);
    }
  }

  function renderAction(label: string, destination: SignOutDestination, className: string) {
    const action = (
      <Button type="button" size="sm" className={`h-9 flex-1 px-2 text-xs text-white ${className}`} disabled={isSigningOut} aria-busy={isSigningOut}>
        {isSigningOut ? t("working") : label}
      </Button>
    );

    if ((activeUploadCount ?? 0) === 0) {
      return <Button key={destination} type="button" size="sm" className={`h-9 flex-1 px-2 text-xs text-white ${className}`} disabled={isSigningOut} aria-busy={isSigningOut} onClick={() => void handleSignOut(destination)}>{isSigningOut ? t("working") : label}</Button>;
    }

    return (
      <PopConfirm
        key={destination}
        title={t("uploadsInProgress")}
        description={t("signOutInterruptsUploads").replace("{count}", String(activeUploadCount))}
        confirmLabel={t("signOutAnyway")}
        cancelLabel={t("cancel")}
        disabled={isSigningOut}
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
