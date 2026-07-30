"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, FolderOpen, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/language-provider";
import { toast } from "@/components/ui/toast";
import { PopConfirm } from "@/components/ui/popconfirm";
import { api, type Id, type Project } from "@/lib/convex";
import { projectSchema } from "@/features/projects/lib/validation";
import { ProjectAssetsPanel } from "@/features/assets/components/project-assets-panel";

const backToProjectsButtonClassName = "bg-[#38d9f5] text-[#06141b] shadow-[0_8px_22px_rgb(56_217_245_/_0.18)] hover:bg-[#66e4fa] hover:text-[#06141b]";

function ProjectEditor({ id, project }: { id: Id<"projects">; project: Project }) {
  const { t } = useLanguage();
  const router = useRouter();
  const updateProject = useMutation(api.projects.update);
  const removeProject = useMutation(api.projects.remove);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const hasChanges = name !== project.name || description !== project.description;

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const validation = projectSchema.safeParse({ name, description });
    if (!validation.success) {
      const field = validation.error.issues[0]?.path[0];
      setError(field === "name" ? (name.trim().length < 2 ? t("projectNameMin") : t("projectNameMax")) : t("projectDescriptionMax"));
      return;
    }

    setIsSaving(true);

    try {
      await updateProject({ id, ...validation.data });
      setName(validation.data.name);
      setDescription(validation.data.description);
      toast.add({ type: "success", title: t("changesSaved") });
    } catch (projectError) {
      setError(projectError instanceof Error ? projectError.message : t("couldNotSaveProject"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setError(null);
    setIsDeleting(true);
    try {
      await removeProject({ id });
      toast.add({ type: "error", title: t("projectDeletedNamed").replace("{name}", project.name) });
      router.push("/dashboard");
    } catch (projectError) {
      setError(projectError instanceof Error ? projectError.message : t("couldNotDeleteProject"));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Card className="workspace-glass-surface overflow-hidden">
      <CardHeader className="border-b border-white/[0.08] pb-5">
        <CardTitle>{t("projectDetails")}</CardTitle>
        <CardDescription>{t("projectDetailsDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form className="space-y-6" onSubmit={handleSave}>
          <div className="grid gap-6">
            <label className="block space-y-2.5 text-sm font-medium" htmlFor="project-detail-name">
              <span className="flex items-center justify-between gap-3"><span>{t("projectName")}</span><span id="project-detail-name-help" className="text-xs font-normal text-muted-foreground">{t("projectNameHelp")}</span></span>
              <Input id="project-detail-name" className="h-11 border-white/[0.12] bg-[#08131f]/75 px-3.5 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.025)] focus-visible:border-primary/65" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required aria-describedby="project-detail-name-help" />
            </label>
            <label className="block space-y-2.5 text-sm font-medium" htmlFor="project-detail-description">
              <span className="flex items-center justify-between gap-3"><span>{t("projectDescription")}</span><span id="project-detail-description-help" className="text-xs font-normal text-muted-foreground">{description.length}/500</span></span>
              <textarea
                id="project-detail-description"
                className="form-control flex min-h-28 w-full resize-y rounded-md border border-white/[0.12] bg-[#08131f]/75 px-3.5 py-3 text-sm leading-6 outline-none placeholder:text-muted-foreground shadow-[inset_0_1px_0_rgb(255_255_255_/_0.025)] focus-visible:border-primary/65 focus-visible:ring-2 focus-visible:ring-ring"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={500}
                aria-describedby="project-detail-description-help"
              />
              <span className="block text-xs font-normal text-muted-foreground">{t("projectDescriptionHelp")}</span>
            </label>
          </div>
          {error !== null ? <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p> : null}
          <div className="flex flex-col-reverse gap-3 border-t border-white/[0.08] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <PopConfirm
              title={t("deleteProject")}
              description={t("deleteProjectConfirm")}
              confirmLabel={isDeleting ? t("deleting") : t("confirm")}
              cancelLabel={t("cancel")}
              disabled={isSaving || isDeleting}
              onConfirm={handleDelete}
              trigger={<Button type="button" variant="destructive" disabled={isSaving || isDeleting} aria-busy={isDeleting}>{isDeleting ? t("deleting") : t("deleteProject")}</Button>}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" disabled={isSaving || isDeleting} onClick={() => { setName(project.name); setDescription(project.description); setError(null); }}>{t("discardChanges")}</Button>
              <Button type="submit" disabled={isSaving || isDeleting || !hasChanges} aria-busy={isSaving}>{isSaving ? t("saving") : t("saveChanges")}</Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function ProjectDetail({ id }: { id: string }) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"assets" | "settings">("assets");
  const projectId = id as Id<"projects">;
  const project = useQuery(api.projects.get, id === "test" ? "skip" : { id: projectId });

  if (id === "test") {
    return (
      <section className="mx-auto max-w-3xl space-y-6 px-6 py-12">
        <div>
          <p className="text-sm font-medium text-primary">{t("projectRoute")}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{t("projectTest")}</h1>
        </div>
        <Card className="workspace-glass-surface">
          <CardHeader>
            <CardTitle>{t("projectDetailReady")}</CardTitle>
            <CardDescription>{t("createRealProject")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className={backToProjectsButtonClassName}>
              <Link href="/dashboard/projects"><ArrowLeft className="size-4" aria-hidden="true" />{t("backToProjects")}</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (project === undefined) {
    return <main className="mx-auto max-w-3xl px-6 py-12 text-sm text-muted-foreground">{t("loadingProject")}</main>;
  }

  if (project === null) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">{t("projectNotFound")}</h1>
        <Button asChild className={backToProjectsButtonClassName}>
          <Link href="/dashboard/projects"><ArrowLeft className="size-4" aria-hidden="true" />{t("backToProjects")}</Link>
        </Button>
      </main>
    );
  }

  return (
    <section className="mx-auto w-full max-w-[96rem] px-4 py-7 sm:px-6 sm:py-8 lg:px-10 lg:py-10 xl:px-12">
      <header className="border-b border-white/[0.1] pb-0">
        <div className="flex flex-col gap-5 pb-7 sm:flex-row sm:items-center sm:gap-6">
          <Button asChild className={`w-fit shrink-0 ${backToProjectsButtonClassName}`}>
            <Link href="/dashboard/projects"><ArrowLeft className="size-4" aria-hidden="true" />{t("backToProjects")}</Link>
          </Button>
          <div className="min-w-0 sm:border-l sm:border-white/[0.1] sm:pl-6">
            <h1 className="truncate text-3xl font-semibold tracking-[-0.035em] text-primary sm:text-4xl">{project.name}</h1>
            <p className="mt-2 line-clamp-1 max-w-3xl text-base leading-6 text-muted-foreground">{project.description || t("noDescription")}</p>
          </div>
        </div>
        <div className="flex gap-8" role="tablist" aria-label={t("projectWorkspace")}>
          <button type="button" role="tab" aria-selected={activeTab === "assets"} className={`flex items-center gap-2 border-b-2 py-3 text-base font-medium transition-colors ${activeTab === "assets" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`} onClick={() => setActiveTab("assets")}><FolderOpen className="size-4" aria-hidden="true" />{t("assets")}</button>
          <button type="button" role="tab" aria-selected={activeTab === "settings"} className={`flex items-center gap-2 border-b-2 py-3 text-base font-medium transition-colors ${activeTab === "settings" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`} onClick={() => setActiveTab("settings")}><Settings2 className="size-4" aria-hidden="true" />{t("settings")}</button>
        </div>
      </header>
      <div className="pt-7 sm:pt-8">
        <div hidden={activeTab !== "assets"}>
          <ProjectAssetsPanel projectId={projectId} />
        </div>
        {activeTab === "settings" ? <ProjectEditor key={project._id} id={projectId} project={project} /> : null}
      </div>
    </section>
  );
}
