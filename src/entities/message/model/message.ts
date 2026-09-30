import type { MessageStatus } from "./status";

export type ChatMessage = {
  id: string;
  text: string;
  unsupported?: boolean;
  direction: "incoming" | "outgoing";
  timestamp: number;
  status?: MessageStatus;
};
