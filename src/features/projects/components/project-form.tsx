"use client";

import { useState } from "react";
import { useMutation } from "convex/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/language-provider";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/convex";
import { projectSchema } from "@/features/projects/lib/validation";

type ProjectFormProps = {
  onCreated?: () => void;
};

export function ProjectForm({ onCreated }: ProjectFormProps) {
  const { t } = useLanguage();
  const createProject = useMutation(api.projects.create);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const validation = projectSchema.safeParse({ name, description });
    if (!validation.success) {
      const field = validation.error.issues[0]?.path[0];
      setError(field === "name" ? (name.trim().length < 2 ? t("projectNameMin") : t("projectNameMax")) : t("projectDescriptionMax"));
      return;
    }

    setIsSubmitting(true);

    try {
      await createProject(validation.data);
      setName("");
      setDescription("");
      toast.add({ type: "success", title: t("projectCreated") });
      onCreated?.();
    } catch (projectError) {
      setError(projectError instanceof Error ? projectError.message : t("couldNotCreateProject"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="workspace-glass-surface w-full border-white/[0.12] bg-[#0c1625] shadow-[0_24px_72px_rgba(0,0,0,0.38)]">
      <CardHeader className="px-7 pb-2 pt-7">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle className="text-xl tracking-[-0.02em]">{t("newProject")}</CardTitle>
            <CardDescription className="max-w-md leading-6">{t("newProjectDescription")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-7 pb-7 pt-4">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block space-y-2 text-sm font-medium" htmlFor="project-name">
            {t("projectName")}
            <Input id="project-name" value={name} onChange={(event) => setName(event.target.value)} placeholder={t("projectNamePlaceholder")} maxLength={80} required aria-describedby="project-name-help" />
            <span id="project-name-help" className="block text-xs font-normal text-muted-foreground">{t("projectNameHelp")}</span>
          </label>
          <label className="block space-y-2 text-sm font-medium" htmlFor="project-description">
            {t("projectDescription")}
            <textarea
              id="project-description"
              className="form-control flex min-h-24 w-full resize-y rounded-md border px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("projectDescriptionPlaceholder")}
              maxLength={500}
              aria-describedby="project-description-help"
            />
            <span id="project-description-help" className="flex justify-between text-xs font-normal text-muted-foreground"><span>{t("projectDescriptionHelp")}</span><span>{description.length}/500</span></span>
          </label>
          {error !== null ? <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p> : null}
          <div className="border-t border-white/[0.08] pt-5">
            <Button type="submit" className="h-11 w-full border border-blue-500/80 bg-blue-700 text-white shadow-[0_6px_18px_rgba(37,99,235,0.25)] hover:bg-blue-800 hover:text-white" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? t("creating") : t("create")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
