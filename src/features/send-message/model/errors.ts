export const SEND_ERROR_MESSAGES = {
  sendFailed: (reason: unknown) =>
    `Message not sent. Your draft has been kept. ${reason instanceof Error ? reason.message : "Please try again."}`,
} as const;
