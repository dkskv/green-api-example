import { useEffect, useRef, useState } from "react";
import {
  acknowledgeTelegramNotification,
  enableTelegramNotifications,
  getTelegramSettings,
  receiveTelegramNotification,
  type GreenApiCredentials,
  type GreenNotificationDto,
} from "@/shared/api/green-api";

type ConnectionState = "connecting" | "online" | "error";

export function useReceiveMessages(
  credentials: GreenApiCredentials,
  onNotification: (notification: GreenNotificationDto) => string | void,
) {
  const [state, setState] = useState<ConnectionState>("connecting");
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
            const settings = await getTelegramSettings(credentials, signal);

            if (settings.webhookUrl.trim())
              throw new Error(
                "Очистите webhookUrl в настройках GREEN API для HTTP-приёма.",
              );

            const enabled = [
              settings.incomingWebhook,
              settings.outgoingWebhook,
              settings.outgoingMessageWebhook,
              settings.outgoingAPIMessageWebhook,
              settings.deletedMessageWebhook,
            ].every((value) => value === "yes");

            if (!enabled && !settingsRequested) {
              await enableTelegramNotifications(credentials, signal);
              settingsRequested = true;

              if (!signal.aborted)
                setNotice(
                  "Уведомления включены. GREEN API применяет настройки и перезапускает инстанс — это может занять до 5 минут.",
                );
            }

            settingsReady = true;
          }

          const notification = await receiveTelegramNotification(
            credentials,
            signal,
          );

          if (signal.aborted) return;

          if (notification) {
            const warning = handler.current(notification);

            if (warning) setDeliveryErrorMessage(warning);

            await acknowledgeTelegramNotification(
              credentials,
              notification.receiptId,
              signal,
            );
          }

          if (signal.aborted) return;

          setState("online");
          setErrorMessage("");
        } catch (reason) {
          if (signal.aborted) return;

          setState("error");

          setErrorMessage(
            reason instanceof Error
              ? reason.message
              : "Ошибка приёма уведомлений.",
          );

          await pause();
        }
      }
    }

    void run();

    return () => controller.abort();
  }, [credentials]);

  return { state, errorMessage, notice, deliveryErrorMessage };
}
