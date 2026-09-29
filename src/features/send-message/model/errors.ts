import { errorText } from "@/shared/lib/errorText";
import { i18n } from "@/shared/i18n";

export const SEND_ERROR_MESSAGES = {
  sendFailed: (reason: unknown) =>
    i18n.t("errors:send.failed", {
      reason: errorText(reason, i18n.t("errors:send.retry")),
    }),
} as const;
