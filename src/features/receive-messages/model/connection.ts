export const CONNECTION_STATE = {
  CONNECTING: "connecting",
  ONLINE: "online",
  ERROR: "error",
} as const;

export type ConnectionState =
  (typeof CONNECTION_STATE)[keyof typeof CONNECTION_STATE];

export const CONNECTION_STATE_LABELS: Record<ConnectionState, string> = {
  [CONNECTION_STATE.CONNECTING]: "Connecting",
  [CONNECTION_STATE.ONLINE]: "Receiving messages",
  [CONNECTION_STATE.ERROR]: "Connection error",
};

export const NOTIFICATION_SETTINGS_NOTICE =
  "Notifications enabled. GREEN API may take up to 5 minutes to apply the settings and restart the instance.";
