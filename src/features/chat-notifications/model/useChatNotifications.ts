import { useEffect, useState } from "react";
import { CONNECTION_STATE, type Connection } from "./connection";
import { type ChatClient } from "@/entities/chat";
import { type ChatEvent } from "@/entities/message";
import { useBypassStrictMode } from "@/shared/lib/useBypassStrictMode";
import { useActualRef } from "@/shared/lib/useActualRef";
import { runNotificationLoop } from "./runNotificationLoop";

type ChatNotificationsOptions = {
  client: ChatClient;
  onNotification: (event: ChatEvent) => void;
};

export function useChatNotifications({
  client,
  onNotification,
}: ChatNotificationsOptions) {
  const [connection, setConnection] = useState<Connection>({
    status: CONNECTION_STATE.CONNECTING,
  });
  // Ждём завершения проверочного цикла StrictMode: повторные запросы вызывают 429 на dev-аккаунте.
  const ready = useBypassStrictMode();
  const onNotificationRef = useActualRef(onNotification);

  useEffect(() => {
    if (!ready) return;

    const controller = new AbortController();

    runNotificationLoop({
      client,
      signal: controller.signal,
      onNotification: (notification) => onNotificationRef.current(notification),
      onConnectionChange: setConnection,
    });

    return () => controller.abort();
  }, [client, onNotificationRef, ready]);

  return connection;
}
