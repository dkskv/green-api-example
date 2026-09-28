export const MESSENGER_ERROR_MESSAGES = {
  OPEN_FAILED: "Could not open the chat.",
  REFRESH_FAILED: "Could not refresh the chat history.",
  DELETE_FAILED: "Could not delete the message.",
  API_ERROR: "API error",
  restoreFailed: (reason: string) =>
    `Could not restore chat history: ${reason}`,
} as const;
