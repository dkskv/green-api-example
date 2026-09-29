import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ui from "./locales/en/ui.json";
import errors from "./locales/en/errors.json";
import messages from "./locales/en/messages.json";

export const resources = { en: { ui, errors, messages } } as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  supportedLngs: ["en"],
  defaultNS: "ui",
  initAsync: false,
  interpolation: { escapeValue: false },
});

export { i18n };
export { useTranslation } from "react-i18next";
