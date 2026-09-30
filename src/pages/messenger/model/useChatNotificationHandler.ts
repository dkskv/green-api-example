import { type MessageCacheController } from "./messageCacheController";
import { useState } from "react";
import { type ChatEvent } from "@/entities/message";

/** Применяет уведомления к сообщениям и хранит ошибку доставки для страницы. */
export function useChatNotificationHandler(
  messageCacheController: MessageCacheController,
) {
  const [deliveryError, setDeliveryError] = useState<Extract<
    ChatEvent,
    { type: "deliveryFailed" }
  > | null>(null);

  function onNotification(event: ChatEvent): void {
    switch (event.type) {
      case "messageReceived":
        messageCacheController.merge(event.chatId, [event.message]);

        return;
      case "messageStatusChanged":
        messageCacheController.updateStatus(
          event.chatId,
          event.messageId,
          event.status,
        );

        return;
      case "messageDeleted":
        messageCacheController.remove(event.chatId, event.messageId);

        return;
      case "deliveryFailed":
        setDeliveryError(event);

        return;
    }
  }

  return { onNotification, deliveryError };
}
