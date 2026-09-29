import { text } from "@/shared/i18n/text";

export const GREEN_CHAT_ERROR_MESSAGES = {
  WEBHOOK_URL_CONFIGURED: text("errors:greenApi.WEBHOOK_URL_CONFIGURED"),
  CHECK_FAILED: text("errors:greenApi.CHECK_FAILED"),
  ACCOUNT_NOT_FOUND: text("errors:greenApi.ACCOUNT_NOT_FOUND"),
  INVALID_STATUS_NOTIFICATION: text(
    "errors:greenApi.INVALID_STATUS_NOTIFICATION",
  ),
  MISSING_CHAT: text("errors:greenApi.MISSING_CHAT"),
  MISSING_DELETED_MESSAGE_ID: text(
    "errors:greenApi.MISSING_DELETED_MESSAGE_ID",
  ),
  INVALID_NOTIFICATION: text("errors:greenApi.INVALID_NOTIFICATION"),
} as const;
