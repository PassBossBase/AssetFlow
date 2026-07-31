"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Download, Pencil, Trash2 } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PopConfirm } from "@/components/ui/popconfirm";
import { api, type Id } from "@/lib/convex";
import { formatFileSize } from "@/features/assets/lib/files";
import { AssetPreview } from "@/features/assets/components/asset-preview";

type WritableFile = {
  write: (data: Blob) => Promise<void>;
  close: () => Promise<void>;
};

type SaveFileHandle = {
  createWritable: () => Promise<WritableFile>;
};

type SaveFilePicker = (options: { suggestedName: string; types: Array<{ description: string; accept: Record<string, string[]> }> }) => Promise<SaveFileHandle>;

export function AssetDetail({ id }: { id: string }) {
  const { language, t } = useLanguage();
  const router = useRouter();
  const assetId = id as Id<"assets">;
  const asset = useQuery(api.assets.get, id === "test" ? "skip" : { id: assetId });
  const downloadUrl = useQuery(api.assets.getDownloadUrl, asset === undefined || asset === null ? "skip" : { id: asset._id });
  const renameAsset = useMutation(api.assets.rename);
  const removeAsset = useMutation(api.assets.remove);
  const [name, setName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (id === "test") {
    return (
      <section className="mx-auto max-w-3xl space-y-6 px-6 py-12">
        <div>
          <p className="text-sm font-medium text-primary">{t("assetPlaceholder")}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{t("assetDetail")}</h1>
        </div>
        <Card className="workspace-glass-surface">
          <CardHeader>
            <CardTitle>{t("assetDetail")}</CardTitle>
            <CardDescription>{t("assetPhaseDescription")}</CardDescription>
          </CardHeader>
          <CardContent><Button asChild><Link href="/dashboard">{t("backToDashboard")}</Link></Button></CardContent>
        </Card>
      </section>
    );
  }

  if (asset === undefined) {
    return <main className="mx-auto max-w-6xl px-6 py-12 text-sm text-muted-foreground">{t("loadingAsset")}</main>;
  }

  if (asset === null) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">{t("assetNotFound")}</h1>
        <Button asChild variant="outline"><Link href="/dashboard">{t("backToDashboard")}</Link></Button>
      </main>
    );
  }

  const currentAsset = asset;
  const dateFormatter = new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en", { dateStyle: "medium" });

  async function handleRename() {
    if (name.trim().length === 0 || name.trim() === currentAsset.name) {
      setIsEditing(false);
      setName(currentAsset.name);
      return;
    }

    setFeedback(null);
    setIsBusy(true);
    try {
      await renameAsset({ id: currentAsset._id, name });
      setIsEditing(false);
      toast.add({ type: "success", title: t("assetRenamed") });
    } catch (renameError) {
      setFeedback(renameError instanceof Error ? renameError.message : t("couldNotRenameAsset"));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRemove() {
    setFeedback(null);
    setIsBusy(true);
    try {
      await removeAsset({ id: currentAsset._id });
      toast.add({ type: "error", title: t("assetRemovedNamed").replace("{name}", currentAsset.name) });
      router.push(`/project/${currentAsset.projectId}`);
    } catch (removeError) {
      setFeedback(removeError instanceof Error ? removeError.message : t("couldNotRemoveAsset"));
      setIsBusy(false);
    }
  }

  async function handleDownload() {
    if (downloadUrl === null || downloadUrl === undefined) return;

    const saveFilePicker = (window as unknown as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
    if (saveFilePicker === undefined) {
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = currentAsset.name;
      link.click();
      return;
    }

    setFeedback(null);
    setIsDownloading(true);
    try {
      const handle = await saveFilePicker({
        suggestedName: currentAsset.name,
        types: [{ description: currentAsset.extension.toUpperCase(), accept: { [currentAsset.mimeType]: [`.${currentAsset.extension}`] } }],
      });
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error("Download request failed");
      const writable = await handle.createWritable();
      await writable.write(await response.blob());
      await writable.close();
      toast.add({ type: "success", title: t("downloadSaved") });
    } catch (downloadError) {
      if (!(downloadError instanceof DOMException && downloadError.name === "AbortError")) {
        setFeedback(downloadError instanceof Error ? downloadError.message : t("couldNotDownloadAsset"));
      }
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[96rem] px-4 py-7 sm:px-6 sm:py-8 lg:px-10 lg:py-10 xl:px-12">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.1] pb-5">
        <Button asChild className="shrink-0 border border-violet-500/80 bg-violet-700 text-white hover:bg-violet-800 hover:text-white">
          <Link href={`/project/${currentAsset.projectId}`}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t("backToProject")}
          </Link>
        </Button>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {downloadUrl ? <Button type="button" size="sm" className="h-10 border border-blue-500/80 bg-blue-700 px-5 text-white hover:bg-blue-800 hover:text-white" onClick={() => void handleDownload()} disabled={isBusy || isDownloading}><Download className="size-4" aria-hidden="true" />{isDownloading ? t("downloading") : t("download")}</Button> : null}
          <PopConfirm
            title={t("remove")}
            description={t("deleteAssetConfirm")}
            confirmLabel={t("confirm")}
            cancelLabel={t("cancel")}
            disabled={isBusy}
            onConfirm={handleRemove}
            trigger={<Button type="button" size="sm" className="h-10 border border-red-500/80 bg-red-700 px-5 text-white hover:bg-red-800 hover:text-white" disabled={isBusy}><Trash2 className="size-4" aria-hidden="true" />{t("remove")}</Button>}
          />
        </div>
      </header>

      <section className="pt-7 sm:pt-8" aria-labelledby="asset-preview-workspace">
        <div className="overflow-hidden rounded-2xl border border-white/[0.12] bg-[#0c1625] shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
          <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] px-5 py-4 sm:px-6">
            <h2 id="asset-preview-workspace" className="text-sm font-semibold">{t("assetPreview")}</h2>
            <span className="rounded-full border border-primary/25 bg-primary/[0.08] px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">{currentAsset.extension}</span>
          </div>
          <div className="grid lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="p-3 sm:p-5"><AssetPreview asset={currentAsset} url={downloadUrl} /></div>
            <aside className="border-t border-white/[0.08] bg-black/[0.08] p-5 lg:border-t-0 lg:border-l lg:p-6" aria-labelledby="asset-information-title">
              <h2 id="asset-information-title" className="text-lg font-semibold tracking-[-0.025em] text-primary">{t("assetMetadata")}</h2>
              <dl className="mt-5 divide-y divide-white/[0.08] text-sm">
                <div className="space-y-1.5 py-4 first:pt-0"><dt className="flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{t("assetName")}</span>{isEditing ? null : <button type="button" className="inline-flex size-7 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => { setName(currentAsset.name); setIsEditing(true); }} aria-label={t("renameAsset")}><Pencil className="size-3.5" aria-hidden="true" /></button>}</dt><dd className="break-words leading-6 font-medium">{isEditing ? <><input className="form-control h-10 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" value={name} onChange={(event) => setName(event.target.value)} maxLength={160} autoFocus /><span className="mt-3 grid grid-cols-2 gap-2"><Button type="button" size="sm" className="w-full" onClick={() => void handleRename()} disabled={isBusy}>{t("save")}</Button><Button type="button" variant="outline" size="sm" className="w-full" onClick={() => { setIsEditing(false); setName(currentAsset.name); }} disabled={isBusy}>{t("cancel")}</Button></span></> : currentAsset.name}</dd></div>
                <div className="space-y-1.5 py-4"><dt className="text-xs text-muted-foreground">{t("originalFileName")}</dt><dd className="break-words leading-6">{currentAsset.originalName}</dd></div>
                <div className="space-y-1.5 py-4"><dt className="text-xs text-muted-foreground">{t("fileType")}</dt><dd className="font-mono uppercase">{currentAsset.extension}</dd></div>
                <div className="space-y-1.5 py-4"><dt className="text-xs text-muted-foreground">{t("fileSize")}</dt><dd>{formatFileSize(currentAsset.size, language)}</dd></div>
                <div className="space-y-1.5 py-4"><dt className="text-xs text-muted-foreground">{t("uploaded")}</dt><dd>{dateFormatter.format(currentAsset.createdAt)}</dd></div>
                <div className="space-y-1.5 pb-0 pt-4"><dt className="text-xs text-muted-foreground">{t("updated")}</dt><dd>{dateFormatter.format(currentAsset.updatedAt)}</dd></div>
              </dl>
              {feedback !== null ? <p className="mt-5 rounded-md border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-muted-foreground" role="status">{feedback}</p> : null}
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
