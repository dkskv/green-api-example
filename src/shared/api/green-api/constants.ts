export const WEBHOOK_TYPE = {
  INCOMING_MESSAGE: "incomingMessageReceived",
  OUTGOING_MESSAGE: "outgoingMessageReceived",
  OUTGOING_API_MESSAGE: "outgoingAPIMessageReceived",
  OUTGOING_MESSAGE_STATUS: "outgoingMessageStatus",
} as const;

export const MESSAGE_TYPE = {
  TEXT: "textMessage",
  EXTENDED_TEXT: "extendedTextMessage",
  DELETED: "deletedMessage",
} as const;

export const INSTANCE_STATE = { AUTHORIZED: "authorized" } as const;
export const WEBHOOK_SETTING = { ENABLED: "yes", DISABLED: "no" } as const;

export const CHAT_HISTORY_LIMIT = 100;
