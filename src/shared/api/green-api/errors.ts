export type GreenApiErrorCode =
  | "INVALID_HISTORY"
  | "NOTIFICATION_NOT_ACKNOWLEDGED"
  | "RECEIVE_REJECTED"
  | "INSTANCE_NOT_READY"
  | "RATE_LIMITED"
  | "HTTP_ERROR"
  | "HTTP_ERROR_WITH_REASON"
  | "WEBHOOK_URL_CONFIGURED"
  | "ACCOUNT_CHECK_FAILED"
  | "ACCOUNT_NOT_FOUND"
  | "INVALID_STATUS_NOTIFICATION"
  | "MISSING_CHAT"
  | "MISSING_DELETED_MESSAGE_ID"
  | "INVALID_NOTIFICATION"
  | "SETTINGS_TIMEOUT";

/** Ошибка провайдера: код и параметры для обработки или отображения. */
export class GreenApiError extends Error {
  readonly code: GreenApiErrorCode;
  readonly details: { status?: number; state?: string; reason?: string };

  constructor(
    code: GreenApiErrorCode,
    details: { status?: number; state?: string; reason?: string } = {},
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = "GreenApiError";
    this.code = code;
    this.details = details;
  }
}
