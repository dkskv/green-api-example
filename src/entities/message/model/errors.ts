export const MESSAGE_ERROR_MESSAGES = {
  INVALID_STATUS_NOTIFICATION: "Invalid message status notification.",
  MISSING_CHAT: "The notification is missing a chat ID.",
  MISSING_DELETED_MESSAGE_ID:
    "The deletion notification is missing a message ID.",
  INVALID_NOTIFICATION: "Invalid message notification.",
  sendFailed: (chatId?: string, description?: string) =>
    `Failed to send a message to chat ${chatId ?? "unknown"}: ${description ?? "unknown error"}`,
} as const;
