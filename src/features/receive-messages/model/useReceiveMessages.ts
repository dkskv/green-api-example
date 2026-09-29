import { useEffect, useState } from "react";
import {
  CONNECTION_STATE,
  type Connection,
} from "@/features/receive-messages/model/connection";
import { type ChatClient } from "@/entities/chat";
import { type ChatEvent } from "@/entities/message";
import { useActualRef } from "@/shared/lib/useActualRef";
import { runNotificationLoop } from "@/features/receive-messages/model/runNotificationLoop";

export function useReceiveMessages(
  client: ChatClient,
  onNotification: (notification: ChatEvent) => string | void,
) {
  const [connection, setConnection] = useState<Connection>({
    status: CONNECTION_STATE.CONNECTING,
  });
  const [notice, setNotice] = useState("");
  const [deliveryErrorMessage, setDeliveryErrorMessage] = useState("");
  const handler = useActualRef(onNotification);

  useEffect(() => {
    const controller = new AbortController();

    void runNotificationLoop({
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
  }, [client, handler]);

  return {
    state: connection.status,
    errorMessage:
      connection.status === CONNECTION_STATE.ERROR ? connection.message : "",
    notice,
    deliveryErrorMessage,
  };
}
