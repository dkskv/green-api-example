import { i18n } from "@/shared/i18n";

export const GREEN_CHAT_ERROR_MESSAGES = {
  WEBHOOK_URL_CONFIGURED: i18n.t("errors:greenApi.WEBHOOK_URL_CONFIGURED"),
  CHECK_FAILED: i18n.t("errors:greenApi.CHECK_FAILED"),
  ACCOUNT_NOT_FOUND: i18n.t("errors:greenApi.ACCOUNT_NOT_FOUND"),
  INVALID_STATUS_NOTIFICATION: i18n.t(
    "errors:greenApi.INVALID_STATUS_NOTIFICATION",
  ),
  MISSING_CHAT: i18n.t("errors:greenApi.MISSING_CHAT"),
  MISSING_DELETED_MESSAGE_ID: i18n.t(
    "errors:greenApi.MISSING_DELETED_MESSAGE_ID",
  ),
  INVALID_NOTIFICATION: i18n.t("errors:greenApi.INVALID_NOTIFICATION"),
} as const;
