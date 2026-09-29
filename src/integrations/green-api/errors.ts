export const GREEN_CHAT_ERRORS = {
  WEBHOOK_URL_CONFIGURED:
    "Clear webhookUrl in your GREEN API settings to receive notifications through HTTP polling.",
  CHECK_FAILED: "Telegram could not verify the phone number.",
  ACCOUNT_NOT_FOUND:
    "No Telegram account was found, or the phone number is hidden by privacy settings.",
  INVALID_STATUS_NOTIFICATION: "Invalid message status notification.",
  MISSING_CHAT: "The notification is missing a chat ID.",
  MISSING_DELETED_MESSAGE_ID:
    "The deletion notification is missing a message ID.",
  INVALID_NOTIFICATION: "Invalid message notification.",
} as const;
