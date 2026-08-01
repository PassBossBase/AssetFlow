"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover } from "@/components/ui/popover";
import { toast } from "@/components/ui/toast";
import { useLanguage } from "@/components/language-provider";
import { projectSchema } from "@/features/projects/lib/validation";
import { api, type Project } from "@/lib/convex";

type ProjectMetadataEditorProps = {
  project: Project;
  triggerClassName?: string;
};

export function ProjectMetadataEditor({ project, triggerClassName = "" }: ProjectMetadataEditorProps) {
  const { t } = useLanguage();
  const updateProject = useMutation(api.projects.update);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const hasChanges = name !== project.name || description !== project.description;

  function resetEditor() {
    setName(project.name);
    setDescription(project.description);
    setError(null);
  }

  function handleOpenChange(open: boolean) {
    if (!open && !isSaving) resetEditor();
    setIsOpen(open);
  }

  function closeEditor() {
    if (isSaving) return;
    resetEditor();
    setIsOpen(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const validation = projectSchema.safeParse({ name, description });
    if (!validation.success) {
      const field = validation.error.issues[0]?.path[0];
      setError(field === "name" ? (name.trim().length < 2 ? t("projectNameMin") : t("projectNameMax")) : t("projectDescriptionMax"));
      return;
    }

    if (validation.data.name === project.name && validation.data.description === project.description) {
      closeEditor();
      return;
    }

    setIsSaving(true);
    try {
      await updateProject({ id: project._id, ...validation.data });
      toast.add({ type: "success", title: t("changesSaved") });
      setIsOpen(false);
    } catch (projectError) {
      setError(projectError instanceof Error ? projectError.message : t("couldNotSaveProject"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Popover
      ariaLabel={t("projectDetails")}
      open={isOpen}
      onOpenChange={handleOpenChange}
      popupWidth={400}
      popupHeight={440}
      popupClassName="w-[calc(100vw-2rem)] p-5 sm:w-[25rem]"
      trigger={(
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`size-8 shrink-0 p-0 text-muted-foreground hover:bg-white/[0.07] hover:text-primary ${triggerClassName}`}
          aria-label={`${t("projectDetails")}: ${project.name}`}
          title={t("projectDetails")}
        >
          <Pencil className="size-3.5" aria-hidden="true" />
        </Button>
      )}
      content={(
        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <div>
            <p className="text-base font-semibold text-foreground">{t("projectDetails")}</p>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">{t("projectDetailsDescription")}</p>
          </div>
          <label className="block space-y-2 text-sm font-medium" htmlFor={`project-name-${project._id}`}>
            <span className="flex items-center justify-between gap-3">
              <span>{t("projectName")}</span>
              <span className="text-xs font-normal text-muted-foreground">{t("projectNameHelp")}</span>
            </span>
            <Input
              id={`project-name-${project._id}`}
              className="h-10 border-white/[0.14] bg-[#08131f]/80 px-3 text-sm"
              value={name}
              maxLength={80}
              autoFocus
              disabled={isSaving}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="block space-y-2 text-sm font-medium" htmlFor={`project-description-${project._id}`}>
            <span className="flex items-center justify-between gap-3">
              <span>{t("projectDescription")}</span>
              <span className="text-xs font-normal text-muted-foreground">{description.length}/500</span>
            </span>
            <textarea
              id={`project-description-${project._id}`}
              className="form-control min-h-24 w-full resize-y rounded-md border border-white/[0.14] bg-[#08131f]/80 px-3 py-2.5 text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary/65 focus-visible:ring-2 focus-visible:ring-ring"
              value={description}
              maxLength={500}
              disabled={isSaving}
              onChange={(event) => setDescription(event.target.value)}
            />
            <span className="block text-xs font-normal text-muted-foreground">{t("projectDescriptionHelp")}</span>
          </label>
          {error !== null ? <p className="rounded-md border border-destructive/35 bg-destructive/[0.1] px-3 py-2 text-sm text-destructive" role="alert">{error}</p> : null}
          <div className="flex justify-end gap-2 border-t border-white/[0.1] pt-4">
            <Button type="button" variant="ghost" size="sm" className="border border-white/70 bg-transparent text-white hover:bg-white/[0.1] hover:text-white" disabled={isSaving} onClick={closeEditor}>{t("cancel")}</Button>
            <Button type="submit" size="sm" className="border border-blue-400/70 bg-blue-700 text-white shadow-[0_6px_16px_rgb(37_99_235_/_0.2)] hover:bg-blue-800 hover:text-white" disabled={isSaving || !hasChanges} aria-busy={isSaving}>{isSaving ? t("saving") : t("confirm")}</Button>
          </div>
        </form>
      )}
    />
  );
}
