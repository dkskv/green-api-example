import type { DisplayText } from "@/shared/i18n/text";
import { text } from "@/shared/i18n/text";

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
  | { status: typeof CONNECTION_STATE.ERROR; message: DisplayText };

export const CONNECTION_STATE_LABELS: Record<ConnectionState, DisplayText> = {
  [CONNECTION_STATE.CONNECTING]: text("messages:connection.connecting"),
  [CONNECTION_STATE.ONLINE]: text("messages:connection.online"),
  [CONNECTION_STATE.ERROR]: text("messages:connection.error"),
};
