import { text } from "@/shared/i18n/text";

export const API_ERROR_MESSAGES = {
  INVALID_HISTORY: text("errors:api.INVALID_HISTORY"),
  NOTIFICATION_NOT_ACKNOWLEDGED: text(
    "errors:api.NOTIFICATION_NOT_ACKNOWLEDGED",
  ),
  receiveRejected: (status: number) =>
    text("errors:api.receiveRejected", { status }),
  instanceNotReady: (state: string) =>
    text("errors:api.instanceNotReady", { state }),
} as const;
