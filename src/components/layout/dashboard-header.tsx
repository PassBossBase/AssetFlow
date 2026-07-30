"use client";

import { AccountMenu } from "@/features/auth/components/account-menu";
import { useLanguage } from "@/components/language-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { usePathname } from "next/navigation";

export function DashboardHeader() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const isProjectsPage = pathname.startsWith("/dashboard/projects");
  const isProfilePage = pathname.startsWith("/dashboard/profile");

  return (
    <header className="workspace-shell-chrome relative z-20 flex min-h-14 items-center justify-between gap-4 border-b px-4 sm:px-6 lg:px-8">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{isProjectsPage ? t("projectManagement") : isProfilePage ? t("personalCenter") : t("workbench")}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3 sm:gap-5">
        <LanguageToggle inline />
        <AccountMenu />
      </div>
    </header>
  );
}
