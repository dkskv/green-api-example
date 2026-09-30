import { GreenApiClient, WEBHOOK_SETTING } from "@/shared/api/green-api";
import { i18n } from "@/shared/i18n";
import { GREEN_CHAT_ERROR_MESSAGES } from "./errors";

type Settings = Awaited<ReturnType<GreenApiClient["getSettings"]>>;

function notificationsEnabled(settings: Settings): boolean {
  if (settings.webhookUrl.trim())
    throw new Error(GREEN_CHAT_ERROR_MESSAGES.webhookUrlConfigured);

  return [
    settings.incomingWebhook,
    settings.outgoingWebhook,
    settings.outgoingMessageWebhook,
    settings.outgoingAPIMessageWebhook,
    settings.deletedMessageWebhook,
  ].every((value) => value === WEBHOOK_SETTING.ENABLED);
}

function waitForSettings(signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();

  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, 5000);

    signal.addEventListener("abort", abort, { once: true });
  });
}

/** Настраивает инстанс один раз и проверяет готовность перед открытием сессии. */
export async function initializeGreenApiSession(
  api: GreenApiClient,
  signal: AbortSignal,
): Promise<void> {
  signal.throwIfAborted();
  await api.validateSession(signal);
  const settings = await api.getSettings(signal);

  signal.throwIfAborted();

  if (notificationsEnabled(settings)) return;

  await api.enableNotifications(signal);

  // SetSettings перезапускает инстанс; сохранение настроек ещё не означает готовность.
  const readinessSignal = AbortSignal.any([
    signal,
    AbortSignal.timeout(5 * 60 * 1000),
  ]);

  try {
    while (true) {
      await waitForSettings(readinessSignal);

      try {
        const current = await api.getSettings(readinessSignal);

        if (!notificationsEnabled(current)) continue;

        await api.validateSession(readinessSignal);
        readinessSignal.throwIfAborted();

        return;
      } catch {
        readinessSignal.throwIfAborted();
      }
    }
  } catch (reason) {
    signal.throwIfAborted();

    if (readinessSignal.aborted)
      throw new Error(i18n.t("errors:greenApi.settingsTimeout"), {
        cause: reason,
      });

    throw reason;
  }
}
