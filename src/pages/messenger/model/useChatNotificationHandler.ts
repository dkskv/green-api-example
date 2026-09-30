import { useState } from "react";
import { type ChatEvent, type MessageStore } from "@/entities/message";
import { MESSENGER_ERROR_MESSAGES } from "./errors";

/** Применяет уведомления к сообщениям и хранит ошибку доставки для страницы. */
export function useChatNotificationHandler(store: MessageStore) {
  const [deliveryErrorMessage, setDeliveryErrorMessage] = useState("");

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
        setDeliveryErrorMessage(
          MESSENGER_ERROR_MESSAGES.deliveryFailed(
            event.chatId,
            event.description,
          ),
        );

        return;
    }
  }

  return { onNotification, deliveryErrorMessage };
}
