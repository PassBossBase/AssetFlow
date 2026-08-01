"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, FolderOpen, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/components/language-provider";
import { toast } from "@/components/ui/toast";
import { PopConfirm } from "@/components/ui/popconfirm";
import { api, type Id, type Project } from "@/lib/convex";
import { ProjectAssetsPanel } from "@/features/assets/components/project-assets-panel";
import { ProjectMetadataEditor } from "@/features/projects/components/project-metadata-editor";

const backToProjectsButtonClassName = "border border-violet-500/80 bg-violet-700 text-white hover:bg-violet-800 hover:text-white";

function ProjectSettings({ id, project }: { id: Id<"projects">; project: Project }) {
  const { t } = useLanguage();
  const router = useRouter();
  const removeProject = useMutation(api.projects.remove);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4 rounded-xl border border-white/[0.1] bg-white/[0.025] p-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{project.name}</p>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{project.description || t("noDescription")}</p>
            </div>
            <ProjectMetadataEditor project={project} />
          </div>
          {error !== null ? <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p> : null}
          <div className="flex border-t border-white/[0.08] pt-5">
            <PopConfirm
              title={t("deleteProject")}
              description={t("deleteProjectConfirm")}
              confirmLabel={isDeleting ? t("deleting") : t("confirm")}
              cancelLabel={t("cancel")}
              disabled={isDeleting}
              onConfirm={handleDelete}
              trigger={<Button type="button" variant="destructive" disabled={isDeleting} aria-busy={isDeleting}>{isDeleting ? t("deleting") : t("deleteProject")}</Button>}
            />
          </div>
        </div>
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
    return (
      <main className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-6" aria-live="polite">
        <p className="text-sm text-muted-foreground" role="status">{t("loadingProject")}</p>
      </main>
    );
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
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="min-w-0 truncate text-3xl font-semibold tracking-[-0.035em] text-primary sm:text-4xl">{project.name}</h1>
              <ProjectMetadataEditor project={project} triggerClassName="size-9" />
            </div>
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
        {activeTab === "settings" ? <ProjectSettings key={project._id} id={projectId} project={project} /> : null}
      </div>
    </section>
  );
}
