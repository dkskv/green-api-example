import { text } from "@/shared/i18n/text";

export const MESSAGE_ERROR_MESSAGES = {
  sendFailed: (chatId?: string, description?: string) =>
    text("errors:message.sendFailed", {
      chatId: chatId ?? text("errors:message.unknownChat"),
      description: description ?? text("errors:message.unknownError"),
    }),
} as const;
