import React, { createContext, useContext, useState, useEffect } from "react";
import { translations, LanguageType } from "../locales";

interface LanguageContextType {
  language: LanguageType;
  setLanguage: (lang: LanguageType) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageType>(() => {
    const saved = localStorage.getItem("fora_lang");
    if (saved === "ta" || saved === "hi") {
      return saved as LanguageType;
    }
    return "en";
  });

  const setLanguage = (lang: LanguageType) => {
    setLanguageState(lang);
    localStorage.setItem("fora_lang", lang);
  };

  const t = (key: string): string => {
    const parts = key.split(".");
    let current: any = translations[language];
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        // Fallback to English
        let fallback: any = translations["en"];
        for (const fPart of parts) {
          if (fallback && typeof fallback === "object" && fPart in fallback) {
            fallback = fallback[fPart];
          } else {
            return key;
          }
        }
        return typeof fallback === "string" ? fallback : key;
      }
    }
    return typeof current === "string" ? current : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
};
