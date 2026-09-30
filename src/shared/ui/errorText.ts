import { i18n } from "@/shared/i18n";
import { GreenApiError, type GreenApiErrorCode } from "@/shared/api/green-api";

const ERROR_KEYS = {
  INVALID_HISTORY: "errors:api.invalidHistory",
  NOTIFICATION_NOT_ACKNOWLEDGED: "errors:api.notificationNotAcknowledged",
  RECEIVE_REJECTED: "errors:api.receiveRejected",
  INSTANCE_NOT_READY: "errors:api.instanceNotReady",
  RATE_LIMITED: "errors:api.RATE_LIMITED",
  HTTP_ERROR: "errors:api.http",
  HTTP_ERROR_WITH_REASON: "errors:api.httpWithReason",
  WEBHOOK_URL_CONFIGURED: "errors:greenApi.webhookUrlConfigured",
  ACCOUNT_CHECK_FAILED: "errors:greenApi.checkFailed",
  ACCOUNT_NOT_FOUND: "errors:greenApi.accountNotFound",
  INVALID_STATUS_NOTIFICATION: "errors:greenApi.invalidStatusNotification",
  MISSING_CHAT: "errors:greenApi.missingChat",
  MISSING_DELETED_MESSAGE_ID: "errors:greenApi.missingDeletedMessageId",
  INVALID_NOTIFICATION: "errors:greenApi.invalidNotification",
  SETTINGS_TIMEOUT: "errors:greenApi.settingsTimeout",
} as const satisfies Record<GreenApiErrorCode, string>;

/** Переводит известные ошибки при отображении, сохраняя сообщения внешних ошибок. */
export function errorText(reason: unknown, fallback: string): string {
  if (reason instanceof GreenApiError)
    return i18n.t(ERROR_KEYS[reason.code], reason.details);

  return reason instanceof Error ? reason.message : fallback;
}
