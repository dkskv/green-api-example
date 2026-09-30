import { useEffect, useState } from "react";
import { CONNECTION_STATE, type Connection } from "./connection";
import { type ChatClient } from "@/entities/chat";
import { type ChatEvent } from "@/entities/message";
import { useBypassStrictMode } from "@/shared/lib/useBypassStrictMode";
import { useActualRef } from "@/shared/lib/useActualRef";
import { runNotificationLoop } from "./runNotificationLoop";
import { RECEIVE_ERROR_MESSAGES } from "./errors";

export function useReceiveMessages(
  client: ChatClient,
  onNotification: (notification: ChatEvent) => void,
) {
  const [connection, setConnection] = useState<Connection>({
    status: CONNECTION_STATE.CONNECTING,
  });
  const [notice, setNotice] = useState<string>("");
  const [deliveryErrorMessage, setDeliveryErrorMessage] = useState<string>("");
  // Ждём завершения проверочного цикла StrictMode: повторные запросы вызывают 429 на dev-аккаунте.
  const ready = useBypassStrictMode();
  const handler = useActualRef(onNotification);

  useEffect(() => {
    if (!ready) return;

    const controller = new AbortController();

    runNotificationLoop({
      client,
      signal: controller.signal,
      onNotification: (notification) => {
        if (notification.type === "deliveryFailed") {
          setDeliveryErrorMessage(
            RECEIVE_ERROR_MESSAGES.deliveryFailed(
              notification.chatId,
              notification.description,
            ),
          );

          return;
        }

        handler.current(notification);
      },
      onConnectionChange: setConnection,
      onNotice: setNotice,
    });

    return () => controller.abort();
  }, [client, handler, ready]);

  return {
    state: connection.status,
    errorMessage:
      connection.status === CONNECTION_STATE.ERROR ? connection.message : "",
    notice,
    deliveryErrorMessage,
  };
}
