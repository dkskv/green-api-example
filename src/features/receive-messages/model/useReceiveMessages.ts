import type { DisplayText } from "@/shared/i18n/text";
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
  onNotification: (notification: ChatEvent) => DisplayText | void,
) {
  const [connection, setConnection] = useState<Connection>({
    status: CONNECTION_STATE.CONNECTING,
  });
  const [notice, setNotice] = useState<DisplayText>("");
  const [deliveryErrorMessage, setDeliveryErrorMessage] =
    useState<DisplayText>("");
  const handler = useActualRef(onNotification);

  useEffect(() => {
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
  }, [client, handler]);

  return {
    state: connection.status,
    errorMessage:
      connection.status === CONNECTION_STATE.ERROR ? connection.message : "",
    notice,
    deliveryErrorMessage,
  };
}
