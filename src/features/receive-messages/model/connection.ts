import { i18n } from "@/shared/i18n";

export const CONNECTION_STATE = {
  CONNECTING: "connecting",
  ONLINE: "online",
  ERROR: "error",
} as const;

export type ConnectionState =
  (typeof CONNECTION_STATE)[keyof typeof CONNECTION_STATE];

export type Connection =
  | { status: typeof CONNECTION_STATE.CONNECTING }
  | { status: typeof CONNECTION_STATE.ONLINE }
  | { status: typeof CONNECTION_STATE.ERROR; message: string };

export const CONNECTION_STATE_LABELS: Record<ConnectionState, string> = {
  [CONNECTION_STATE.CONNECTING]: i18n.t("messages:connection.connecting"),
  [CONNECTION_STATE.ONLINE]: i18n.t("messages:connection.online"),
  [CONNECTION_STATE.ERROR]: i18n.t("messages:connection.error"),
};
