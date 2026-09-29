import {
  type GreenApiClient,
  type GreenNotificationDto,
} from "@/shared/api/green-api";
import {
  CONNECTION_STATE,
  type Connection,
} from "@/features/receive-messages/model/connection";
import { RECEIVE_ERROR_MESSAGES } from "@/features/receive-messages/model/errors";
import { prepareNotifications } from "@/features/receive-messages/model/prepareNotifications";

type NotificationLoopOptions = {
  client: GreenApiClient;
  signal: AbortSignal;
  onNotification: (notification: GreenNotificationDto) => void;
  onConnectionChange: (connection: Connection) => void;
  onSettingsEnabled: () => void;
};

function pauseBeforeRetry(signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, 1500);

    signal.addEventListener("abort", finish, { once: true });

    if (signal.aborted) finish();
  });
}

export async function runNotificationLoop({
  client,
  signal,
  onNotification,
  onConnectionChange,
  onSettingsEnabled,
}: NotificationLoopOptions): Promise<void> {
  let prepared = false;

  if (signal.aborted) return;

  onConnectionChange({ status: CONNECTION_STATE.CONNECTING });

  while (!signal.aborted) {
    try {
      if (!prepared) {
        const changed = await prepareNotifications(client, signal);

        if (signal.aborted) return;

        // A polling failure must not repeat a successful settings update.
        prepared = true;

        if (changed) onSettingsEnabled();
      }

      const notification = await client.receiveNotification(signal);

      if (signal.aborted) return;

      if (notification) {
        onNotification(notification);

        if (signal.aborted) return;

        await client.acknowledgeNotification(notification.receiptId, signal);
      }

      if (signal.aborted) return;

      onConnectionChange({ status: CONNECTION_STATE.ONLINE });
    } catch (reason) {
      if (signal.aborted) return;

      onConnectionChange({
        status: CONNECTION_STATE.ERROR,
        message:
          reason instanceof Error
            ? reason.message
            : RECEIVE_ERROR_MESSAGES.RECEIVE_FAILED,
      });

      await pauseBeforeRetry(signal);
    }
  }
}
