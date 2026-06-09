import { en } from "./en";
import { ta } from "./ta";
import { hi } from "./hi";

export const translations = {
  en,
  ta,
  hi,
};

export type LanguageType = "en" | "ta" | "hi";
export type TranslationKeys = typeof en;
