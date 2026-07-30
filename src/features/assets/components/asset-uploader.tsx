"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { RotateCcw, Trash2 } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api, type Id } from "@/lib/convex";
import { assetAccept, formatFileSize, getFileExtension, isSupportedExtension, maxAssetSize } from "@/features/assets/lib/files";

type UploadResponse = { storageId: string };
type UploadStatus = "pending" | "uploading" | "uploaded" | "failed";
type RemoteUploadStatus = "uploading" | "failed" | "interrupted";

type UploadItem = {
  id: string;
  file: File;
  progress: number;
  status: UploadStatus;
  error?: string;
  isDismissing?: boolean;
  taskId?: Id<"uploadTasks">;
};

type RemoteUploadTask = {
  _id: Id<"uploadTasks">;
  error?: string;
  fileName: string;
  progress: number;
  size: number;
  status: RemoteUploadStatus;
};

type RetryTarget = Pick<RemoteUploadTask, "_id" | "fileName" | "size">;

type CompletionTimers = {
  dismiss: ReturnType<typeof setTimeout>;
  remove?: ReturnType<typeof setTimeout>;
};

function isUploadResponse(value: unknown): value is UploadResponse {
  return typeof value === "object" && value !== null && "storageId" in value && typeof value.storageId === "string";
}

function uploadFileWithProgress(url: string, file: File, onProgress: (progress: number) => void): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", url);
    request.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    });
    request.addEventListener("load", () => {
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(`Upload failed with status ${request.status}`));
        return;
      }

      try {
        const payload: unknown = JSON.parse(request.responseText);
        if (!isUploadResponse(payload)) {
          reject(new Error("Upload response was invalid"));
          return;
        }
        resolve(payload);
      } catch {
        reject(new Error("Upload response was invalid"));
      }
    });
    request.addEventListener("error", () => reject(new Error("Upload request failed")));
    request.addEventListener("abort", () => reject(new Error("Upload was cancelled")));
    request.send(file);
  });
}

function getStatusLabel(status: UploadStatus, t: (key: "pendingUpload" | "uploading" | "uploadedStatus" | "uploadFailedStatus") => string): string {
  if (status === "uploading") return t("uploading");
  if (status === "uploaded") return t("uploadedStatus");
  if (status === "failed") return t("uploadFailedStatus");
  return t("pendingUpload");
}

function getRemoteStatusLabel(status: RemoteUploadStatus, t: (key: "uploading" | "uploadFailedStatus" | "uploadInterrupted") => string): string {
  if (status === "uploading") return t("uploading");
  if (status === "failed") return t("uploadFailedStatus");
  return t("uploadInterrupted");
}

