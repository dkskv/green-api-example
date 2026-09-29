export const MESSAGE_ERROR_MESSAGES = {
  sendFailed: (chatId?: string, description?: string) =>
    `Failed to send a message to chat ${chatId ?? "unknown"}: ${description ?? "unknown error"}`,
} as const;
