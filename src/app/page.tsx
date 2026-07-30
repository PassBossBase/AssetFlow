"use client";

import Link from "next/link";
import Image from "next/image";
import { useConvexAuth } from "convex/react";

import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { TextType } from "@/components/ui/text-type";

const convexIsConfigured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
const getStartedButtonClassName = "shrink-0 bg-cyan-300 text-slate-950 shadow-[0_0_24px_rgb(34_211_238_/_0.24)] transition-all hover:bg-cyan-200 hover:shadow-[0_0_34px_rgb(34_211_238_/_0.4)] active:scale-[0.98]";

function GetStartedAction({ label, checkingLabel, activeLabel, signInRequiredLabel }: { label: string; checkingLabel: string; activeLabel: string; signInRequiredLabel: string }) {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled className={getStartedButtonClassName}>{label}</Button>
        <p className="flex items-center gap-2 text-sm text-slate-100/70" role="status" aria-live="polite"><span className="size-1.5 animate-pulse rounded-full bg-cyan-200" aria-hidden="true" />{checkingLabel}</p>
      </div>
    );
  }

  const destination = isAuthenticated ? "/dashboard" : "/sign-in";
  const statusLabel = isAuthenticated ? activeLabel : signInRequiredLabel;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button asChild className={getStartedButtonClassName}>
        <Link href={destination}>{label}</Link>
      </Button>
      <p className="flex items-center gap-2 text-sm text-slate-100/75" role="status"><span className={`size-1.5 rounded-full ${isAuthenticated ? "bg-cyan-200 shadow-[0_0_10px_rgb(103_232_249_/_0.9)]" : "bg-slate-300/70"}`} aria-hidden="true" />{statusLabel}</p>
    </div>
  );
}

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <main className="home-hero min-h-[100dvh]">
      <Image
        alt=""
        className="object-cover object-[32%_center]"
        fill
        priority
        sizes="100vw"
        src="/images/home-archive-hero.jpg"
      />
      <div className="home-hero-scrim" aria-hidden="true" />
      <div className="relative z-10 grid min-h-[100dvh] lg:grid-cols-[minmax(0,1.12fr)_minmax(25rem,0.88fr)]">
        <div className="hidden lg:block" />
        <section className="flex items-end px-6 py-20 sm:px-10 lg:items-center lg:px-14 xl:px-20" aria-labelledby="home-title">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100/85">AssetFlow AI</p>
            <h1 id="home-title" className="mt-5 text-4xl font-semibold leading-[1.04] tracking-[-0.055em] text-white sm:text-5xl xl:text-6xl">{t("landingTitle")}</h1>
            <div className="mt-5 min-h-24 max-w-lg sm:min-h-28">
              <p className="text-xl font-semibold leading-snug tracking-[-0.035em] text-white sm:text-2xl">
                <TextType
                  key={t("landingDescription")}
                  text={[t("landingDescription"), t("supportedFormats")]}
                  typingDelay={66}
                  holdDuration={2400}
                  transitionDuration={120}
                  deletingDelay={31}
                />
              </p>
              <p className="sr-only">{t("landingDescription")} {t("supportedFormats")}</p>
            </div>
            <div className="mt-8">
              {convexIsConfigured ? <GetStartedAction label={t("getStarted")} checkingLabel={t("sessionChecking")} activeLabel={t("sessionActive")} signInRequiredLabel={t("sessionSignInRequired")} /> : <div className="flex flex-wrap items-center gap-3"><Button asChild className={getStartedButtonClassName}><Link href="/sign-in">{t("getStarted")}</Link></Button><p className="flex items-center gap-2 text-sm text-slate-100/75"><span className="size-1.5 rounded-full bg-slate-300/70" aria-hidden="true" />{t("sessionSignInRequired")}</p></div>}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
