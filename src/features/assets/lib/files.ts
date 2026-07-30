import type { Language } from "@/lib/i18n";

export const assetExtensions = ["png", "jpg", "jpeg", "webp", "svg", "gif", "glb", "gltf"] as const;
export type AssetExtension = (typeof assetExtensions)[number];
export const assetAccept = assetExtensions.map((extension) => `.${extension}`).join(",");
export const maxAssetSize = 250 * 1024 * 1024;

export function getFileExtension(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return extension;
}

export function isSupportedExtension(extension: string): extension is AssetExtension {
  return assetExtensions.includes(extension as AssetExtension);
}

export function formatFileSize(bytes: number, language: Language): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = language === "zh" ? ["KB", "MB", "GB"] : ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}
