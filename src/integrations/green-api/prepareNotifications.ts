import { type GreenApiClient } from "./api/client";
import { WEBHOOK_SETTING } from "./api/constants";
import { GREEN_CHAT_ERRORS } from "./errors";

// Returns whether settings were changed during this preparation.
export async function prepareNotifications(
  client: GreenApiClient,
  signal: AbortSignal,
): Promise<boolean> {
  const settings = await client.getSettings(signal);

  signal.throwIfAborted();

  if (settings.webhookUrl.trim())
    throw new Error(GREEN_CHAT_ERRORS.WEBHOOK_URL_CONFIGURED);

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
