"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";

import { getTranslations, type Language, type Translation } from "@/lib/i18n";

const LANGUAGE_STORAGE_KEY = "assetflow-language";
let currentLanguage: Language = "en";
const languageListeners = new Set<() => void>();

function subscribeToLanguage(listener: () => void) {
  languageListeners.add(listener);
  return () => languageListeners.delete(listener);
}

function getLanguageSnapshot() {
  return currentLanguage;
}

function getServerLanguageSnapshot(): Language {
  return "en";
}

function updateLanguage(language: Language) {
  currentLanguage = language;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }
  languageListeners.forEach((listener) => listener());
}

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translation;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore(subscribeToLanguage, getLanguageSnapshot, getServerLanguageSnapshot);

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage === "en" || savedLanguage === "zh") {
      updateLanguage(savedLanguage);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage: updateLanguage, t: getTranslations(language) }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === null) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  return context;
}
