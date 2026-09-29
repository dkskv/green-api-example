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
  [CONNECTION_STATE.CONNECTING]: "Connecting",
  [CONNECTION_STATE.ONLINE]: "Receiving messages",
  [CONNECTION_STATE.ERROR]: "Connection error",
};
