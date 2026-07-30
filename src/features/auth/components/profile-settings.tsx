"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Camera, Check, Mail, Trash2, UserRound } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { ProfileAvatar } from "@/features/auth/components/profile-avatar";
import { api, type Id } from "@/lib/convex";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const AVATAR_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type UploadResponse = { storageId: string };
type CurrentUser = {
  email?: string | null;
  image?: string | null;
  name?: string | null;
  subject: string;
};

function isUploadResponse(value: unknown): value is UploadResponse {
  return typeof value === "object" && value !== null && "storageId" in value && typeof value.storageId === "string";
}

function ProfileSkeleton() {
  return <div className="h-96 animate-pulse rounded-2xl border border-white/[0.08] bg-white/[0.04]" aria-hidden="true" />;
}

export function ProfileSettings() {
  const identity = useQuery(api.users.current);

  if (identity === undefined) return <ProfileSkeleton />;
  if (identity === null) return null;

  return <ProfileSettingsForm key={identity.subject} identity={identity} />;
}

function ProfileSettingsForm({ identity }: { identity: CurrentUser }) {
  const { language, setLanguage, t } = useLanguage();
  const generateAvatarUploadUrl = useMutation(api.users.generateAvatarUploadUrl);
  const updateProfile = useMutation(api.users.updateProfile);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(identity.name ?? "");
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => () => {
    if (avatarPreviewUrl !== null) URL.revokeObjectURL(avatarPreviewUrl);
  }, [avatarPreviewUrl]);

  const currentAvatar = avatarPreviewUrl ?? (removeAvatar ? null : identity.image ?? null);
  const hasPendingChanges = displayName.trim() !== (identity.name ?? "").trim() || selectedAvatar !== null || removeAvatar;

  function resetForm() {
    setDisplayName(identity.name ?? "");
    setSelectedAvatar(null);
    setRemoveAvatar(false);
    setError(null);
    if (fileInputRef.current !== null) fileInputRef.current.value = "";
  }

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const [file] = Array.from(event.target.files ?? []);
    if (file === undefined) return;

    if (!AVATAR_MIME_TYPES.has(file.type)) {
      setError(t("avatarFormatError"));
      event.target.value = "";
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setError(t("avatarSizeError"));
      event.target.value = "";
      return;
    }

    setError(null);
    setSelectedAvatar(file);
    setRemoveAvatar(false);
    setAvatarPreviewUrl((previousUrl) => {
      if (previousUrl !== null) URL.revokeObjectURL(previousUrl);
      return URL.createObjectURL(file);
    });
  }

  function handleRemoveAvatar() {
    setAvatarPreviewUrl((previousUrl) => {
      if (previousUrl !== null) URL.revokeObjectURL(previousUrl);
      return null;
    });
    setSelectedAvatar(null);
    setRemoveAvatar(true);
    if (fileInputRef.current !== null) fileInputRef.current.value = "";
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextDisplayName = displayName.trim();
    if (nextDisplayName.length < 2) {
      setError(t("displayNameMin"));
      return;
    }
    if (nextDisplayName.length > 80) {
      setError(t("displayNameMax"));
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      let avatarStorageId: Id<"_storage"> | undefined;
      if (selectedAvatar !== null) {
        const uploadUrl = await generateAvatarUploadUrl({ mimeType: selectedAvatar.type, size: selectedAvatar.size });
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": selectedAvatar.type },
          body: selectedAvatar,
        });
        if (!uploadResponse.ok) throw new Error(t("avatarUploadError"));
        const payload: unknown = await uploadResponse.json();
        if (!isUploadResponse(payload)) throw new Error(t("avatarUploadError"));
        avatarStorageId = payload.storageId as Id<"_storage">;
      }

      await updateProfile({ displayName: nextDisplayName, avatarStorageId, removeAvatar });
      setSelectedAvatar(null);
      setRemoveAvatar(false);
      setAvatarPreviewUrl((previousUrl) => {
        if (previousUrl !== null) URL.revokeObjectURL(previousUrl);
        return null;
      });
      toast.add({ type: "success", title: t("profileSaved") });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("couldNotSaveProfile"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="max-w-3xl space-y-6" aria-labelledby="profile-page-title">
      <header>
        <h1 id="profile-page-title" className="text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">{t("personalCenter")}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">{t("personalCenterDescription")}</p>
      </header>

      <GlassPanel variant="card" className="p-5 sm:p-6">
        <form className="space-y-7" onSubmit={(event) => void handleSubmit(event)}>
          <div className="flex flex-col gap-5 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <ProfileAvatar image={currentAvatar} name={displayName || identity.email} className="size-20 text-2xl" />
              <div>
                <h2 className="text-lg font-semibold tracking-[-0.03em]">{t("profilePhoto")}</h2>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">{t("profilePhotoHelp")}</p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={t("changePhoto")} onChange={handleAvatarChange} />
              <Button type="button" size="sm" variant="outline" className="border-white/[0.15] bg-white/[0.05] hover:bg-white/[0.1]" onClick={() => fileInputRef.current?.click()} disabled={isSaving}>
                <Camera className="size-4" aria-hidden="true" />
                {t("changePhoto")}
              </Button>
              {currentAvatar !== null ? (
                <Button type="button" size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleRemoveAvatar} disabled={isSaving}>
                  <Trash2 className="size-4" aria-hidden="true" />
                  {t("remove")}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium" htmlFor="profile-display-name">
              <span className="flex h-5 items-center">{t("displayNameLabel")}</span>
              <Input id="profile-display-name" value={displayName} maxLength={80} disabled={isSaving} onChange={(event) => setDisplayName(event.target.value)} />
              <span className="block text-xs font-normal leading-5 text-muted-foreground">{t("displayNameHelp")}</span>
            </label>
            <div className="space-y-2 text-sm font-medium">
              <span className="flex items-center gap-2"><Mail className="size-4 text-muted-foreground" aria-hidden="true" />{t("email")}</span>
              <div className="flex h-10 cursor-not-allowed items-center rounded-md border border-white/[0.1] bg-white/[0.035] px-3 text-sm text-muted-foreground transition-colors hover:border-white/[0.16] hover:bg-white/[0.05]" aria-disabled="true">{identity.email ?? "—"}</div>
            </div>
          </div>

          {error !== null ? <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive" role="alert">{error}</p> : null}

          <div className="flex flex-col-reverse gap-2 border-t border-white/[0.08] pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" className="bg-white/[0.06] hover:bg-white/[0.11]" onClick={resetForm} disabled={isSaving || !hasPendingChanges}>{t("discardChanges")}</Button>
            <Button type="submit" className="workspace-primary-action" disabled={isSaving || !hasPendingChanges}>
              <Check className="size-4" aria-hidden="true" />
              {isSaving ? t("saving") : t("saveChanges")}
            </Button>
          </div>
        </form>
      </GlassPanel>

      <GlassPanel variant="subtle" className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/[0.09] text-primary" aria-hidden="true"><UserRound className="size-[18px]" strokeWidth={1.7} /></span>
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.03em]">{t("preferences")}</h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">{t("languagePreferenceDescription")}</p>
            <div className="mt-4 flex gap-2" role="group" aria-label={t("languagePreference")}>
              <Button type="button" size="sm" variant={language === "zh" ? "default" : "outline"} className={language === "zh" ? "workspace-primary-action" : "border-white/[0.15] bg-white/[0.04]"} onClick={() => setLanguage("zh")} aria-pressed={language === "zh"}>中文</Button>
              <Button type="button" size="sm" variant={language === "en" ? "default" : "outline"} className={language === "en" ? "workspace-primary-action" : "border-white/[0.15] bg-white/[0.04]"} onClick={() => setLanguage("en")} aria-pressed={language === "en"}>EN</Button>
            </div>
          </div>
        </div>
      </GlassPanel>
    </section>
  );
}
