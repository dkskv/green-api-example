import { useEffect, useState } from "react";
import { CONNECTION_STATE, type Connection } from "./connection";
import { type ChatClient } from "@/entities/chat";
import { type ChatEvent } from "@/entities/message";
import { useMounted } from "@/shared/lib/useMounted";
import { useActualRef } from "@/shared/lib/useActualRef";
import { runNotificationLoop } from "./runNotificationLoop";

export function useReceiveMessages(
  client: ChatClient,
  onNotification: (notification: ChatEvent) => string | void,
) {
  const [connection, setConnection] = useState<Connection>({
    status: CONNECTION_STATE.CONNECTING,
  });
  const [notice, setNotice] = useState<string>("");
  const [deliveryErrorMessage, setDeliveryErrorMessage] = useState<string>("");
  // Ждём завершения проверочного цикла StrictMode: повторные запросы вызывают 429 на dev-аккаунте.
  const mounted = useMounted();
  const handler = useActualRef(onNotification);

  useEffect(() => {
    if (!mounted) return;

    const controller = new AbortController();

    runNotificationLoop({
      client,
      signal: controller.signal,
      onNotification: (notification) => {
        const warning = handler.current(notification);

        if (warning) setDeliveryErrorMessage(warning);
      },
      onConnectionChange: setConnection,
      onNotice: setNotice,
    });

    return () => controller.abort();
  }, [client, handler, mounted]);

  return {
    state: connection.status,
    errorMessage:
      connection.status === CONNECTION_STATE.ERROR ? connection.message : "",
    notice,
    deliveryErrorMessage,
  };
}
