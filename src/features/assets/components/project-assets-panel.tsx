"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import {
  Check,
  ChevronDown,
  FolderInput,
  ImageOff,
  Search,
  SearchX,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PopConfirm } from "@/components/ui/popconfirm";
import { Popover } from "@/components/ui/popover";
import { api, type Asset, type Id } from "@/lib/convex";
import { assetExtensions, formatFileSize } from "@/features/assets/lib/files";
import { AssetUploader } from "@/features/assets/components/asset-uploader";
import { AssetPreview } from "@/features/assets/components/asset-preview";

const maxBatchAssetCount = 100;

function AssetCard({
  asset,
  isSelected,
  onSelectedChange,
}: {
  asset: Asset;
  isSelected: boolean;
  onSelectedChange: (selected: boolean) => void;
}) {
  const { language, t } = useLanguage();
  const renameAsset = useMutation(api.assets.rename);
  const removeAsset = useMutation(api.assets.remove);
  const downloadUrl = useQuery(api.assets.getDownloadUrl, { id: asset._id });
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(asset.name);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const date = new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en", {
    dateStyle: "medium",
  }).format(asset.createdAt);
  const hasDownload = downloadUrl !== null && downloadUrl !== undefined;
  const actionColumns =
    isEditing || !hasDownload ? "grid-cols-3" : "grid-cols-4";

  async function handleRename() {
    if (name.trim().length === 0 || name.trim() === asset.name) {
      setIsEditing(false);
      setName(asset.name);
      return;
    }

    setError(null);
    setIsBusy(true);
    try {
      await renameAsset({ id: asset._id, name });
      setIsEditing(false);
      toast.add({ type: "success", title: t("assetRenamed") });
    } catch (renameError) {
      setError(
        renameError instanceof Error ? renameError.message : t("uploadFailed"),
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRemove() {
    setError(null);
    setIsBusy(true);
    try {
      await removeAsset({ id: asset._id });
      toast.add({
        type: "success",
        title: t("assetRemovedNamed").replace("{name}", asset.name),
      });
    } catch (removeError) {
      setError(
        removeError instanceof Error ? removeError.message : t("uploadFailed"),
      );
    } finally {
      setIsBusy(false);
    }
  }

  const deletePopConfirm = (
    <PopConfirm
      triggerClassName="w-full"
      title={t("deleteAsset")}
      description={t("deleteAssetConfirm")}
      confirmLabel={t("confirm")}
      cancelLabel={t("cancel")}
      disabled={isBusy}
      onConfirm={handleRemove}
      trigger={
        <Button
          type="button"
          size="sm"
          className="w-full border border-[#fa807b]/65 bg-[#c83e3b] text-white shadow-[0_6px_16px_rgb(200_62_59_/_0.16)] hover:bg-[#de4b47] hover:text-white"
          disabled={isBusy}
        >
          {t("deleteAsset")}
        </Button>
      }
    />
  );

  return (
    <Card
      className={`workspace-glass-surface group transition-colors ${isSelected ? "border-primary/60 bg-primary/[0.045] shadow-[0_0_0_1px_rgb(56_217_245_/_0.13)]" : ""}`}
    >
      <CardContent className="relative p-3 pb-0">
        <label className="absolute left-5 top-5 z-10 flex size-6 cursor-pointer items-center justify-center rounded-md border border-white/[0.22] bg-[#08131f]/90 shadow-[0_2px_8px_rgb(0_0_0_/_0.24)] backdrop-blur-sm transition-colors hover:border-primary/80">
          <span className="sr-only">
            {t("selectAsset").replace("{name}", asset.name)}
          </span>
          <input
            type="checkbox"
            className="size-4 cursor-pointer accent-primary"
            checked={isSelected}
            onChange={(event) => onSelectedChange(event.target.checked)}
          />
        </label>
        <Link
          href={`/asset/${asset._id}`}
          aria-label={`${t("previewAsset")}: ${asset.name}`}
          className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <AssetPreview asset={asset} url={downloadUrl} mode="thumbnail" />
        </Link>
      </CardContent>
      <CardHeader className="pb-4">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 font-mono text-xs font-semibold uppercase text-primary">
            {asset.extension}
          </div>
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <label className="sr-only" htmlFor={`asset-name-${asset._id}`}>
                {t("assetName")}
              </label>
            ) : null}
            {isEditing ? (
              <input
                id={`asset-name-${asset._id}`}
                className="form-control h-9 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={160}
                autoFocus
              />
            ) : (
              <CardTitle className="truncate text-base">{asset.name}</CardTitle>
            )}
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {asset.originalName}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
          <div>
            <dt>{t("fileSize")}</dt>
            <dd className="mt-1 text-foreground">
              {formatFileSize(asset.size, language)}
            </dd>
          </div>
          <div>
            <dt>{t("uploaded")}</dt>
            <dd className="mt-1 text-foreground">{date}</dd>
          </div>
        </dl>
        {error !== null ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <div className={`grid gap-2 ${actionColumns}`}>
          {isEditing ? (
            <>
              <Button
                type="button"
                size="sm"
                className="w-full workspace-primary-action"
                onClick={() => void handleRename()}
                disabled={isBusy}
              >
                {t("save")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="w-full bg-white/[0.06] hover:bg-white/[0.1]"
                onClick={() => {
                  setIsEditing(false);
                  setName(asset.name);
                }}
                disabled={isBusy}
              >
                {t("cancel")}
              </Button>
              {deletePopConfirm}
            </>
          ) : (
            <>
              <Button
                asChild
                type="button"
                size="sm"
                className="w-full border border-[#27b6d5]/65 bg-[#087e97] text-white shadow-[0_6px_16px_rgb(8_126_151_/_0.16)] hover:bg-[#0a95b1] hover:text-white"
              >
                <Link href={`/asset/${asset._id}`}>{t("openPreview")}</Link>
              </Button>
              {hasDownload ? (
                <Button
                  asChild
                  type="button"
                  size="sm"
                  className="w-full border border-[#58db91]/60 bg-[#168044] text-white shadow-[0_6px_16px_rgb(22_128_68_/_0.16)] hover:bg-[#1c9851] hover:text-white"
                >
                  <a href={downloadUrl} download={asset.name}>
                    {t("download")}
                  </a>
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                className="w-full border border-[#bd8cf4]/55 bg-[#7d45ad] text-white shadow-[0_6px_16px_rgb(125_69_173_/_0.16)] hover:bg-[#9153c6] hover:text-white"
                onClick={() => setIsEditing(true)}
                disabled={isBusy}
              >
                {t("rename")}
              </Button>
              {deletePopConfirm}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

type ProjectOption = {
  _id: Id<"projects">;
  name: string;
};

function BatchMoveControl({
  disabled,
  onMove,
  projects,
  selectedCount,
  sourceProjectId,
}: {
  disabled: boolean;
  onMove: (targetProjectId: Id<"projects">) => Promise<boolean>;
  projects: ProjectOption[] | undefined;
  selectedCount: number;
  sourceProjectId: Id<"projects">;
}) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const targets = (projects ?? []).filter(
    (project) => project._id !== sourceProjectId,
  );

  async function handleMove(targetProjectId: Id<"projects">) {
    setIsMoving(true);
    try {
      const didMove = await onMove(targetProjectId);
      if (didMove) setIsOpen(false);
    } finally {
      setIsMoving(false);
    }
  }

  return (
    <Popover
      ariaLabel={t("moveSelectedAssets")}
      disabled={disabled}
      open={isOpen}
      onOpenChange={setIsOpen}
      popupClassName="w-80 p-0"
      popupHeight={340}
      popupWidth={320}
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 border border-violet-400/65 bg-violet-700 px-3 text-white shadow-[0_6px_16px_rgb(109_40_217_/_0.18)] hover:bg-violet-800 hover:text-white"
          disabled={disabled}
        >
          <FolderInput className="size-4 text-white" aria-hidden="true" />
          {t("moveAssets")}
        </Button>
      }
      content={
        <div>
          <div className="border-b border-white/[0.08] px-4 py-3.5">
            <p className="text-sm font-semibold text-foreground">
              {t("moveSelectedAssets")}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {t("moveSelectedAssetsDescription").replace(
                "{count}",
                String(selectedCount),
              )}
            </p>
          </div>
          {targets.length === 0 ? (
            <p className="px-4 py-5 text-sm text-muted-foreground">
              {t("noOtherProjects")}
            </p>
          ) : (
            <div className="workspace-scrollbar max-h-60 overflow-y-auto p-2">
              {targets.map((project) => (
                <button
                  key={project._id}
                  type="button"
                  className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-primary/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60"
                  disabled={isMoving}
                  onClick={() => void handleMove(project._id)}
                >
                  <span className="truncate">{project.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      }
    />
  );
}

function AssetTypeFilter({
  extension,
  onChange,
}: {
  extension: string;
  onChange: (extension: string) => void;
}) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const options = ["all", ...assetExtensions];
  const selectedLabel =
    extension === "all" ? t("allTypes") : extension.toUpperCase();

  return (
    <Popover
      ariaLabel={t("filterType")}
      open={isOpen}
      onOpenChange={setIsOpen}
      popupWidth={176}
      popupHeight={300}
      popupClassName="w-44 overflow-hidden p-1.5"
      triggerClassName="w-full"
      trigger={
        <button
          type="button"
          className="group flex h-11 w-full items-center gap-2 rounded-xl border border-white/[0.12] bg-[#0a1422]/85 px-3 text-left shadow-[inset_0_1px_0_rgb(255_255_255_/_0.035)] transition-colors hover:border-primary/35 hover:bg-[#0d1c2e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
        >
          <SlidersHorizontal
            className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 truncate text-sm text-foreground">
            {selectedLabel}
          </span>
          <ChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180 text-primary" : ""}`}
            aria-hidden="true"
          />
        </button>
      }
      content={
        <div
          className="max-h-64 overflow-y-auto py-0.5"
          role="listbox"
          aria-label={t("filterType")}
        >
          {options.map((option) => {
            const optionLabel =
              option === "all" ? t("allTypes") : option.toUpperCase();
            const isSelected = option === extension;

            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${isSelected ? "bg-primary/[0.15] font-medium text-primary" : "text-muted-foreground hover:bg-white/[0.07] hover:text-foreground"}`}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
              >
                {optionLabel}
                {isSelected ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : null}
              </button>
            );
          })}
        </div>
      }
    />
  );
}

export function ProjectAssetsPanel({
  projectId,
}: {
  projectId: Id<"projects">;
}) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [extension, setExtension] = useState("all");
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<Id<"assets">>>(
    new Set(),
  );
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [isBatchMoving, setIsBatchMoving] = useState(false);
  const batchMoveAssets = useMutation(api.assets.batchMove);
  const batchRemoveAssets = useMutation(api.assets.batchRemove);
  const projects = useQuery(api.projects.list);
  const assets = useQuery(api.assets.list, {
    projectId,
    search: search.trim() || undefined,
    extension: extension === "all" ? undefined : extension,
  });
  const selectedCount = selectedAssetIds.size;
  const areAllAssetsSelected = useMemo(
    () =>
      assets !== undefined &&
      assets.length > 0 &&
      assets.every((asset) => selectedAssetIds.has(asset._id)),
    [assets, selectedAssetIds],
  );

  function handleAssetSelectedChange(assetId: Id<"assets">, selected: boolean) {
    if (
      selected &&
      !selectedAssetIds.has(assetId) &&
      selectedAssetIds.size >= maxBatchAssetCount
    ) {
      toast.add({
        type: "error",
        title: t("batchSelectionLimit").replace(
          "{count}",
          String(maxBatchAssetCount),
        ),
      });
      return;
    }

    setSelectedAssetIds((current) => {
      const next = new Set(current);
      if (selected) next.add(assetId);
      else next.delete(assetId);
      return next;
    });
  }

  function handleToggleAllAssets() {
    if (assets === undefined) return;
    if (areAllAssetsSelected) {
      setSelectedAssetIds(new Set());
      return;
    }

    const ids = new Set<Id<"assets">>();
    const limit = Math.min(assets.length, maxBatchAssetCount);
    for (let i = 0; i < limit; i++) {
      ids.add(assets[i]._id);
    }
    setSelectedAssetIds(ids);
    if (assets.length > maxBatchAssetCount) {
      toast.add({
        type: "error",
        title: t("batchSelectionLimit").replace(
          "{count}",
          String(maxBatchAssetCount),
        ),
      });
    }
  }

  function handleSearchChange(nextSearch: string) {
    setSearch(nextSearch);
    setSelectedAssetIds(new Set());
  }

  function handleExtensionChange(nextExtension: string) {
    setExtension(nextExtension);
    setSelectedAssetIds(new Set());
  }

  async function handleBatchMove(targetProjectId: Id<"projects">) {
    const ids = Array.from(selectedAssetIds);
    if (ids.length === 0) return false;

    setIsBatchMoving(true);
    try {
      const movedCount = await batchMoveAssets({
        ids,
        projectId,
        targetProjectId,
      });
      setSelectedAssetIds(new Set());
      toast.add({
        type: "success",
        title: t("assetsMoved").replace("{count}", String(movedCount)),
      });
      return true;
    } catch (moveError) {
      toast.add({
        type: "error",
        title:
          moveError instanceof Error
            ? moveError.message
            : t("couldNotMoveAssets"),
        priority: "high",
      });
      return false;
    } finally {
      setIsBatchMoving(false);
    }
  }

  async function handleBatchRemove() {
    const ids = Array.from(selectedAssetIds);
    if (ids.length === 0) return;

    setIsBatchDeleting(true);
    try {
      const removedCount = await batchRemoveAssets({ ids, projectId });
      setSelectedAssetIds(new Set());
      toast.add({
        type: "success",
        title: t("assetsDeleted").replace("{count}", String(removedCount)),
      });
    } catch (removeError) {
      toast.add({
        type: "error",
        title:
          removeError instanceof Error
            ? removeError.message
            : t("couldNotDeleteAssets"),
        priority: "high",
      });
    } finally {
      setIsBatchDeleting(false);
    }
  }

  return (
    <section className="space-y-8" aria-labelledby="project-assets-title">
      <h2 id="project-assets-title" className="sr-only">
        {t("assets")}
      </h2>
      <AssetUploader projectId={projectId} />
      <section
        className="min-w-0 border-t border-white/[0.1] pt-6"
        aria-label={t("assets")}
      >
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold tracking-[-0.025em] text-primary">
              {t("assets")}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="group flex h-11 min-w-0 items-center gap-2 rounded-xl border border-white/[0.12] bg-[#0a1422]/85 px-3 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.035)] transition-colors focus-within:border-primary/55 focus-within:bg-[#0d1c2e] focus-within:ring-2 focus-within:ring-primary/20 sm:w-60">
              <Search
                className="size-4 shrink-0 text-muted-foreground transition-colors group-focus-within:text-primary"
                aria-hidden="true"
              />
              <span className="sr-only">{t("searchAssets")}</span>
              <input
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                value={search}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder={t("searchAssets")}
              />
            </label>
            <div className="w-full sm:w-44">
              <AssetTypeFilter
                extension={extension}
                onChange={handleExtensionChange}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 border border-blue-400/65 bg-blue-700 px-3 text-white shadow-[0_6px_16px_rgb(37_99_235_/_0.18)] hover:bg-blue-800 hover:text-white"
              onClick={handleToggleAllAssets}
              disabled={
                assets === undefined ||
                assets.length === 0 ||
                isBatchDeleting ||
                isBatchMoving
              }
            >
              <Check className="size-4 text-white" aria-hidden="true" />
              {areAllAssetsSelected
                ? t("clearSelection")
                : t("selectAllAssets")}
            </Button>
            <div
              className="flex flex-wrap items-center gap-2 sm:border-l sm:border-white/[0.1] sm:pl-2"
              role="group"
              aria-label={t("batchActions")}
            >
              <span className="inline-flex h-10 items-center rounded-lg border border-sky-300/45 bg-[#245284] px-3 text-sm font-medium text-white shadow-[0_6px_16px_rgb(36_82_132_/_0.15)]">
                {t("selectedAssets").replace("{count}", String(selectedCount))}
              </span>
              <BatchMoveControl
                disabled={
                  selectedCount === 0 || isBatchDeleting || isBatchMoving
                }
                onMove={handleBatchMove}
                projects={projects}
                selectedCount={selectedCount}
                sourceProjectId={projectId}
              />
              <PopConfirm
                title={t("deleteSelectedAssetsTitle")}
                description={t("deleteSelectedAssetsConfirm").replace(
                  "{count}",
                  String(selectedCount),
                )}
                confirmLabel={
                  isBatchDeleting ? t("deleting") : t("deleteSelectedAssets")
                }
                cancelLabel={t("cancel")}
                disabled={
                  selectedCount === 0 || isBatchDeleting || isBatchMoving
                }
                onConfirm={handleBatchRemove}
                trigger={
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="h-10 border border-[#fa807b]/65 bg-[#c83e3b] px-3 text-white shadow-[0_6px_16px_rgb(200_62_59_/_0.16)] hover:bg-[#de4b47] hover:text-white"
                    disabled={
                      selectedCount === 0 || isBatchDeleting || isBatchMoving
                    }
                    aria-busy={isBatchDeleting}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    {t("deleteSelectedAssets")}
                  </Button>
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 border border-slate-300/50 bg-slate-700 px-2.5 text-white shadow-[0_6px_16px_rgb(51_65_85_/_0.15)] hover:bg-slate-600 hover:text-white"
                onClick={() => setSelectedAssetIds(new Set())}
                disabled={
                  selectedCount === 0 || isBatchDeleting || isBatchMoving
                }
              >
                <X className="size-4 text-white" aria-hidden="true" />
                {t("clearSelection")}
              </Button>
            </div>
          </div>
        </div>
        <div>
          {assets === undefined ? (
            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              <div
                className="h-52 animate-pulse rounded-xl border bg-card/60"
                aria-hidden="true"
              />
              <div
                className="h-52 animate-pulse rounded-xl border bg-card/60"
                aria-hidden="true"
              />
              <div
                className="hidden h-52 animate-pulse rounded-xl border bg-card/60 2xl:block"
                aria-hidden="true"
              />
            </div>
          ) : assets.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.14] bg-white/[0.018] px-6 py-12 text-center shadow-[inset_0_1px_0_rgb(255_255_255_/_0.03)]">
              <span className="flex size-12 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.08] text-primary">
                {search.length > 0 || extension !== "all" ? (
                  <SearchX className="size-5" aria-hidden="true" />
                ) : (
                  <ImageOff className="size-5" aria-hidden="true" />
                )}
              </span>
              <p className="mt-4 font-semibold text-foreground">
                {search.length > 0 || extension !== "all"
                  ? t("noMatchingAssets")
                  : t("noAssets")}
              </p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                {search.length > 0 || extension !== "all"
                  ? t("adjustSearchFilters")
                  : t("noAssetsDescription")}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {assets.map((asset) => (
                <AssetCard
                  key={asset._id}
                  asset={asset}
                  isSelected={selectedAssetIds.has(asset._id)}
                  onSelectedChange={(selected) =>
                    handleAssetSelectedChange(asset._id, selected)
                  }
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