function createUploadItem(file: File, index: number, taskId?: Id<"uploadTasks">): UploadItem {
  return {
    id: `${file.name}-${file.lastModified}-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    progress: 0,
    status: "pending",
    taskId,
  };
}

function shouldSyncProgress(syncRecords: Map<string, { progress: number; syncedAt: number }>, itemId: string, progress: number): boolean {
  const now = Date.now();
  const last = syncRecords.get(itemId);
  if (last !== undefined && progress < 100 && progress - last.progress < 5 && now - last.syncedAt < 900) return false;
  syncRecords.set(itemId, { progress, syncedAt: now });
  return true;
}

export function AssetUploader({ projectId }: { projectId: Id<"projects"> }) {
  const { language, t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const completionTimersRef = useRef<Map<string, CompletionTimers>>(new Map());
  const activeTaskIdsRef = useRef<Set<string>>(new Set());
  const activeRemoteTaskIdsRef = useRef<Set<Id<"uploadTasks">>>(new Set());
  const progressSyncRef = useRef<Map<string, { progress: number; syncedAt: number }>>(new Map());
  const generateUploadUrl = useMutation(api.assets.generateUploadUrl);
  const createUploadTask = useMutation(api.uploadTasks.create);
  const retryUploadTask = useMutation(api.uploadTasks.retry);
  const updateUploadProgress = useMutation(api.uploadTasks.updateProgress);
  const heartbeatUploadTask = useMutation(api.uploadTasks.heartbeat);
  const failUploadTask = useMutation(api.uploadTasks.fail);
  const completeUploadTask = useMutation(api.uploadTasks.complete);
  const removeUploadTask = useMutation(api.uploadTasks.remove);
  const recoverInterruptedUploads = useMutation(api.uploadTasks.recoverInterrupted);
  const persistedTasks = useQuery(api.uploadTasks.listForProject, { projectId }) as RemoteUploadTask[] | undefined;
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [retryTarget, setRetryTarget] = useState<RetryTarget | null>(null);

  function updateItem(id: string, update: Partial<Pick<UploadItem, "progress" | "status" | "error" | "isDismissing" | "taskId">>) {
    setUploadItems((current) => current.map((item) => item.id === id ? { ...item, ...update } : item));
  }

  function clearCompletionTimer(id: string) {
    const timers = completionTimersRef.current.get(id);
    if (timers === undefined) return;
    clearTimeout(timers.dismiss);
    if (timers.remove !== undefined) clearTimeout(timers.remove);
    completionTimersRef.current.delete(id);
  }

  function clearCompletionTimers() {
    completionTimersRef.current.forEach((timers) => {
      clearTimeout(timers.dismiss);
      if (timers.remove !== undefined) clearTimeout(timers.remove);
    });
    completionTimersRef.current.clear();
  }

  function scheduleCompletedTaskRemoval(id: string) {
    clearCompletionTimer(id);
    const dismiss = setTimeout(() => {
      updateItem(id, { isDismissing: true });
      const remove = setTimeout(() => {
        completionTimersRef.current.delete(id);
        progressSyncRef.current.delete(id);
        setUploadItems((current) => current.filter((item) => item.id !== id));
      }, 260);
      const timers = completionTimersRef.current.get(id);
      if (timers !== undefined) completionTimersRef.current.set(id, { ...timers, remove });
    }, 3000);
    completionTimersRef.current.set(id, { dismiss });
  }

  useEffect(() => () => clearCompletionTimers(), []);

  useEffect(() => {
    void recoverInterruptedUploads({ projectId });
    const timer = window.setTimeout(() => void recoverInterruptedUploads({ projectId }), 13_000);
    return () => window.clearTimeout(timer);
  }, [projectId, recoverInterruptedUploads]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      activeRemoteTaskIdsRef.current.forEach((id) => void heartbeatUploadTask({ id }));
    }, 4_000);
    return () => window.clearInterval(interval);
  }, [heartbeatUploadTask]);

  function handleFiles(fileList: FileList | File[]) {
    const selectedFiles = Array.from(fileList);
    if (retryTarget !== null) {
      const file = selectedFiles[0];
      if (selectedFiles.length !== 1 || file === undefined || file.name !== retryTarget.fileName || file.size !== retryTarget.size) {
        setError(t("uploadInterruptedDescription"));
        return;
      }

      const item = createUploadItem(file, 0, retryTarget._id);
      setRetryTarget(null);
      setUploadItems((current) => [...current, item]);
      setError(null);
      setStatus(null);
      void startUploads([item]);
      return;
    }

    const validFiles: UploadItem[] = [];
    const rejectedFiles: string[] = [];
    selectedFiles.forEach((file, index) => {
      const extension = getFileExtension(file.name);
      if (!isSupportedExtension(extension) || file.size > maxAssetSize) {
        rejectedFiles.push(file.name);
        return;
      }
      validFiles.push(createUploadItem(file, index));
    });

    setUploadItems((current) => [...current, ...validFiles]);
    setError(rejectedFiles.length > 0 ? `${t("unsupportedOrTooLargeFiles")} ${rejectedFiles.join(", ")}` : null);
    setStatus(null);
  }

  function handleSelect(event: ChangeEvent<HTMLInputElement>) {
    handleFiles(event.target.files ?? []);
    event.target.value = "";
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  }

  function handleDropzoneKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputRef.current?.click();
    }
  }

  function syncProgress(taskId: Id<"uploadTasks">, itemId: string, progress: number) {
    if (!shouldSyncProgress(progressSyncRef.current, itemId, progress)) return;
    void updateUploadProgress({ id: taskId, progress });
  }

  async function startUploads(items: readonly UploadItem[]) {
    if (items.length === 0) {
      setError(t("noFileSelected"));
      return;
    }

    setError(null);
    setStatus(null);
    let uploadedCount = 0;
    let failedCount = 0;

    await Promise.all(items.filter((item) => !activeTaskIdsRef.current.has(item.id)).map(async (item) => {
      activeTaskIdsRef.current.add(item.id);
      updateItem(item.id, { status: "uploading", progress: 0, error: undefined });
      let taskId: Id<"uploadTasks"> | undefined;
      try {
        if (item.taskId === undefined) {
          taskId = await createUploadTask({
            projectId,
            fileName: item.file.name,
            extension: getFileExtension(item.file.name),
            mimeType: item.file.type || "application/octet-stream",
            size: item.file.size,
          });
          updateItem(item.id, { taskId });
        } else {
          taskId = item.taskId;
          await retryUploadTask({ id: taskId });
        }

        if (taskId === undefined) throw new Error("Upload task could not be created");
        const resolvedTaskId = taskId;
        activeRemoteTaskIdsRef.current.add(resolvedTaskId);
        const postUrl = await generateUploadUrl({ projectId });
        const payload = await uploadFileWithProgress(postUrl, item.file, (progress) => {
          updateItem(item.id, { progress });
          syncProgress(resolvedTaskId, item.id, progress);
        });
        await completeUploadTask({ id: resolvedTaskId, storageId: payload.storageId as Id<"_storage"> });
        updateItem(item.id, { status: "uploaded", progress: 100 });
        scheduleCompletedTaskRemoval(item.id);
        uploadedCount += 1;
      } catch (uploadError) {
        failedCount += 1;
        const message = uploadError instanceof Error ? uploadError.message : t("uploadFailed");
        updateItem(item.id, { status: "failed", error: message });
        if (taskId !== undefined) {
          try {
            await failUploadTask({ id: taskId, error: message });
          } catch {
            // The task may already be deleted after a completed upload response.
          }
        }
      } finally {
        if (taskId !== undefined) activeRemoteTaskIdsRef.current.delete(taskId);
        activeTaskIdsRef.current.delete(item.id);
      }
    }));

    const summary = failedCount === 0 ? t("uploadComplete") : t("uploadBatchSummary").replace("{uploaded}", String(uploadedCount)).replace("{failed}", String(failedCount));
    setStatus(failedCount > 0 ? summary : null);
    if (failedCount === 0) {
      toast.add({ type: "success", title: summary });
    } else if (uploadedCount > 0) {
      toast.add({ type: "info", title: summary });
    } else {
      toast.add({ type: "error", title: t("uploadFailed"), priority: "high" });
    }
  }

  function handleUpload() {
    const queuedItems = uploadItems.filter((item) => (item.status === "pending" || item.status === "failed") && !activeTaskIdsRef.current.has(item.id));
    void startUploads(queuedItems);
  }

  function handleRemoveTask(id: string) {
    clearCompletionTimer(id);
    progressSyncRef.current.delete(id);
    setUploadItems((current) => current.filter((item) => item.id !== id));
    setError(null);
    setStatus(null);
  }

  function handleRetryTask(item: UploadItem) {
    clearCompletionTimer(item.id);
    setError(null);
    setStatus(null);
    void startUploads([item]);
  }

  function handleChooseFileToRetry(task: RemoteUploadTask) {
    setRetryTarget({ _id: task._id, fileName: task.fileName, size: task.size });
    setError(null);
    inputRef.current?.click();
  }

  function handleRemovePersistedTask(id: Id<"uploadTasks">) {
    void removeUploadTask({ id }).catch((removeError: unknown) => {
      setError(removeError instanceof Error ? removeError.message : t("uploadFailed"));
    });
  }

  const queuedCount = uploadItems.filter((item) => item.status === "pending" || item.status === "failed").length;
  const localTaskIds = new Set(uploadItems.flatMap((item) => item.taskId === undefined ? [] : [item.taskId]));
  const remoteTasks = (persistedTasks ?? []).filter((task) => !localTaskIds.has(task._id));
  const isUploading = uploadItems.some((item) => item.status === "uploading") || remoteTasks.some((task) => task.status === "uploading");
  const hasVisibleTasks = uploadItems.length > 0 || remoteTasks.length > 0;

  return (
    <Card className="workspace-glass-surface overflow-hidden border-white/[0.12] bg-[#0c1625]">
      <CardHeader className="flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle>{t("uploadAssets")}</CardTitle>
          <CardDescription>{t("supportedFormats")} · {t("maxFileSize")}</CardDescription>
        </div>
        <Button
          type="button"
          className="workspace-primary-action min-w-36 disabled:border-white/[0.08] disabled:bg-white/[0.06] disabled:text-muted-foreground disabled:shadow-none"
          onClick={handleUpload}
          disabled={queuedCount === 0}
          aria-busy={isUploading}
        >
          {queuedCount > 0 ? `${t("uploadSelected")}${` (${queuedCount})`}` : isUploading ? t("uploadingFiles") : t("uploadSelected")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          role="button"
          tabIndex={0}
          aria-disabled={false}
          onClick={() => inputRef.current?.click()}
          onKeyDown={handleDropzoneKeyDown}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-8 text-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isDragging ? "border-primary bg-primary/15 shadow-[0_0_0_4px_rgba(96,165,250,0.12)]" : "border-primary/40 bg-background/40 hover:border-primary hover:bg-primary/[0.08]"}`}
        >
          <span className="text-sm font-medium text-foreground">{isDragging ? t("dropFilesHere") : t("dragDropFiles")}</span>
          <span className="mt-1 text-xs text-muted-foreground">{t("supportedFormats")}</span>
          <span className="mt-3 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] text-muted-foreground">{t("batchUploadHint")}</span>
          <input ref={inputRef} className="sr-only" type="file" accept={assetAccept} multiple={retryTarget === null} onChange={handleSelect} />
        </div>

        {hasVisibleTasks ? (
          <ul className="space-y-2" aria-label={t("uploadQueue")}>
            {uploadItems.map((item) => (
              <li key={item.id} className={`overflow-hidden rounded-lg border bg-background/35 px-3 py-3 transition-[max-height,opacity,transform,margin,padding,border-color] duration-300 ease-out motion-reduce:transition-none ${item.isDismissing ? "max-h-0 -translate-y-1 border-transparent py-0 opacity-0" : "max-h-40 border-white/10"}`}>
                <div className="flex items-start justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-medium">{item.file.name}</span>
                  <span className={`shrink-0 text-xs ${item.status === "failed" ? "text-destructive" : item.status === "uploaded" ? "text-emerald-400" : "text-muted-foreground"}`}>{getStatusLabel(item.status, t)}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={`${item.file.name} ${getStatusLabel(item.status, t)}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.progress}>
                  <div className={`h-full rounded-full transition-[width] duration-200 ${item.status === "failed" ? "bg-destructive" : item.status === "uploaded" ? "bg-emerald-400" : "bg-primary"}`} style={{ width: `${item.progress}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                  <span>{formatFileSize(item.file.size, language)}</span>
                  <span>{item.status === "failed" ? item.error : `${item.progress}%`}</span>
                </div>
                {item.status === "failed" ? (
                  <div className="mt-3 flex justify-end gap-2 border-t border-white/[0.08] pt-3">
                    <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-primary hover:bg-primary/[0.1] hover:text-primary" onClick={() => handleRetryTask(item)}>
                      <RotateCcw className="size-3.5" aria-hidden="true" />
                      {t("retryUpload")}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => handleRemoveTask(item.id)}>
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      {t("deleteUploadTask")}
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
            {remoteTasks.map((task) => (
              <li key={task._id} className="rounded-lg border border-white/10 bg-background/35 px-3 py-3">
                <div className="flex items-start justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-medium">{task.fileName}</span>
                  <span className={`shrink-0 text-xs ${task.status === "uploading" ? "text-primary" : "text-destructive"}`}>{getRemoteStatusLabel(task.status, t)}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={`${task.fileName} ${getRemoteStatusLabel(task.status, t)}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={task.progress}>
                  <div className={`h-full rounded-full transition-[width] duration-200 ${task.status === "uploading" ? "bg-primary" : "bg-destructive"}`} style={{ width: `${task.progress}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                  <span>{formatFileSize(task.size, language)}</span>
                  <span>{task.status === "uploading" ? `${task.progress}%` : task.error ?? t("uploadInterruptedDescription")}</span>
                </div>
                {task.status !== "uploading" ? (
                  <div className="mt-3 flex justify-end gap-2 border-t border-white/[0.08] pt-3">
                    <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-primary hover:bg-primary/[0.1] hover:text-primary" onClick={() => handleChooseFileToRetry(task)}>
                      <RotateCcw className="size-3.5" aria-hidden="true" />
                      {t("chooseFileToRetry")}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => handleRemovePersistedTask(task._id)}>
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      {t("deleteUploadTask")}
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        {error !== null ? <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p> : null}
        {status !== null ? <p className="text-sm text-muted-foreground" role="status" aria-live="polite">{status}</p> : null}
      </CardContent>
    </Card>
  );
}
