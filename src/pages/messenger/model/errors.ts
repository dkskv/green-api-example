import { text } from "@/shared/i18n/text";

export const MESSENGER_ERROR_MESSAGES = {
  OPEN_FAILED: text("errors:messenger.OPEN_FAILED"),
  REFRESH_FAILED: text("errors:messenger.REFRESH_FAILED"),
  DELETE_FAILED: text("errors:messenger.DELETE_FAILED"),
  API_ERROR: text("errors:messenger.API_ERROR"),
  restoreFailed: (reason: string) =>
    text("errors:messenger.restoreFailed", { reason }),
} as const;
