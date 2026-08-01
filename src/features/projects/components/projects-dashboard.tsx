"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { AlertCircle, Check, ChevronDown, ChevronUp, File, FolderOpen, GripVertical, Images, RotateCcw, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/components/language-provider";
import { toast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { PopConfirm } from "@/components/ui/popconfirm";
import { AssetUploader } from "@/features/assets/components/asset-uploader";
import { ProjectForm } from "@/features/projects/components/project-form";
import { ProjectMetadataEditor } from "@/features/projects/components/project-metadata-editor";
import { api, type Id, type Project } from "@/lib/convex";

type RecentProjectAsset = {
  _id: Id<"assets">;
  extension: string;
  name: string;
  previewUrl: string | null;
};

type FailedUploadTask = {
  _id: Id<"uploadTasks">;
  fileName: string;
  size: number;
  status: "failed" | "interrupted";
};

type CompletedUploadNotice = {
  count: number;
  isDismissing: boolean;
};

type UploadEntrySource = "page" | "project-card";

type ProjectWithAssetCount = Project & {
  assetCount: number;
  recentAssets: RecentProjectAsset[];
  uploadSummary: {
    failedCount: number;
    failedTasks: FailedUploadTask[];
    progress: number;
    uploadingCount: number;
  };
};

type ProjectCardProps = {
  draggingProjectId: Project["_id"] | null;
  dropTargetProjectId: Project["_id"] | null;
  language: "en" | "zh";
  onDragEnd: () => void;
  onDragStart: (projectId: Project["_id"]) => void;
  onDragTargetChange: (projectId: Project["_id"] | null) => void;
  onDrop: (sourceProjectId: Project["_id"], targetProjectId: Project["_id"]) => void;
  onOpenUpload: (projectId: Project["_id"]) => void;
  onRemoveUploadTask: (taskId: Id<"uploadTasks">) => void;
  project: ProjectWithAssetCount;
  completedUploadNotice?: CompletedUploadNotice;
};

function projectIdAtPoint(clientX: number, clientY: number): Project["_id"] | null {
  const card = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>("[data-project-id]");
  const projectId = card?.dataset.projectId;
  return projectId === undefined ? null : projectId as Project["_id"];
}

function createProjectDragPreview(project: ProjectWithAssetCount, description: string, assetCountLabel: string) {
  const preview = document.createElement("div");
  preview.setAttribute("aria-hidden", "true");
  preview.className = "pointer-events-none fixed left-0 top-0 z-[100] min-h-28 overflow-hidden rounded-2xl border border-white/[0.2] bg-[#102037] p-4 opacity-100 shadow-[0_24px_56px_rgba(0,0,0,0.38),inset_0_1px_0_rgb(255_255_255_/_0.09)] will-change-transform";

  const header = document.createElement("div");
  header.className = "flex items-start justify-between gap-3";
  const title = document.createElement("p");
  title.className = "min-w-0 flex-1 truncate text-sm font-semibold text-foreground";
  title.textContent = project.name;
  const assetCount = document.createElement("span");
  assetCount.className = "shrink-0 rounded-md border border-primary/25 bg-primary/[0.1] px-2 py-1 text-[11px] font-medium text-primary";
  assetCount.textContent = `${project.assetCount} ${assetCountLabel}`;
  header.append(title, assetCount);

  const previewDescription = document.createElement("p");
  previewDescription.className = "mt-3 line-clamp-2 text-sm leading-5 text-muted-foreground";
  previewDescription.textContent = description;
  preview.append(header, previewDescription);

  return preview;
}

function ProjectAssetPreview({ assetCount, assets, onUpload }: { assetCount: number; assets: RecentProjectAsset[]; onUpload: () => void }) {
  const { t } = useLanguage();

  if (assetCount === 0) {
    return (
      <button type="button" className="flex h-28 w-full items-center justify-center rounded-xl border border-dashed border-white/[0.12] bg-white/[0.018] text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/[0.045] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={onUpload}>
        <Upload className="mr-2 size-4" aria-hidden="true" />
        {t("uploadAssets")}
      </button>
    );
  }

  if (assets.length === 1) {
    return <div className="h-28 overflow-hidden rounded-xl" aria-label={t("recentAssets")}><ProjectAssetThumbnail asset={assets[0]} /></div>;
  }

  if (assets.length === 2) {
    return <div className="grid h-28 grid-cols-2 gap-1.5 overflow-hidden rounded-xl" aria-label={t("recentAssets")}>{assets.map((asset) => <ProjectAssetThumbnail key={asset._id} asset={asset} />)}</div>;
  }

  if (assets.length === 3) {
    return (
      <div className="grid h-28 grid-cols-[2fr_1fr] gap-1.5 overflow-hidden rounded-xl" aria-label={t("recentAssets")}>
        <ProjectAssetThumbnail asset={assets[0]} />
        <div className="grid min-h-0 grid-rows-2 gap-1.5">
          <ProjectAssetThumbnail asset={assets[1]} />
          <ProjectAssetThumbnail asset={assets[2]} />
        </div>
      </div>
    );
  }

  return <div className="grid h-28 grid-cols-4 gap-1.5 overflow-hidden rounded-xl" aria-label={t("recentAssets")}>{assets.map((asset) => <ProjectAssetThumbnail key={asset._id} asset={asset} />)}</div>;
}

function ProjectAssetThumbnail({ asset }: { asset: RecentProjectAsset }) {
  const [hasPreviewError, setHasPreviewError] = useState(false);
  const previewUrl = hasPreviewError ? null : asset.previewUrl;

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-white/[0.07] bg-[#0a1320]">
      {previewUrl !== null ? (
        // Convex storage URLs are user-scoped and short-lived, so this thumbnail intentionally bypasses Next's image optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img className="size-full object-cover" src={previewUrl} alt={asset.name} loading="lazy" onError={() => setHasPreviewError(true)} />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground">
          <File className="size-5 text-primary/75" aria-hidden="true" />
          <span className="max-w-full truncate px-2 text-[10px] font-medium uppercase">{asset.extension}</span>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ completedUploadNotice, draggingProjectId, dropTargetProjectId, language, onDragEnd, onDragStart, onDragTargetChange, onDrop, onOpenUpload, onRemoveUploadTask, project }: ProjectCardProps) {
  const createdAt = new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en", { dateStyle: "medium" }).format(project.createdAt);
  const { t } = useLanguage();
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const dragPreviewRef = useRef<HTMLDivElement | null>(null);
  const dragFrameRef = useRef<number | null>(null);
  const dragTargetRef = useRef<Project["_id"] | null>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const isDragging = draggingProjectId === project._id;
  const isDropTarget = dropTargetProjectId === project._id && !isDragging;
  const hasUploadingTasks = project.uploadSummary.uploadingCount > 0;
  const hasFailedTasks = project.uploadSummary.failedCount > 0;
  const uploadProgressLabel = t("uploadInProgress")
    .replace("{count}", String(project.uploadSummary.uploadingCount))
    .replace("{progress}", String(project.uploadSummary.progress));

  function clearDragPreview() {
    if (dragFrameRef.current !== null) cancelAnimationFrame(dragFrameRef.current);
    dragFrameRef.current = null;
    dragTargetRef.current = null;
    dragPreviewRef.current?.remove();
    dragPreviewRef.current = null;
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    const cardBounds = cardRef.current?.getBoundingClientRect();
    if (cardBounds === undefined) return;

    event.preventDefault();
    const preview = createProjectDragPreview(project, project.description || t("noDescription"), t("assetCount"));
    preview.style.width = `${cardBounds.width}px`;
    preview.style.transform = `translate3d(${cardBounds.left}px, ${cardBounds.top}px, 0)`;
    document.body.appendChild(preview);
    dragPreviewRef.current = preview;
    onDragStart(project._id);

    const dragHandle = event.currentTarget;
    const pointerId = event.pointerId;
    dragHandle.setPointerCapture(pointerId);
    const offsetX = event.clientX - cardBounds.left;
    const offsetY = event.clientY - cardBounds.top;
    let pendingPosition: { clientX: number; clientY: number } | null = null;
    const cleanupPointerDrag = () => {
      if (dragHandle.hasPointerCapture(pointerId)) dragHandle.releasePointerCapture(pointerId);
      window.removeEventListener("pointermove", updatePreview);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", cancelDrag);
      window.removeEventListener("keydown", handleKeyDown);
      dragCleanupRef.current = null;
    };
    const updatePreview = (pointerEvent: PointerEvent) => {
      pendingPosition = { clientX: pointerEvent.clientX, clientY: pointerEvent.clientY };
      if (dragFrameRef.current !== null) return;

      dragFrameRef.current = requestAnimationFrame(() => {
        dragFrameRef.current = null;
        if (pendingPosition === null) return;
        preview.style.transform = `translate3d(${pendingPosition.clientX - offsetX}px, ${pendingPosition.clientY - offsetY}px, 0)`;
        const targetProjectId = projectIdAtPoint(pendingPosition.clientX, pendingPosition.clientY);
        const nextTargetProjectId = targetProjectId === project._id ? null : targetProjectId;
        if (dragTargetRef.current === nextTargetProjectId) return;
        dragTargetRef.current = nextTargetProjectId;
        onDragTargetChange(nextTargetProjectId);
      });
    };
    const finishDrag = (pointerEvent: PointerEvent) => {
      cleanupPointerDrag();
      clearDragPreview();
      const targetProjectId = projectIdAtPoint(pointerEvent.clientX, pointerEvent.clientY);
      if (targetProjectId !== null && targetProjectId !== project._id) {
        onDrop(project._id, targetProjectId);
      } else {
        onDragEnd();
      }
    };
    const cancelDrag = () => {
      cleanupPointerDrag();
      clearDragPreview();
      onDragEnd();
    };
    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") cancelDrag();
    };

    window.addEventListener("pointermove", updatePreview);
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", cancelDrag);
    window.addEventListener("keydown", handleKeyDown);
    dragCleanupRef.current = cancelDrag;
  }

  useEffect(() => () => {
    dragCleanupRef.current?.();
    clearDragPreview();
  }, []);

  return (
    <div
      ref={cardRef}
      className="relative"
      data-project-id={project._id}
    >
      {isDropTarget ? <>
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 rounded-2xl border-2 border-dashed border-white shadow-[0_0_0_3px_rgb(255_255_255_/_0.12),0_0_28px_rgb(255_255_255_/_0.16)]" />
      </> : null}
    <Card
      className={`workspace-glass-surface group transition-[border-color,background-color,box-shadow] duration-200 hover:border-primary/35 hover:bg-[#0f1d30] hover:shadow-[0_14px_30px_rgba(8,15,30,0.18)] ${isDropTarget ? "bg-white/[0.055] shadow-[0_14px_30px_rgba(8,15,30,0.2)]" : ""}`}
    >
      <CardHeader className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <CardTitle className="min-w-0 flex-1 truncate">{project.name}</CardTitle>
            <ProjectMetadataEditor project={project} />
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/[0.07] px-2 py-1 text-xs font-medium text-primary" title={`${project.assetCount} ${t("assetCount")}`}>
              <Images className="size-3.5" aria-hidden="true" />
              {project.assetCount} {t("assetCount")}
            </span>
            <button
              type="button"
              className="-mr-1 -mt-1 inline-flex h-8 w-10 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground/65 transition-colors hover:bg-white/[0.07] hover:text-primary active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`${t("dragToReorderProject")}: ${project.name}`}
              title={t("dragToReorderProject")}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={handlePointerDown}
            >
              <GripVertical className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="min-h-10">
          <CardDescription className={hasUploadingTasks || hasFailedTasks ? "line-clamp-1" : "line-clamp-2"}>{project.description || t("noDescription")}</CardDescription>
          {hasUploadingTasks ? (
            <div className="mt-2 flex items-center gap-2" aria-label={uploadProgressLabel}>
              <Upload className="size-3 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0 shrink-0 text-[11px] font-medium text-primary">{uploadProgressLabel}</span>
              <span className="h-1 min-w-8 flex-1 overflow-hidden rounded-full bg-white/[0.09]" aria-hidden="true">
                <span className="block h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${project.uploadSummary.progress}%` }} />
              </span>
            </div>
          ) : null}
          {completedUploadNotice !== undefined ? (
            <p className={`mt-2 flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 transition-[opacity,transform] duration-300 motion-reduce:transition-none ${completedUploadNotice.isDismissing ? "-translate-y-1 opacity-0" : "translate-y-0 opacity-100"}`}>
              <Check className="size-3 shrink-0" aria-hidden="true" />
              {t("uploadCompleteCard").replace("{count}", String(completedUploadNotice.count))}
            </p>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-5 pb-4">
        <ProjectAssetPreview assets={project.recentAssets} assetCount={project.assetCount} onUpload={() => onOpenUpload(project._id)} />
        {hasFailedTasks ? (
          <div className="space-y-2 rounded-xl border border-destructive/25 bg-destructive/[0.055] p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
              <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
              {t("uploadsFailed").replace("{count}", String(project.uploadSummary.failedCount))}
            </p>
            {project.uploadSummary.failedTasks.map((task) => (
              <div key={task._id} className="flex items-center justify-between gap-3 rounded-lg bg-background/30 px-2.5 py-2">
                <span className="min-w-0 truncate text-xs text-muted-foreground">{task.fileName}</span>
                <span className="flex shrink-0 items-center gap-1">
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-primary hover:bg-primary/[0.1] hover:text-primary" onClick={() => onOpenUpload(project._id)}>
                    <RotateCcw className="size-3.5" aria-hidden="true" />
                    {t("retryUpload")}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => onRemoveUploadTask(task._id)}>
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    {t("deleteUploadTask")}
                  </Button>
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
      <CardContent className="flex items-center justify-between border-t border-white/[0.08] px-5 py-3.5">
        <span className="text-xs text-muted-foreground">{createdAt}</span>
        <span className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:bg-white/[0.07] hover:text-primary"
            onClick={(event) => { event.stopPropagation(); onOpenUpload(project._id); }}
          >
            <Upload className="size-3.5" aria-hidden="true" />
            {t("uploadAssets")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-primary outline outline-1 -outline-offset-1 outline-transparent hover:bg-primary/[0.1] hover:text-primary hover:outline-primary/35"
            onClick={(event) => { event.stopPropagation(); router.push(`/project/${project._id}`); }}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {t("openProject")}
          </Button>
          <DeleteProjectButton project={project} />
        </span>
      </CardContent>
    </Card>
    </div>
  );
}

function DeleteProjectButton({ project }: { project: Project }) {
  const { t } = useLanguage();
  const removeProject = useMutation(api.projects.remove);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await removeProject({ id: project._id });
      toast.add({ type: "error", title: t("projectDeletedNamed").replace("{name}", project.name) });
    } catch (deleteError) {
      toast.add({ type: "error", title: deleteError instanceof Error ? deleteError.message : t("couldNotDeleteProject"), priority: "high" });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <PopConfirm
      title={t("deleteProject")}
      description={t("deleteProjectConfirm")}
      confirmLabel={isDeleting ? t("deleting") : t("confirm")}
      cancelLabel={t("cancel")}
      disabled={isDeleting}
      onConfirm={handleDelete}
      trigger={<Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={isDeleting} aria-label={`${t("deleteProject")}: ${project.name}`}>{t("deleteProject")}</Button>}
    />
  );
}

function NewProjectCard({ onClick }: { onClick: () => void }) {
  const { t } = useLanguage();

  return (
    <button type="button" className="group flex min-h-44 w-full flex-col items-start justify-between rounded-xl border border-dashed border-primary/40 bg-primary/[0.05] p-6 text-left transition-colors hover:border-primary hover:bg-primary/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]" onClick={onClick}>
      <span className="flex size-10 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-2xl font-light text-primary" aria-hidden="true">+</span>
      <span>
        <span className="block text-lg font-semibold">{t("newProject")}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{t("newProjectCardDescription")}</span>
      </span>
    </button>
  );
}

type ProjectUploadDialogProps = {
  discardPendingSignal: number;
  isProjectSelectionFixed: boolean;
  isProjectSelectionLocked: boolean;
  onClose: () => void;
  onProjectChange: (projectId: Project["_id"]) => void;
  onTaskPresenceChange: (hasTasks: boolean) => void;
  onUploadCompleted: () => void;
  onUploadingChange: (isUploading: boolean) => void;
  open: boolean;
  projects: ProjectWithAssetCount[] | undefined;
  selectedProjectId: Project["_id"] | null;
};

type ProjectTargetSelectProps = {
  disabled: boolean;
  onProjectChange: (projectId: Project["_id"]) => void;
  projects: ProjectWithAssetCount[];
  selectedProjectId: Project["_id"] | null;
};

function ProjectTargetSelect({ disabled, onProjectChange, projects, selectedProjectId }: ProjectTargetSelectProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedProject = projects.find((project) => project._id === selectedProjectId);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsidePress = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsidePress);
    return () => document.removeEventListener("mousedown", closeOnOutsidePress);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        id="project-upload-target"
        type="button"
        className="flex h-11 w-full items-center justify-between rounded-lg border border-white/[0.14] bg-[#0a1627] px-4 text-left text-base text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition-colors hover:border-primary/45 hover:bg-[#0d1c30] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
        aria-controls="project-upload-target-options"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setIsOpen(false);
        }}
      >
        <span className="truncate">{selectedProject?.name ?? t("selectProject")}</span>
        {isOpen ? <ChevronDown className="size-4 shrink-0 text-primary" aria-hidden="true" /> : <ChevronUp className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
      </button>
      {isOpen ? (
        <div id="project-upload-target-options" role="listbox" aria-label={t("selectProject")} className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-lg border border-white/[0.14] bg-[#0d1b2e] p-1.5 shadow-[0_20px_42px_rgba(0,0,0,0.38)]">
          {projects.map((project) => {
            const isSelected = project._id === selectedProjectId;
            return (
              <button
                key={project._id}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`flex w-full items-center rounded-md px-3.5 py-3 text-left text-base transition-colors ${isSelected ? "bg-[#224b82] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" : "text-slate-100 hover:bg-[#173553] hover:text-white"}`}
                onClick={() => {
                  onProjectChange(project._id);
                  setIsOpen(false);
                }}
              >
                <span className="truncate">{project.name}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ProjectUploadDialog({ discardPendingSignal, isProjectSelectionFixed, isProjectSelectionLocked, onClose, onProjectChange, onTaskPresenceChange, onUploadCompleted, onUploadingChange, open, projects, selectedProjectId }: ProjectUploadDialogProps) {
  const { t } = useLanguage();
  const selectedProject = (projects ?? []).find((project) => project._id === selectedProjectId);
  const projectTargetControl = isProjectSelectionFixed ? (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-violet-400/25 bg-violet-500/[0.08] px-3.5 py-3 text-sm sm:max-w-md">
      <FolderOpen className="size-4 shrink-0 text-violet-200" aria-hidden="true" />
      <span className="shrink-0 font-semibold text-violet-100">{t("uploadToProject")}</span>
      <span className="h-4 w-px shrink-0 bg-violet-300/30" aria-hidden="true" />
      <span className="min-w-0 truncate font-semibold text-white">{selectedProject?.name ?? t("selectProject")}</span>
    </div>
  ) : (
    <label className="block w-full min-w-0 space-y-1.5 text-sm font-medium sm:max-w-md">
      <span>{t("selectProject")}</span>
      <ProjectTargetSelect
        disabled={projects === undefined || projects.length === 0 || isProjectSelectionLocked}
        projects={projects ?? []}
        selectedProjectId={selectedProjectId}
        onProjectChange={onProjectChange}
      />
    </label>
  );

  return (
    <Modal open={open} onClose={onClose} ariaLabel={t("uploadAssets")} closeLabel={t("close")} contentClassName="max-w-[46rem] sm:overflow-hidden" keepMounted>
      <Card className="w-full workspace-glass-surface border-white/[0.14] bg-[#0c1625]">
        <CardHeader className="pb-3 pr-14">
          <CardTitle className="text-xl">{t("uploadAssets")}</CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          {selectedProjectId !== null ? (
            <AssetUploader
              compact
              discardPendingSignal={discardPendingSignal}
              projectId={selectedProjectId}
              toolbarLeading={projectTargetControl}
              onUploadCompleted={onUploadCompleted}
              onUploadingChange={onUploadingChange}
              onTaskPresenceChange={onTaskPresenceChange}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-white/[0.12] bg-white/[0.018] px-5 py-10 text-center text-sm text-muted-foreground">
              {t("uploadRequiresProject")}
            </div>
          )}
        </CardContent>
      </Card>
    </Modal>
  );
}

function ProjectSkeleton() {
  return (
    <div className="workspace-glass-surface min-h-[13.875rem] animate-pulse rounded-xl border p-5" aria-hidden="true">
      <div className="flex items-start justify-between gap-4">
        <div className="h-5 w-28 rounded bg-white/[0.1]" />
        <div className="h-6 w-20 rounded-md bg-primary/[0.12]" />
      </div>
      <div className="mt-4 h-4 w-2/3 rounded bg-white/[0.06]" />
      <div className="mt-5 h-28 rounded-xl border border-white/[0.06] bg-white/[0.025]" />
      <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
        <div className="h-3 w-20 rounded bg-white/[0.06]" />
        <div className="h-7 w-36 rounded-md bg-white/[0.06]" />
      </div>
    </div>
  );
}

export function ProjectsDashboard({ initialCreateOpen = false }: { initialCreateOpen?: boolean }) {
  const { language, t } = useLanguage();
  const projects = useQuery(api.projects.list);
  const reorderProjects = useMutation(api.projects.reorder);
  const removeUploadTask = useMutation(api.uploadTasks.remove);
  const recoverInterruptedUploads = useMutation(api.uploadTasks.recoverInterrupted);
  const [isCreateOpen, setIsCreateOpen] = useState(initialCreateOpen);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedUploadProjectId, setSelectedUploadProjectId] = useState<Project["_id"] | null>(null);
  const [uploadEntrySource, setUploadEntrySource] = useState<UploadEntrySource>("page");
  const [discardPendingSignal, setDiscardPendingSignal] = useState(0);
  const [isUploadInProgress, setIsUploadInProgress] = useState(false);
  const [hasUploadTasks, setHasUploadTasks] = useState(false);
  const [completedUploads, setCompletedUploads] = useState<Record<string, CompletedUploadNotice>>({});
  const [draggingProjectId, setDraggingProjectId] = useState<Project["_id"] | null>(null);
  const [dropTargetProjectId, setDropTargetProjectId] = useState<Project["_id"] | null>(null);
  const completionTimersRef = useRef<Map<string, { dismiss: number; remove: number }>>(new Map());
  const router = useRouter();

  useEffect(() => {
    if (!initialCreateOpen) return;

    router.replace("/dashboard/projects", { scroll: false });
  }, [initialCreateOpen, router]);

  useEffect(() => {
    if (!isUploadInProgress) return;

    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeLeave);
    return () => window.removeEventListener("beforeunload", warnBeforeLeave);
  }, [isUploadInProgress]);

  useEffect(() => {
    if (projects === undefined) return;

    const recoverStaleTasks = () => {
      for (const project of projects) {
        void recoverInterruptedUploads({ projectId: project._id });
      }
    };

    recoverStaleTasks();
    const timer = window.setTimeout(recoverStaleTasks, 13_000);
    return () => window.clearTimeout(timer);
  }, [projects, recoverInterruptedUploads]);

  useEffect(() => () => {
    for (const timers of completionTimersRef.current.values()) {
      window.clearTimeout(timers.dismiss);
      window.clearTimeout(timers.remove);
    }
  }, []);

  function openUpload(projectId?: Project["_id"]) {
    if (projects === undefined || projects.length === 0) {
      toast.add({ type: "info", title: t("uploadRequiresProject") });
      return;
    }

    const nextProjectId = projectId ?? selectedUploadProjectId ?? projects[0]._id;
    if (hasUploadTasks && selectedUploadProjectId !== null && nextProjectId !== selectedUploadProjectId) {
      toast.add({ type: "info", title: t("uploadsInProgress") });
      setIsUploadOpen(true);
      return;
    }

    setUploadEntrySource(projectId === undefined ? "page" : "project-card");
    setSelectedUploadProjectId(nextProjectId);
    setIsUploadOpen(true);
  }

  function closeUpload() {
    setIsUploadOpen(false);
    setDiscardPendingSignal((current) => current + 1);
  }

  function handleUploadCompleted() {
    if (selectedUploadProjectId === null) return;

    const projectId = selectedUploadProjectId;
    const existingTimers = completionTimersRef.current.get(projectId);
    if (existingTimers !== undefined) {
      window.clearTimeout(existingTimers.dismiss);
      window.clearTimeout(existingTimers.remove);
    }

    setCompletedUploads((current) => ({
      ...current,
      [projectId]: {
        count: (current[projectId]?.count ?? 0) + 1,
        isDismissing: false,
      },
    }));

    const dismiss = window.setTimeout(() => {
      setCompletedUploads((current) => current[projectId] === undefined ? current : {
        ...current,
        [projectId]: { ...current[projectId], isDismissing: true },
      });
    }, 3_700);
    const remove = window.setTimeout(() => {
      setCompletedUploads((current) => {
        const remaining = { ...current };
        delete remaining[projectId];
        return remaining;
      });
      completionTimersRef.current.delete(projectId);
    }, 4_100);

    completionTimersRef.current.set(projectId, { dismiss, remove });
  }

  function handleRemoveUploadTask(taskId: Id<"uploadTasks">) {
    void removeUploadTask({ id: taskId }).catch(() => {
      toast.add({ type: "error", title: t("couldNotRemoveUpload") });
    });
  }

  function handleDragStart(projectId: Project["_id"]) {
    setDraggingProjectId(projectId);
  }

  function handleDragEnd() {
    setDraggingProjectId(null);
    setDropTargetProjectId(null);
  }

  function handleDragTargetChange(projectId: Project["_id"] | null) {
    setDropTargetProjectId((currentProjectId) => currentProjectId === projectId ? currentProjectId : projectId);
  }

  async function handleDrop(sourceProjectId: Project["_id"], targetProjectId: Project["_id"]) {
    setDraggingProjectId(null);
    setDropTargetProjectId(null);

    if (projects === undefined || sourceProjectId === targetProjectId) return;

    const sourceIndex = projects.findIndex((project) => project._id === sourceProjectId);
    const targetIndex = projects.findIndex((project) => project._id === targetProjectId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const reorderedProjects = [...projects];
    [reorderedProjects[sourceIndex], reorderedProjects[targetIndex]] = [reorderedProjects[targetIndex], reorderedProjects[sourceIndex]];

    try {
      await reorderProjects({ projectIds: reorderedProjects.map((project) => project._id) });
    } catch {
      toast.add({ type: "error", title: t("couldNotReorderProjects"), priority: "high" });
    }
  }

  return (
    <section className="-mx-4 -my-7 flex h-[calc(100dvh-3.5rem)] flex-col px-4 py-7 sm:-mx-6 sm:px-6 lg:-mx-8 lg:-my-8 lg:px-8 lg:py-8 xl:-mx-10 xl:px-10" aria-labelledby="projects-page-title">
      <div className="shrink-0 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 id="projects-page-title" className="text-3xl font-semibold tracking-tight">{t("projectManagement")}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{t("projectsDescription")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="border border-blue-500/80 bg-blue-700 text-white shadow-[0_6px_18px_rgba(37,99,235,0.25)] hover:bg-blue-800 hover:text-white" onClick={() => setIsCreateOpen(true)}>
            <span aria-hidden="true" className="text-base leading-none">+</span>
            {t("newProject")}
          </Button>
          <Button type="button" className="bg-green-700 text-white shadow-[0_6px_18px_rgba(21,128,61,0.22)] hover:bg-green-800 hover:text-white" onClick={() => openUpload()} disabled={projects === undefined || projects.length === 0}>
            <Upload className="size-4" aria-hidden="true" />
            {t("uploadAssets")}
          </Button>
        </div>
      </div>

      <div className="mt-8 min-h-0 flex-1">
      {projects === undefined ? (
        <div className="flex h-full min-h-0 flex-col" aria-busy="true">
          <p className="sr-only" role="status">{t("loadingWorkspace")}</p>
          <div className="h-4 w-16 animate-pulse rounded bg-white/[0.07]" aria-hidden="true" />
          <div className="workspace-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2 [scrollbar-gutter:stable]">
            <div className="grid gap-5 py-4 md:grid-cols-2">
              <ProjectSkeleton />
              <ProjectSkeleton />
              <ProjectSkeleton />
              <ProjectSkeleton />
            </div>
          </div>
        </div>
      ) : projects.length === 0 ? (
        <div className="grid gap-5 md:grid-cols-2">
          <NewProjectCard onClick={() => setIsCreateOpen(true)} />
        </div>
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          <p className="shrink-0 text-sm text-muted-foreground" aria-live="polite">{projects.length} {projects.length === 1 ? t("project") : t("projectsPlural")}</p>
          <div className="workspace-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2 [scrollbar-gutter:stable]">
          <div className="grid gap-5 py-4 md:grid-cols-2">
            <NewProjectCard onClick={() => setIsCreateOpen(true)} />
            {projects.map((project) => (
              <ProjectCard
                key={project._id}
                project={project}
                language={language}
                draggingProjectId={draggingProjectId}
                dropTargetProjectId={dropTargetProjectId}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragTargetChange={handleDragTargetChange}
                onDrop={handleDrop}
                onOpenUpload={openUpload}
                onRemoveUploadTask={handleRemoveUploadTask}
                completedUploadNotice={completedUploads[project._id]}
              />
            ))}
          </div>
          </div>
        </div>
      )}
      </div>

      <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} ariaLabel={t("newProject")} closeLabel={t("close")}>
        <ProjectForm onCreated={() => setIsCreateOpen(false)} />
      </Modal>
      <ProjectUploadDialog
        open={isUploadOpen}
        onClose={closeUpload}
        projects={projects}
        selectedProjectId={selectedUploadProjectId}
        onProjectChange={(projectId) => setSelectedUploadProjectId(projectId)}
        discardPendingSignal={discardPendingSignal}
        isProjectSelectionFixed={uploadEntrySource === "project-card"}
        isProjectSelectionLocked={hasUploadTasks}
        onUploadingChange={setIsUploadInProgress}
        onTaskPresenceChange={setHasUploadTasks}
        onUploadCompleted={handleUploadCompleted}
      />
    </section>
  );
}
