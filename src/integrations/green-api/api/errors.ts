import { i18n } from "@/shared/i18n";

export const API_ERROR_MESSAGES = {
  INVALID_HISTORY: i18n.t("errors:api.INVALID_HISTORY"),
  NOTIFICATION_NOT_ACKNOWLEDGED: i18n.t(
    "errors:api.NOTIFICATION_NOT_ACKNOWLEDGED",
  ),
  receiveRejected: (status: number) =>
    i18n.t("errors:api.receiveRejected", { status }),
  instanceNotReady: (state: string) =>
    i18n.t("errors:api.instanceNotReady", { state }),
} as const;
