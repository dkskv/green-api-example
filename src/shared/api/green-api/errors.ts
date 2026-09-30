import { i18n } from "@/shared/i18n";

export const API_ERROR_MESSAGES = {
  invalidHistory: i18n.t("errors:api.invalidHistory"),
  notificationNotAcknowledged: i18n.t("errors:api.notificationNotAcknowledged"),
  receiveRejected: (status: number) =>
    i18n.t("errors:api.receiveRejected", { status }),
  instanceNotReady: (state: string) =>
    i18n.t("errors:api.instanceNotReady", { state }),
} as const;
