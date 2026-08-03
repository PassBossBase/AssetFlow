"use client";

import { useEffect, useRef } from "react";

import { useLanguage } from "@/components/language-provider";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void }) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
  }
}

type TurnstileChallengeProps = {
  onTokenChange: (token: string | null) => void;
};

export function TurnstileChallenge({ onTokenChange }: TurnstileChallengeProps) {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (siteKey === undefined || containerRef.current === null) return;

    let cancelled = false;
    const render = () => {
      if (cancelled || containerRef.current === null || window.turnstile === undefined || widgetIdRef.current !== null) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token) => onTokenChange(token),
        "expired-callback": () => onTokenChange(null),
        "error-callback": () => onTokenChange(null),
      });
    };

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-assetflow-turnstile="true"]');
    if (existingScript !== null) {
      existingScript.addEventListener("load", render);
      render();
    } else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.assetflowTurnstile = "true";
      script.addEventListener("load", render);
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current !== null && window.turnstile !== undefined) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
      onTokenChange(null);
    };
  }, [onTokenChange, siteKey]);

  if (siteKey === undefined) {
    return <p className="text-sm text-destructive" role="alert">{t("humanVerificationUnavailable")}</p>;
  }

  return <div ref={containerRef} className="min-h-[65px]" aria-label="Human verification" />;
}
