"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { CircleUserRound, FolderKanban, LayoutDashboard } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

export function DashboardSidebar() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const primaryNavigationItems = [
    { href: "/dashboard", label: t("workbench"), icon: LayoutDashboard, isActive: pathname === "/dashboard" },
    { href: "/dashboard/projects", label: t("projectManagement"), icon: FolderKanban, isActive: pathname.startsWith("/dashboard/projects") },
  ];
  const profileIsActive = pathname.startsWith("/dashboard/profile");

  return (
    <aside className="workspace-shell-chrome relative z-20 border-b px-4 py-4 md:fixed md:inset-y-0 md:left-0 md:flex md:w-56 md:flex-col md:border-r md:px-5 md:py-6">
      <div className="flex items-center justify-between gap-4 md:block">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2.5 text-lg font-semibold tracking-[-0.035em]"
          >
            <Image
              src="/images/icon.svg"
              alt=""
              width={24}
              height={24}
              className="size-6 shrink-0"
              priority
            />
            <span>AssetFlow AI</span>
          </Link>
          <p className="mt-1 ml-[34px] text-xs leading-5 text-muted-foreground">{t("digitalAssetWorkspace")}</p>
        </div>
        <nav className="text-sm md:mt-10" aria-label="Dashboard navigation">
          <div className="flex gap-2 md:block md:space-y-2">
            {primaryNavigationItems.map((item) => {
              const Icon = item.icon;
              return (
              <Link
                key={item.href}
                className={item.isActive ? "flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 font-medium text-primary shadow-[inset_0_1px_0_rgb(255_255_255_/_0.08)]" : "flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition-colors duration-200 hover:bg-white/[0.045] hover:text-foreground"}
                href={item.href}
                aria-current={item.isActive ? "page" : undefined}
              >
                <Icon className="size-4" aria-hidden="true" />
                {item.label}
              </Link>
              );
            })}
          </div>
        </nav>
      </div>
      <nav className="mt-2 md:mt-auto md:border-t md:border-white/[0.08] md:pt-3" aria-label={t("account")}>
        <Link
          className={profileIsActive ? "flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 font-medium text-primary shadow-[inset_0_1px_0_rgb(255_255_255_/_0.08)]" : "flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition-colors duration-200 hover:bg-white/[0.045] hover:text-foreground"}
          href="/dashboard/profile"
          aria-current={profileIsActive ? "page" : undefined}
        >
          <CircleUserRound className="size-4" aria-hidden="true" />
          {t("personalCenter")}
        </Link>
      </nav>
    </aside>
  );
}
