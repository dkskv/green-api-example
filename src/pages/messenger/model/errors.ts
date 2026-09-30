import { i18n } from "@/shared/i18n";

export const MESSENGER_ERROR_MESSAGES = {
  openFailed: i18n.t("errors:messenger.openFailed"),
  refreshFailed: i18n.t("errors:messenger.refreshFailed"),
  deleteFailed: i18n.t("errors:messenger.deleteFailed"),
  apiError: i18n.t("errors:messenger.apiError"),
  restoreFailed: (reason: string) =>
    i18n.t("errors:messenger.restoreFailed", { reason }),
  deliveryFailed: (chatId?: string, description?: string) =>
    i18n.t("errors:message.sendFailed", {
      chatId: chatId ?? i18n.t("errors:message.unknownChat"),
      description: description ?? i18n.t("errors:message.unknownError"),
    }),
} as const;
