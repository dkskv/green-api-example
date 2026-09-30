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
  | { status: typeof CONNECTION_STATE.ERROR; error: unknown };
