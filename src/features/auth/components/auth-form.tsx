"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useConvexAuth } from "convex/react";
import { Eye, EyeOff, LoaderCircle, Mail, UserRound } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/language-provider";
import type { Translation } from "@/lib/i18n";
import { authClient } from "@/lib/auth-client";

import { TurnstileChallenge } from "./turnstile-challenge";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(2).max(80).optional(),
});

type AuthMode = "signIn" | "signUp";
type AuthPhase = "idle" | "submitting" | "waitingForSession";
const legacyRememberedCredentialsKey = "assetflow:remembered-credentials";

function getErrorMessage(error: unknown, t: Translation) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("captcha") || message.includes("human verification") || message.includes("missing response")) return t("completeHumanVerification");
  return t("authenticationFailed");
}

export function AuthForm({ nextPath = "/dashboard" }: { nextPath?: string }) {
  const { t } = useLanguage();
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [error, setError] = useState<string | null>(null);
  const [authPhase, setAuthPhase] = useState<AuthPhase>("idle");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [isSessionSyncSlow, setIsSessionSyncSlow] = useState(false);
  const isTransitioning = authPhase !== "idle";
  const isWaitingForSession = authPhase === "waitingForSession";
  const isSubmitDisabled = isTransitioning || captchaToken === null;

  useEffect(() => {
    window.localStorage.removeItem(legacyRememberedCredentialsKey);
  }, []);

  useEffect(() => {
    if (pendingRedirect === null || !isAuthenticated) return;
    router.replace(pendingRedirect);
  }, [isAuthenticated, pendingRedirect, router]);

  useEffect(() => {
    if (!isWaitingForSession || isAuthenticated) return;

    const timeout = window.setTimeout(() => setIsSessionSyncSlow(true), 10_000);
    return () => window.clearTimeout(timeout);
  }, [isAuthenticated, isWaitingForSession]);

  function resetCaptcha() {
    setCaptchaToken(null);
    setCaptchaResetKey((current) => current + 1);
  }

  async function handleCredentials(formData: FormData) {
    if (isTransitioning) return;
    setError(null);
    const validation = credentialsSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
      displayName: mode === "signUp" ? formData.get("displayName") : undefined,
    });
    if (!validation.success) {
      const field = validation.error.issues[0]?.path[0];
      setError(field === "email" ? t("validEmail") : field === "password" ? t("passwordMin") : t("checkCredentials"));
      return;
    }
    if (captchaToken === null) {
      setError(t("completeHumanVerification"));
      return;
    }

    const email = validation.data.email.trim().toLowerCase();
    setIsSessionSyncSlow(false);
    setAuthPhase("submitting");
    try {
      if (mode === "signIn") {
        const result = await authClient.signIn.email({
          email,
          password: validation.data.password,
          fetchOptions: { headers: { "x-captcha-response": captchaToken } },
        });
        if (result.error !== null) throw new Error(result.error.message);
        setPendingRedirect(nextPath.startsWith("/") ? nextPath : "/dashboard");
      } else {
        const result = await authClient.signUp.email({
          email,
          password: validation.data.password,
          name: validation.data.displayName ?? email.split("@")[0] ?? "AssetFlow user",
          fetchOptions: { headers: { "x-captcha-response": captchaToken } },
        });
        if (result.error !== null) throw new Error(result.error.message);
        setPendingRedirect(nextPath.startsWith("/") ? nextPath : "/dashboard");
      }
      setAuthPhase("waitingForSession");
    } catch (authError) {
      setError(getErrorMessage(authError, t));
      resetCaptcha();
      setIsSessionSyncSlow(false);
      setAuthPhase("idle");
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
        <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); void handleCredentials(new FormData(event.currentTarget)); }}>
            <label className="group relative flex items-center border-b border-white/50 transition-colors focus-within:border-cyan-100" htmlFor="email">
              <span className="sr-only">{t("email")}</span>
              <Input className="auth-input h-14 border-0 bg-transparent px-0 pr-12 text-base text-white shadow-none placeholder:text-slate-200/70 focus-visible:ring-0" disabled={isTransitioning} id="email" name="email" type="email" autoComplete="email" placeholder={t("email")} required />
              <Mail aria-hidden="true" className="pointer-events-none absolute right-1 size-5 text-slate-200/80" strokeWidth={1.8} />
            </label>
            {mode === "signUp" ? <label className="group relative flex items-center border-b border-white/50 transition-colors focus-within:border-cyan-100" htmlFor="display-name"><span className="sr-only">{t("displayName")}</span><Input className="auth-input h-14 border-0 bg-transparent px-0 pr-12 text-base text-white shadow-none placeholder:text-slate-200/70 focus-visible:ring-0" disabled={isTransitioning} id="display-name" name="displayName" type="text" autoComplete="name" placeholder={t("displayName")} required /><UserRound aria-hidden="true" className="pointer-events-none absolute right-1 size-5 text-slate-200/80" strokeWidth={1.8} /></label> : null}
            <label className="group relative flex items-center border-b border-white/50 transition-colors focus-within:border-cyan-100" htmlFor="password">
              <span className="sr-only">{t("password")}</span>
              <Input className="auth-input h-14 border-0 bg-transparent px-0 pr-12 text-base text-white shadow-none placeholder:text-slate-200/70 focus-visible:ring-0" disabled={isTransitioning} id="password" name="password" type={isPasswordVisible ? "text" : "password"} autoComplete={mode === "signIn" ? "current-password" : "new-password"} minLength={8} required placeholder={t("password")} />
              <button type="button" disabled={isTransitioning} className="absolute right-0 inline-flex size-9 items-center justify-center rounded-md text-slate-200/80 transition-colors hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 disabled:pointer-events-none disabled:opacity-50" onClick={() => setIsPasswordVisible((current) => !current)} aria-label={isPasswordVisible ? t("hidePassword") : t("showPassword")} aria-pressed={isPasswordVisible}>{isPasswordVisible ? <Eye className="size-5" strokeWidth={1.8} aria-hidden="true" /> : <EyeOff className="size-5" strokeWidth={1.8} aria-hidden="true" />}</button>
            </label>
            <TurnstileChallenge key={`${mode}-${captchaResetKey}`} onTokenChange={setCaptchaToken} />
            {captchaToken === null ? <p id="human-verification-hint" className="text-xs text-slate-300/80">{t("completeHumanVerification")}</p> : null}
            <div className="flex items-center justify-end pt-1"><button className="shrink-0 text-sm text-slate-100 underline decoration-slate-300/70 underline-offset-4 transition-colors hover:text-cyan-100 hover:decoration-cyan-100 disabled:pointer-events-none disabled:opacity-50" type="button" disabled={isTransitioning} onClick={() => { setMode(mode === "signIn" ? "signUp" : "signIn"); setError(null); resetCaptcha(); setIsPasswordVisible(false); }}>{mode === "signIn" ? t("createAccount") : t("signInInstead")}</button></div>
            {error !== null ? <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p> : null}
            {isWaitingForSession ? <div className="rounded-md border border-cyan-100/20 bg-cyan-100/5 px-3 py-2 text-sm text-cyan-50/90" role="status" aria-live="polite">{isSessionSyncSlow ? t("sessionSyncSlow") : t("sessionSyncNotice")}{isSessionSyncSlow ? <a className="ml-2 underline underline-offset-4 hover:text-cyan-100" href="/sign-in">{t("returnToSignIn")}</a> : null}</div> : null}
            <Button className="h-11 w-full border border-cyan-100/45 bg-cyan-300 font-semibold text-slate-950 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.42),0_10px_28px_rgb(34_211_238_/_0.22)] hover:bg-cyan-200" type="submit" disabled={isSubmitDisabled} aria-busy={isTransitioning} aria-describedby={captchaToken === null ? "human-verification-hint" : undefined}>{isTransitioning ? <><LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />{isWaitingForSession ? t("enteringWorkspace") : t("working")}</> : mode === "signIn" ? t("signIn") : t("createAccountAction")}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
