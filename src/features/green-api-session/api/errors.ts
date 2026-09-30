import { i18n } from "@/shared/i18n";

export const GREEN_CHAT_ERROR_MESSAGES = {
  webhookUrlConfigured: i18n.t("errors:greenApi.webhookUrlConfigured"),
  checkFailed: i18n.t("errors:greenApi.checkFailed"),
  accountNotFound: i18n.t("errors:greenApi.accountNotFound"),
  invalidStatusNotification: i18n.t(
    "errors:greenApi.invalidStatusNotification",
  ),
  missingChat: i18n.t("errors:greenApi.missingChat"),
  missingDeletedMessageId: i18n.t("errors:greenApi.missingDeletedMessageId"),
  invalidNotification: i18n.t("errors:greenApi.invalidNotification"),
} as const;
