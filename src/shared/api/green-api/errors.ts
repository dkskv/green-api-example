export const API_ERROR_MESSAGES = {
  INVALID_HISTORY: "Telegram API returned an invalid chat history.",
  NOTIFICATION_NOT_ACKNOWLEDGED: "The notification was not acknowledged.",
  receiveRejected: (status: number) =>
    `GREEN API rejected ReceiveNotification (HTTP ${status}).`,
  instanceNotReady: (state: string) =>
    `Instance is not ready: ${state}. Check its authorization in GREEN API.`,
} as const;
