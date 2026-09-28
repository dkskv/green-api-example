import { useEffect, useRef, useState } from "react";
import {
  CONNECTION_STATE,
  NOTIFICATION_SETTINGS_NOTICE,
  type ConnectionState,
} from "@/features/receive-messages/model/connection";
import {
  WEBHOOK_SETTING,
  type GreenApiClient,
  type GreenNotificationDto,
} from "@/shared/api/green-api";
import { RECEIVE_ERROR_MESSAGES } from "@/features/receive-messages/model/errors";

export function useReceiveMessages(
  client: GreenApiClient,
  onNotification: (notification: GreenNotificationDto) => string | void,
) {
  const [state, setState] = useState<ConnectionState>(
    CONNECTION_STATE.CONNECTING,
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [deliveryErrorMessage, setDeliveryErrorMessage] = useState("");
  const handler = useRef(onNotification);

  useEffect(() => {
    handler.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    let settingsReady = false;
    let settingsRequested = false;
    const pause = () =>
      new Promise<void>((resolve) => {
        const finish = () => {
          window.clearTimeout(timer);
          signal.removeEventListener("abort", finish);
          resolve();
        };
        const timer = window.setTimeout(finish, 1500);

        signal.addEventListener("abort", finish, { once: true });

        if (signal.aborted) finish();
      });

    async function run() {
      while (!signal.aborted) {
        try {
          if (!settingsReady) {
            const settings = await client.getSettings(signal);

            if (settings.webhookUrl.trim())
              throw new Error(RECEIVE_ERROR_MESSAGES.WEBHOOK_URL_CONFIGURED);

            const enabled = [
              settings.incomingWebhook,
              settings.outgoingWebhook,
              settings.outgoingMessageWebhook,
              settings.outgoingAPIMessageWebhook,
              settings.deletedMessageWebhook,
            ].every((value) => value === WEBHOOK_SETTING.ENABLED);

            if (!enabled && !settingsRequested) {
              await client.enableNotifications(signal);
              settingsRequested = true;

              if (!signal.aborted) setNotice(NOTIFICATION_SETTINGS_NOTICE);
            }

            settingsReady = true;
          }

          const notification = await client.receiveNotification(signal);

          if (signal.aborted) return;

          if (notification) {
            const warning = handler.current(notification);

            if (warning) setDeliveryErrorMessage(warning);

            await client.acknowledgeNotification(
              notification.receiptId,
              signal,
            );
          }

          if (signal.aborted) return;

          setState(CONNECTION_STATE.ONLINE);
          setErrorMessage("");
        } catch (reason) {
          if (signal.aborted) return;

          setState(CONNECTION_STATE.ERROR);

          setErrorMessage(
            reason instanceof Error
              ? reason.message
              : RECEIVE_ERROR_MESSAGES.RECEIVE_FAILED,
          );

          await pause();
        }
      }
    }

    void run();

    return () => controller.abort();
  }, [client]);

  return { state, errorMessage, notice, deliveryErrorMessage };
}
