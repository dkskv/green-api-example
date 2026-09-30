import { i18n } from "@/shared/i18n";

export const RECEIVE_ERROR_MESSAGES = {
  receiveFailed: i18n.t("errors:receive.receiveFailed"),
  deliveryFailed: (chatId?: string, description?: string) =>
    i18n.t("errors:message.sendFailed", {
      chatId: chatId ?? i18n.t("errors:message.unknownChat"),
      description: description ?? i18n.t("errors:message.unknownError"),
    }),
} as const;
