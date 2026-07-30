"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Files, FolderOpen, HardDrive, PackageOpen, type LucideIcon } from "lucide-react";

import { GlassPanel } from "@/components/ui/glass-panel";
import { useLanguage } from "@/components/language-provider";
import { AssetPreview } from "@/features/assets/components/asset-preview";
import { formatFileSize } from "@/features/assets/lib/files";
import { api, type Asset, type Project } from "@/lib/convex";

type OverviewAsset = Asset & { url: string | null };

function WorkspaceMetricCard({ label, value, icon: Icon, href }: { label: string; value: string | number; icon: LucideIcon; href?: string }) {
  const content = (
    <GlassPanel
      variant="subtle"
      className={`min-h-32 border-white/[0.1] bg-[linear-gradient(135deg,rgb(15_42_57_/_0.68),rgb(11_20_34_/_0.92)_62%)] p-5 sm:p-6 ${href ? "cursor-pointer transition-[border-color,background-color] hover:border-primary/35 hover:bg-[linear-gradient(135deg,rgb(18_55_73_/_0.78),rgb(11_20_34_/_0.96)_62%)]" : ""}`}
    >
      <dl className="relative flex h-full flex-col">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg border border-primary/25 bg-primary/[0.09] text-primary" aria-hidden="true">
            <Icon className="size-[18px]" strokeWidth={1.7} />
          </span>
          <dt className="text-base font-semibold tracking-[-0.03em] text-foreground">{label}</dt>
        </div>
        <dd className="mt-auto pt-6 text-4xl font-semibold tracking-[-0.07em] text-foreground tabular-nums">{value}</dd>
      </dl>
    </GlassPanel>
  );

  return href ? <Link href={href} aria-label={`${label}: ${value}`} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{content}</Link> : content;
}

function WorkspaceMetrics({ projectCount, assetCount, assetStorageUsed }: { projectCount: number; assetCount: number; assetStorageUsed: number }) {
  const { language, t } = useLanguage();

  return (
    <section className="grid gap-4 md:grid-cols-3" aria-label={t("workbench")}>
      <WorkspaceMetricCard label={t("totalProjects")} value={projectCount} icon={FolderOpen} href="/dashboard/projects" />
      <WorkspaceMetricCard label={t("totalAssets")} value={assetCount} icon={Files} />
      <WorkspaceMetricCard label={t("assetStorageUsed")} value={formatFileSize(assetStorageUsed, language)} icon={HardDrive} />
    </section>
  );
}

function RecentAssetTile({ asset }: { asset: OverviewAsset }) {
  const { language, t } = useLanguage();
  const uploadedAt = new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en", { dateStyle: "medium" }).format(asset.createdAt);

  return (
    <Link href={`/asset/${asset._id}`} className="group block min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <div className="overflow-hidden rounded-xl border border-white/[0.09] bg-background/35 transition-[border-color,background-color] duration-200 group-hover:border-primary/35 group-hover:bg-primary/[0.045]">
        <AssetPreview asset={asset} url={asset.url} mode="thumbnail" />
        <div className="p-3.5">
          <p className="truncate text-sm font-medium">{asset.name}</p>
          <div className="mt-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <p className="min-w-0 truncate">{asset.extension.toUpperCase()} · {formatFileSize(asset.size, language)}</p>
            <p className="shrink-0 text-[11px]">{uploadedAt}</p>
          </div>
        </div>
      </div>
      <span className="sr-only">{t("openPreview")}</span>
    </Link>
  );
}

function RecentAssets({ assets, title, description }: { assets: OverviewAsset[]; title: string; description: string }) {
  const { t } = useLanguage();

  return (
    <GlassPanel variant="card" className="min-w-0 p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold tracking-[-0.03em]">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {assets.length === 0 ? (
        <div className="mt-6 flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.018] px-6 text-center shadow-[inset_0_1px_0_rgb(255_255_255_/_0.035)]">
          <div>
            <span aria-hidden="true" className="mx-auto flex size-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.08] text-primary">
              <PackageOpen className="size-5" strokeWidth={1.6} />
            </span>
            <p className="mt-5 text-xl font-semibold tracking-[-0.03em]">{t("emptyState")}</p>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => <RecentAssetTile key={asset._id} asset={asset} />)}
        </div>
      )}
    </GlassPanel>
  );
}

function RecentProjects({ projects }: { projects: Project[] }) {
  const { language, t } = useLanguage();
  const dateFormatter = new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en", { dateStyle: "medium" });

  return (
    <GlassPanel variant="card" className="min-w-0 p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-[-0.03em]">{t("recentProjects")}</h2>
        <Link href="/dashboard/projects" className="shrink-0 text-sm font-medium text-primary transition-opacity hover:opacity-80">{t("viewAll")}</Link>
      </div>
      {projects.length === 0 ? (
        <div className="mt-6 flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.018] px-6 text-center shadow-[inset_0_1px_0_rgb(255_255_255_/_0.035)]">
          <div className="max-w-sm">
            <span aria-hidden="true" className="mx-auto flex size-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.08] text-primary">
              <FolderOpen className="size-5" strokeWidth={1.6} />
            </span>
            <p className="mt-5 text-xl font-semibold tracking-[-0.03em]">{t("noProjects")}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("noProjectsDescription")}</p>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Link key={project._id} href={`/project/${project._id}`} className="rounded-xl border border-white/[0.09] bg-background/35 p-4 transition-[background-color,border-color] duration-200 hover:border-primary/35 hover:bg-primary/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <p className="truncate text-sm font-medium">{project.name}</p>
              <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">{project.description || t("noDescription")}</p>
              <p className="mt-4 text-xs text-muted-foreground">{dateFormatter.format(project.createdAt)}</p>
            </Link>
          ))}
        </div>
      )}
    </GlassPanel>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="grid gap-4 md:grid-cols-3"><div className="h-32 animate-pulse rounded-2xl border border-white/[0.08] bg-white/[0.04]" /><div className="h-32 animate-pulse rounded-2xl border border-white/[0.08] bg-white/[0.04]" /><div className="h-32 animate-pulse rounded-2xl border border-white/[0.08] bg-white/[0.04]" /></div>
      <div className="h-80 animate-pulse rounded-2xl border border-white/[0.08] bg-white/[0.04]" />
      <div className="h-56 animate-pulse rounded-2xl border border-white/[0.08] bg-white/[0.04]" />
    </div>
  );
}

export function WorkspaceOverview() {
  const { t } = useLanguage();
  const overview = useQuery(api.dashboard.overview);

  return (
    <section className="space-y-6" aria-labelledby="workspace-overview-title">
      <header>
        <div className="max-w-2xl">
          <h1 id="workspace-overview-title" className="text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">{t("workbench")}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">{t("workspaceOverviewDescription")}</p>
        </div>
      </header>

      {overview === undefined ? <WorkspaceSkeleton /> : (
        <>
          <WorkspaceMetrics projectCount={overview.projectCount} assetCount={overview.assetCount} assetStorageUsed={overview.assetStorageUsed} />
          <RecentAssets assets={overview.recentAssets} title={t("recentAssets")} description={t("recentAssetsDescription")} />
          <RecentProjects projects={overview.recentProjects} />
        </>
      )}
    </section>
  );
}
