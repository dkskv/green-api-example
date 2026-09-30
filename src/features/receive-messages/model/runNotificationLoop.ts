import { errorText } from "@/shared/lib/errorText";
import { type ChatClient } from "@/entities/chat";
import { type ChatEvent } from "@/entities/message";
import { runPolling } from "@/shared/lib/polling";
import { CONNECTION_STATE, type Connection } from "./connection";
import { RECEIVE_ERROR_MESSAGES } from "./errors";

type NotificationLoopOptions = {
  /** Клиент чата. */
  client: ChatClient;
  /** Сигнал остановки. */
  signal: AbortSignal;
  /** Обработка события. */
  onNotification: (notification: ChatEvent) => void;
  /** Обновление состояния соединения. */
  onConnectionChange: (connection: Connection) => void;
};

export async function runNotificationLoop({
  client,
  signal,
  onNotification,
  onConnectionChange,
}: NotificationLoopOptions): Promise<void> {
  if (signal.aborted) return;

  onConnectionChange({ status: CONNECTION_STATE.CONNECTING });

  await runPolling({
    signal,
    retryDelayMs: 1500,
    execute: async (signal) => {
      const notification = await client.receiveNotification(signal);

      if (signal.aborted) return;

      if (notification) {
        if (notification.event) onNotification(notification.event);

        if (signal.aborted) return;

        await notification.acknowledge(signal);
      }

      if (signal.aborted) return;

      onConnectionChange({ status: CONNECTION_STATE.ONLINE });
    },
    onError: (reason) => {
      onConnectionChange({
        status: CONNECTION_STATE.ERROR,
        message: errorText(reason, RECEIVE_ERROR_MESSAGES.receiveFailed),
      });
    },
  });
}
