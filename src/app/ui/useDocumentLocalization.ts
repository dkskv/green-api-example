import { useEffect } from "react";
import { z } from "zod";
import { useTranslation } from "@/shared/i18n";

/** Синхронизирует язык и заголовок документа с локализацией приложения. */
export function useDocumentLocalization() {
  const { t, i18n } = useTranslation("ui");

  useEffect(() => {
    document.documentElement.lang = z
      .string()
      .min(1)
      .parse(i18n.resolvedLanguage);

    document.title = t("app.appName");
  }, [t, i18n.resolvedLanguage]);
}
