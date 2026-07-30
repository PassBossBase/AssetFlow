"use client";

import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";

export function LanguageToggle({ inline = false }: { inline?: boolean }) {
  const { language, setLanguage, t } = useLanguage();
  const pathname = usePathname();

  if (!inline && (pathname === "/dashboard" || pathname.startsWith("/dashboard/"))) {
    return null;
  }

  const containerClassName = inline
    ? "flex items-center gap-1 rounded-full border border-white/15 bg-card/80 p-1 shadow-lg backdrop-blur-lg"
    : "fixed right-4 top-4 z-20 flex items-center gap-1 rounded-full border border-white/15 bg-card/80 p-1 shadow-lg backdrop-blur-lg";

  return (
    <div className={containerClassName} role="group" aria-label={t("language")}>
      <Button type="button" variant={language === "en" ? "secondary" : "ghost"} size="sm" className="h-8 rounded-full px-3 text-xs" onClick={() => setLanguage("en")} aria-pressed={language === "en"}>
        EN
      </Button>
      <Button type="button" variant={language === "zh" ? "secondary" : "ghost"} size="sm" className="h-8 rounded-full px-3 text-xs" onClick={() => setLanguage("zh")} aria-pressed={language === "zh"}>
        中文
      </Button>
    </div>
  );
}
