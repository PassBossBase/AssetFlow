"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AuthForm } from "@/features/auth/components/auth-form";
import { useLanguage } from "@/components/language-provider";

export function AuthPageShell({ nextPath }: { nextPath: string }) {
  const { t } = useLanguage();

  return (
    <main className="auth-page-shell min-h-[100dvh]" aria-label="AssetFlow authentication">
      <div className="auth-page-backdrop" aria-hidden="true" />
      <Link
        className="auth-back-home absolute left-5 top-5 z-20 inline-flex h-10 items-center gap-2 rounded-full border border-white/20 bg-slate-950/35 px-4 text-sm font-medium text-white shadow-lg shadow-slate-950/20 backdrop-blur-md transition-colors hover:border-cyan-200/60 hover:bg-slate-950/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 sm:left-8 sm:top-8"
        href="/"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t("backHome")}
      </Link>

      <div className="relative z-10 grid min-h-[100dvh] lg:grid-cols-[minmax(0,1.16fr)_minmax(28rem,0.84fr)]">
        <section className="hidden items-end px-12 pb-16 pt-32 lg:flex xl:px-20 xl:pb-20" aria-label={t("authVisualTitle")}>
          <div className="max-w-xl text-white">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100/80">AssetFlow AI</p>
            <h1 className="max-w-lg text-5xl font-semibold tracking-[-0.055em] text-white xl:text-6xl">{t("authVisualTitle")}</h1>
            <p className="mt-6 max-w-md text-base leading-7 text-slate-100/80">{t("authVisualDescription")}</p>
          </div>
        </section>

        <section className="auth-form-pane flex min-h-[100dvh] items-center justify-center px-6 py-24 sm:px-10 lg:px-14 xl:px-20">
          <AuthForm nextPath={nextPath} />
        </section>
      </div>
    </main>
  );
}
