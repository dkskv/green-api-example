import { WEBHOOK_SETTING, type GreenApiClient } from "@/shared/api/green-api";
import { RECEIVE_ERROR_MESSAGES } from "@/features/receive-messages/model/errors";

// Returns whether settings were changed during this preparation.
export async function prepareNotifications(
  client: GreenApiClient,
  signal: AbortSignal,
): Promise<boolean> {
  const settings = await client.getSettings(signal);

  signal.throwIfAborted();

  if (settings.webhookUrl.trim())
    throw new Error(RECEIVE_ERROR_MESSAGES.WEBHOOK_URL_CONFIGURED);

  const enabled = [
    settings.incomingWebhook,
    settings.outgoingWebhook,
    settings.outgoingMessageWebhook,
    settings.outgoingAPIMessageWebhook,
    settings.deletedMessageWebhook,
  ].every((value) => value === WEBHOOK_SETTING.ENABLED);

  if (enabled) return false;

  await client.enableNotifications(signal);

  return true;
}
