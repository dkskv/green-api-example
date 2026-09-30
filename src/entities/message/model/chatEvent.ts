import type { MessageStatus } from "./status";
import { type ChatMessage } from "./message";

/** Событие чата, независимое от провайдера API; адаптер преобразует в него внешние уведомления. */
export type ChatEvent =
  | { type: "messageReceived"; chatId: string; message: ChatMessage }
  | {
      type: "messageStatusChanged";
      chatId: string;
      messageId: string;
      status: MessageStatus;
    }
  | { type: "messageDeleted"; chatId: string; messageId: string }
  | { type: "deliveryFailed"; chatId?: string; description?: string };
