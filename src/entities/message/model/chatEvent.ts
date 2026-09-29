import { type ChatMessage } from "./message";

export type ChatEvent =
  | { type: "messageReceived"; chatId: string; message: ChatMessage }
  | {
      type: "messageStatusChanged";
      chatId: string;
      messageId: string;
      status: string;
    }
  | { type: "messageDeleted"; chatId: string; messageId: string }
  | { type: "deliveryFailed"; chatId?: string; description?: string };
