import type { ParseKeys } from "i18next";

export type TranslationKey = ParseKeys<["ui", "errors", "messages"]>;
export type DisplayText = string | TextDescriptor;
export type TextDescriptor = {
  key: TranslationKey;
  params?: Record<string, DisplayText | number>;
};

export function text(
  key: TranslationKey,
  params?: TextDescriptor["params"],
): TextDescriptor {
  return { key, params };
}

/** Carries untranslated application errors through promises and stores. */
export class AppError extends Error {
  readonly displayText: DisplayText;

  constructor(value: DisplayText) {
    super(typeof value === "string" ? value : value.key);
    this.name = "AppError";
    this.displayText = value;
  }
}

export function errorText(reason: unknown, fallback: DisplayText): DisplayText {
  if (reason instanceof AppError) return reason.displayText;

  return reason instanceof Error ? reason.message : fallback;
}
