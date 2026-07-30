"use client";

import dynamic from "next/dynamic";
import { Box } from "lucide-react";
import { useState } from "react";

import { useLanguage } from "@/components/language-provider";
import type { Asset } from "@/lib/convex";

type PreviewMode = "thumbnail" | "detail";

const ModelViewer = dynamic(
  () => import("@/features/assets/components/model-viewer").then((module) => module.ModelViewer),
  {
    ssr: false,
    loading: () => <DeferredModelViewerLoading />,
  },
);

function isImageExtension(extension: Asset["extension"]): boolean {
  return ["png", "jpg", "jpeg", "webp", "svg", "gif"].includes(extension);
}

function isModelExtension(extension: Asset["extension"]): boolean {
  return extension === "glb" || extension === "gltf";
}

function ModelThumbnail({ asset }: { asset: Asset }) {
  return (
    <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-xl border border-primary/20 bg-[radial-gradient(circle_at_28%_22%,rgb(56_217_245_/_0.18),transparent_32%),radial-gradient(circle_at_74%_78%,rgb(96_165_250_/_0.14),transparent_38%),#0b1524]">
      <span className="absolute inset-0 opacity-45 [background-image:linear-gradient(rgb(255_255_255_/_0.05)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255_/_0.05)_1px,transparent_1px)] [background-size:18px_18px]" aria-hidden="true" />
      <span className="relative flex size-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/[0.11] text-primary shadow-[0_0_28px_rgb(56_217_245_/_0.16)]">
        <Box className="size-7" strokeWidth={1.45} aria-hidden="true" />
      </span>
      <span className="absolute bottom-3 left-3 rounded-full border border-primary/25 bg-[#0a1928]/85 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">{asset.extension}</span>
    </div>
  );
}

export function ModelPreviewLoading({ label }: { label: string }) {
  return <div className="flex h-full min-h-40 items-center justify-center px-5 text-center text-sm text-muted-foreground">{label}</div>;
}

function DeferredModelViewerLoading() {
  const { t } = useLanguage();
  return <div className="flex h-[min(62vh,38rem)] min-h-80 items-center justify-center rounded-xl border border-primary/20 bg-[#0b1524]"><ModelPreviewLoading label={t("previewLoading")} /></div>;
}

export function AssetPreview({ asset, url, mode = "detail" }: { asset: Asset; url: string | null | undefined; mode?: PreviewMode }) {
  const { t } = useLanguage();
  const [imageFailed, setImageFailed] = useState(false);
  const isDetail = mode === "detail";
  const isModel = isModelExtension(asset.extension);
  const heightClassName = isDetail ? "h-[min(62vh,38rem)] min-h-80" : "h-44";

  if (isModel && !isDetail) return <ModelThumbnail asset={asset} />;

  if (url === undefined) {
    return <div className={`flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] ${heightClassName}`}><ModelPreviewLoading label={t("previewLoading")} /></div>;
  }

  if (url === null || imageFailed) {
    return <div className={`flex items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-6 text-center text-sm text-muted-foreground ${heightClassName}`}>{t("previewUnavailable")}</div>;
  }

  if (isImageExtension(asset.extension)) {
    return (
      <div className={`relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] ${isDetail ? "flex min-h-80 items-center justify-center p-4" : "h-44"}`}>
        <img src={url} alt={asset.name} className={isDetail ? "max-h-[min(58vh,34rem)] max-w-full object-contain" : "size-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"} onError={() => setImageFailed(true)} />
      </div>
    );
  }

  if (isModel) {
    return <ModelViewer url={url} label={t("previewUnavailable")} hint={t("modelControls")} loadingLabel={t("loadingModel")} preparingLabel={t("preparingModel")} />;
  }

  return <div className={`flex items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-6 text-center text-sm text-muted-foreground ${heightClassName}`}>{t("previewUnavailable")}</div>;
}
