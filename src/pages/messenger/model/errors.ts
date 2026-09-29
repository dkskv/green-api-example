import { i18n } from "@/shared/i18n";

export const MESSENGER_ERROR_MESSAGES = {
  OPEN_FAILED: i18n.t("errors:messenger.OPEN_FAILED"),
  REFRESH_FAILED: i18n.t("errors:messenger.REFRESH_FAILED"),
  DELETE_FAILED: i18n.t("errors:messenger.DELETE_FAILED"),
  API_ERROR: i18n.t("errors:messenger.API_ERROR"),
  restoreFailed: (reason: string) =>
    i18n.t("errors:messenger.restoreFailed", { reason }),
} as const;
