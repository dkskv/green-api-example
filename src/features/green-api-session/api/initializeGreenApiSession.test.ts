import { afterEach, expect, it, vi } from "vitest";
import { GreenApiClient } from "@/shared/api/green-api";
import { initializeGreenApiSession } from "./initializeGreenApiSession";

const enabled = {
  webhookUrl: "",
  incomingWebhook: "yes",
  outgoingWebhook: "yes",
  outgoingMessageWebhook: "yes",
  outgoingAPIMessageWebhook: "yes",
  deletedMessageWebhook: "yes",
};
const disabled = { ...enabled, incomingWebhook: "no" };

function setup() {
  const api = new GreenApiClient({
    apiUrl: "https://example.com",
    instanceId: "1",
    apiToken: "test",
  });
  const validate = vi.spyOn(api, "validateSession").mockResolvedValue();
  const settings = vi.spyOn(api, "getSettings").mockResolvedValue(enabled);
  const update = vi.spyOn(api, "enableNotifications").mockResolvedValue();
  const receive = vi.spyOn(api, "receiveNotification");
  const controller = new AbortController();

  return {
    api,
    validate,
    settings,
    update,
    receive,
    controller,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it("проверяет настроенную сессию без изменения настроек и получения сообщений", async () => {
  const { api, validate, settings, update, receive, controller } = setup();

  await initializeGreenApiSession(api, controller.signal);
  expect(validate).toHaveBeenCalledWith(controller.signal);
  expect(settings).toHaveBeenCalledWith(controller.signal);
  expect(update).not.toHaveBeenCalled();
  expect(receive).not.toHaveBeenCalled();
});

it("отклоняет сессию с внешним вебхуком без изменения настроек", async () => {
  const { api, settings, update, controller } = setup();

  settings.mockResolvedValue({
    ...enabled,
    webhookUrl: "https://example.com/webhook",
  });

  await expect(
    initializeGreenApiSession(api, controller.signal),
  ).rejects.toThrow("WEBHOOK_URL_CONFIGURED");

  expect(update).not.toHaveBeenCalled();
});

it("обновляет настройки один раз и ожидает их включения и авторизации после перезапуска", async () => {
  vi.useFakeTimers();
  const { api, settings, validate, update, controller } = setup();

  settings
    .mockResolvedValueOnce(disabled)
    .mockResolvedValueOnce(disabled)
    .mockResolvedValue(enabled);

  validate
    .mockResolvedValueOnce()
    .mockRejectedValueOnce(new Error("restarting"))
    .mockResolvedValue();

  const done = vi.fn();
  const task = initializeGreenApiSession(api, controller.signal).then(done);

  await vi.advanceTimersByTimeAsync(10000);
  expect(update).toHaveBeenCalledTimes(1);
  expect(done).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(5000);
  await task;
  expect(done).toHaveBeenCalledTimes(1);
  expect(validate).toHaveBeenCalledTimes(3);
});

it("отменяет ожидание готовности без новых запросов", async () => {
  vi.useFakeTimers();
  const { api, settings, controller } = setup();

  settings.mockResolvedValue(disabled);
  const task = initializeGreenApiSession(api, controller.signal);
  const rejected = expect(task).rejects.toMatchObject({ name: "AbortError" });

  await vi.advanceTimersByTimeAsync(0);
  controller.abort();
  await rejected;
  await vi.advanceTimersByTimeAsync(10000);
  expect(settings).toHaveBeenCalledTimes(1);
});

it("завершает инициализацию с ошибкой по истечении времени ожидания готовности", async () => {
  vi.useFakeTimers();
  const { api, settings, controller } = setup();
  const timeout = new AbortController();

  vi.spyOn(AbortSignal, "timeout").mockReturnValue(timeout.signal);
  settings.mockResolvedValue(disabled);
  const task = initializeGreenApiSession(api, controller.signal);
  const rejected = expect(task).rejects.toThrow("SETTINGS_TIMEOUT");

  await vi.advanceTimersByTimeAsync(0);
  expect(AbortSignal.timeout).toHaveBeenCalledWith(300000);
  timeout.abort();
  await rejected;
});
