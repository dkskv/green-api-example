import { useState } from "react";
import { type ChatEvent, type MessageStore } from "@/entities/message";

/** Применяет уведомления к сообщениям и хранит ошибку доставки для страницы. */
export function useChatNotificationHandler(store: MessageStore) {
  const [deliveryError, setDeliveryError] = useState<Extract<
    ChatEvent,
    { type: "deliveryFailed" }
  > | null>(null);

  function onNotification(event: ChatEvent): void {
    switch (event.type) {
      case "messageReceived":
        store.merge(event.chatId, [event.message]);

        return;
      case "messageStatusChanged":
        store.updateMessageStatus(event.chatId, event.messageId, event.status);

        return;
      case "messageDeleted":
        store.remove(event.chatId, event.messageId);

        return;
      case "deliveryFailed":
        setDeliveryError(event);

        return;
    }
  }

  return { onNotification, deliveryError };
}
