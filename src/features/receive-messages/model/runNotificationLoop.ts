import {
  type GreenApiClient,
  type GreenNotificationDto,
} from "@/shared/api/green-api";
import { runPolling } from "@/shared/lib/polling";
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

  await runPolling({
    signal,
    retryDelayMs: 1500,
    execute: async (signal) => {
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
    },
    onError: (reason) => {
      onConnectionChange({
        status: CONNECTION_STATE.ERROR,
        message:
          reason instanceof Error
            ? reason.message
            : RECEIVE_ERROR_MESSAGES.RECEIVE_FAILED,
      });
    },
  });
}
