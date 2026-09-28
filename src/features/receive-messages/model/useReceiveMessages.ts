import { useEffect, useRef, useState } from "react";
import { mapGreenMessage, type ChatMessage } from "../../../entities/message";
import {
  acknowledgeTelegramNotification,
  getTelegramSettings,
  receiveTelegramNotification,
  type GreenApiCredentials,
} from "../../../shared/api/green-api";

type ConnectionState = "idle" | "connecting" | "online" | "error";

export function useReceiveMessages(
  credentials: GreenApiCredentials,
  chatId: string,
  onMessage: (message: ChatMessage) => void,
) {
  const [state, setState] = useState<ConnectionState>("connecting");
  const [error, setError] = useState("");
  const messageHandler = useRef(onMessage);

  useEffect(() => {
    messageHandler.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!chatId) return;

    const controller = new AbortController();
    let stopped = false;

    async function run(): Promise<void> {
      setState("connecting");
      try {
        const settings = await getTelegramSettings(
          credentials,
          controller.signal,
        );
        if (settings.webhookUrl?.trim()) {
          throw new Error(
            "Очистите webhookUrl в настройках Green API для HTTP-приёма.",
          );
        }
        if (settings.incomingWebhook !== "yes") {
          throw new Error(
            "Включите «Получать уведомления о входящих сообщениях и файлах» (incomingWebhook = yes).",
          );
        }

        while (!stopped) {
          const notification = await receiveTelegramNotification(
            credentials,
            controller.signal,
          );
          if (!notification) {
            setState("online");
            setError("");
            continue;
          }
          if (
            notification.status === "error" ||
            (!notification.body && notification.message)
          ) {
            throw new Error(
              notification.message ??
                notification.code ??
                "Ошибка ReceiveNotification.",
            );
          }
          const body = notification.body;
          if (
            body?.typeWebhook === "incomingMessageReceived" &&
            body.senderData?.chatId === chatId
          ) {
            messageHandler.current(
              mapGreenMessage(
                {
                  idMessage: body.idMessage,
                  type: "incoming",
                  timestamp: body.timestamp,
                  messageData: body.messageData,
                },
                0,
              ),
            );
          }
          if (notification.receiptId !== undefined) {
            await acknowledgeTelegramNotification(
              credentials,
              notification.receiptId,
              controller.signal,
            );
          }
          setState("online");
          setError("");
        }
      } catch (reason) {
        if (
          stopped ||
          (reason instanceof DOMException && reason.name === "AbortError")
        )
          return;
        setState("error");
        setError(
          reason instanceof Error
            ? reason.message
            : "Ошибка приёма уведомлений.",
        );
        if (!controller.signal.aborted) {
          await new Promise((resolve) => window.setTimeout(resolve, 1500));
          if (!stopped) void run();
        }
      }
    }

    void run();
    return () => {
      stopped = true;
      controller.abort();
    };
  }, [credentials, chatId]);

  return { state: chatId ? state : "idle", error: chatId ? error : "" };
}
