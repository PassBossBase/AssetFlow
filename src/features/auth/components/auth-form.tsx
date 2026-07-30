"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { Eye, EyeOff, Mail, UserRound } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/language-provider";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type AuthMode = "signIn" | "signUp";
const legacyRememberedCredentialsKey = "assetflow:remembered-credentials";

export function AuthForm({ nextPath = "/dashboard" }: { nextPath?: string }) {
  const { t } = useLanguage();
  const router = useRouter();
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);

  useEffect(() => {
    window.localStorage.removeItem(legacyRememberedCredentialsKey);
  }, []);

  useEffect(() => {
    if (pendingRedirect !== null && isAuthenticated) {
      router.replace(pendingRedirect);
    }
  }, [isAuthenticated, pendingRedirect, router]);

  async function handleSubmit(formData: FormData) {
    setError(null);

    const validation = credentialsSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!validation.success) {
      const field = validation.error.issues[0]?.path[0];
      setError(field === "email" ? t("validEmail") : field === "password" ? t("passwordMin") : t("checkCredentials"));
      return;
    }

    formData.set("email", validation.data.email.trim().toLowerCase());
    formData.set("password", validation.data.password);
    formData.set("flow", mode);
    setIsSubmitting(true);

    try {
      await signIn("password", formData);
      window.localStorage.removeItem(legacyRememberedCredentialsKey);
      setPendingRedirect(nextPath.startsWith("/") ? nextPath : "/dashboard");
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : "Authentication failed";
      setError(message.replace(/^Error:\s*/i, "") || t("authenticationFailed"));
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-0 bg-transparent shadow-none">
      <CardHeader className="p-0">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100/85">AssetFlow AI</p>
        <CardTitle className="mt-3 text-4xl tracking-[-0.055em] text-white">{mode === "signIn" ? t("welcomeBack") : t("createYourWorkspace")}</CardTitle>
        <CardDescription className="mt-2 max-w-sm leading-6 text-slate-200/80">{mode === "signIn" ? t("signInDescription") : t("signUpDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="p-0 pt-8">
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit(new FormData(event.currentTarget));
          }}
        >
          <label className="group relative flex items-center border-b border-white/50 transition-colors focus-within:border-cyan-100" htmlFor="email">
            <span className="sr-only">{t("email")}</span>
            <Input className="auth-input h-14 border-0 bg-transparent px-0 pr-12 text-base text-white shadow-none placeholder:text-slate-200/70 focus-visible:ring-0" id="email" name="email" type="email" autoComplete="email" placeholder={t("email")} required aria-describedby="email-help" />
            <Mail aria-hidden="true" className="pointer-events-none absolute right-1 size-5 text-slate-200/80 transition-colors group-focus-within:text-cyan-100" strokeWidth={1.8} />
            <span id="email-help" className="sr-only">{t("emailHelp")}</span>
          </label>
          {mode === "signUp" ? (
            <label className="group relative flex items-center border-b border-white/50 transition-colors focus-within:border-cyan-100" htmlFor="display-name">
              <span className="sr-only">{t("displayName")}</span>
              <Input className="auth-input h-14 border-0 bg-transparent px-0 pr-12 text-base text-white shadow-none placeholder:text-slate-200/70 focus-visible:ring-0" id="display-name" name="displayName" type="text" autoComplete="name" placeholder={t("displayName")} />
              <UserRound aria-hidden="true" className="pointer-events-none absolute right-1 size-5 text-slate-200/80 transition-colors group-focus-within:text-cyan-100" strokeWidth={1.8} />
            </label>
          ) : null}
          <label className="group relative flex items-center border-b border-white/50 transition-colors focus-within:border-cyan-100" htmlFor="password">
            <span className="sr-only">{t("password")}</span>
            <Input className="auth-input h-14 border-0 bg-transparent px-0 pr-12 text-base text-white shadow-none placeholder:text-slate-200/70 focus-visible:ring-0" id="password" name="password" type={isPasswordVisible ? "text" : "password"} autoComplete={mode === "signIn" ? "current-password" : "new-password"} minLength={8} required aria-describedby="password-help" placeholder={t("password")} />
            <button type="button" className="absolute right-0 inline-flex size-9 items-center justify-center rounded-md text-slate-200/80 transition-colors hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100" onClick={() => setIsPasswordVisible((current) => !current)} aria-label={isPasswordVisible ? t("hidePassword") : t("showPassword")} aria-pressed={isPasswordVisible}>
              {isPasswordVisible ? <Eye className="size-5" strokeWidth={1.8} aria-hidden="true" /> : <EyeOff className="size-5" strokeWidth={1.8} aria-hidden="true" />}
            </button>
            <span id="password-help" className="sr-only">{t("passwordHelp")}</span>
          </label>
          <div className="flex items-center justify-end pt-1">
            <button
              className="shrink-0 text-sm text-slate-100 underline decoration-slate-300/70 underline-offset-4 transition-colors hover:text-cyan-100 hover:decoration-cyan-100"
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setMode(mode === "signIn" ? "signUp" : "signIn");
                setError(null);
                setIsPasswordVisible(false);
              }}
            >
              {mode === "signIn" ? t("createAccount") : t("signInInstead")}
            </button>
          </div>
          {error !== null ? <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p> : null}
          <Button className="h-11 w-full border border-cyan-100/45 bg-cyan-300 font-semibold text-slate-950 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.42),0_10px_28px_rgb(34_211_238_/_0.22)] hover:bg-cyan-200" type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? t("working") : mode === "signIn" ? t("signIn") : t("createAccountAction")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
