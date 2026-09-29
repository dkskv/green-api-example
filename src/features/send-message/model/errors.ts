import { errorText } from "@/shared/i18n/text";
import { text } from "@/shared/i18n/text";

export const SEND_ERROR_MESSAGES = {
  sendFailed: (reason: unknown) =>
    text("errors:send.failed", {
      reason: errorText(reason, text("errors:send.retry")),
    }),
} as const;
