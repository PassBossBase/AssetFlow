"use client";

import { useQuery } from "convex/react";

import { useLanguage } from "@/components/language-provider";
import { api } from "@/lib/convex";

export function CurrentUser() {
  const { t } = useLanguage();
  const identity = useQuery(api.users.current);
  const label = identity?.email ?? identity?.name ?? t("workspaceMember");

  return (
    <div className="hidden text-right sm:block" aria-live="polite">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{t("signedInAs")}</p>
      {identity === undefined ? <div className="mt-1 h-4 w-32 animate-pulse rounded bg-muted" aria-label="Loading user" /> : <p className="mt-1 max-w-48 truncate text-sm text-foreground">{label}</p>}
    </div>
  );
}
