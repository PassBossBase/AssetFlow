"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import Link from "next/link";

import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { AccountSessionActions } from "@/features/auth/components/sign-out-button";
import { ProfileAvatar } from "@/features/auth/components/profile-avatar";
import { api } from "@/lib/convex";

export function AccountMenu() {
  const { t } = useLanguage();
  const identity = useQuery(api.users.current);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const label = identity?.name ?? identity?.email ?? t("workspaceMember");

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current !== null && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Button type="button" variant="ghost" className="h-10 gap-2 px-2" onClick={() => setIsOpen((value) => !value)} aria-haspopup="menu" aria-expanded={isOpen}>
        <ProfileAvatar image={identity?.image} name={label} className="size-7 text-xs" />
        <span className="hidden max-w-40 truncate text-sm sm:block">{label}</span>
        <span className="text-xs text-muted-foreground" aria-hidden="true">⌄</span>
      </Button>
      {isOpen ? (
        <div className="absolute right-0 top-12 z-20 w-64 rounded-lg border border-white/15 bg-card/95 p-3 shadow-xl backdrop-blur-xl" role="menu">
          <div className="border-b border-border/70 px-2 pb-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{t("account")}</p>
            <p className="mt-1 truncate text-sm font-medium">{label}</p>
            {identity?.name && identity.email ? <p className="mt-1 truncate text-xs text-muted-foreground">{identity.email}</p> : null}
          </div>
          <div className="pt-3">
            <Link href="/dashboard/profile" className="mb-2 flex h-9 items-center rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.07] hover:text-foreground" role="menuitem" onClick={() => setIsOpen(false)}>{t("personalCenter")}</Link>
            <AccountSessionActions />
          </div>
        </div>
      ) : null}
    </div>
  );
}
