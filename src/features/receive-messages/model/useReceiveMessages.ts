import { useEffect, useRef, useState } from "react";
import {
  CONNECTION_STATE,
  NOTIFICATION_SETTINGS_NOTICE,
  type Connection,
} from "@/features/receive-messages/model/connection";
import {
  type GreenApiClient,
  type GreenNotificationDto,
} from "@/shared/api/green-api";
import { runNotificationLoop } from "@/features/receive-messages/model/runNotificationLoop";

export function useReceiveMessages(
  client: GreenApiClient,
  onNotification: (notification: GreenNotificationDto) => string | void,
) {
  const [connection, setConnection] = useState<Connection>({
    status: CONNECTION_STATE.CONNECTING,
  });
  const [notice, setNotice] = useState("");
  const [deliveryErrorMessage, setDeliveryErrorMessage] = useState("");
  const handler = useRef(onNotification);

  useEffect(() => {
    handler.current = onNotification;
  }, [onNotification]);

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
      onSettingsEnabled: () => setNotice(NOTIFICATION_SETTINGS_NOTICE),
    });

    return () => controller.abort();
  }, [client]);

  return {
    state: connection.status,
    errorMessage:
      connection.status === CONNECTION_STATE.ERROR ? connection.message : "",
    notice,
    deliveryErrorMessage,
  };
}
