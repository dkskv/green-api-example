import { afterEach, expect, it, vi } from "vitest";
import { GreenApiClient } from "@/shared/api/green-api";
import { GreenApiChatClient } from "./GreenApiChatClient";

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
    client: new GreenApiChatClient(api),
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

it("checks an already configured session without changing settings or receiving messages", async () => {
  const { client, validate, settings, update, receive, controller } = setup();

  await client.initializeSession(controller.signal);
  expect(validate).toHaveBeenCalledWith(controller.signal);
  expect(settings).toHaveBeenCalledWith(controller.signal);
  expect(update).not.toHaveBeenCalled();
  expect(receive).not.toHaveBeenCalled();
});

it("rejects an external webhook without changing its settings", async () => {
  const { client, settings, update, controller } = setup();

  settings.mockResolvedValue({
    ...enabled,
    webhookUrl: "https://example.com/webhook",
  });

  await expect(client.initializeSession(controller.signal)).rejects.toThrow(
    "Clear webhookUrl",
  );

  expect(update).not.toHaveBeenCalled();
});

it("updates once and waits for both enabled settings and authorization after restart", async () => {
  vi.useFakeTimers();
  const { client, settings, validate, update, controller } = setup();

  settings
    .mockResolvedValueOnce(disabled)
    .mockResolvedValueOnce(disabled)
    .mockResolvedValue(enabled);

  validate
    .mockResolvedValueOnce()
    .mockRejectedValueOnce(new Error("restarting"))
    .mockResolvedValue();

  const done = vi.fn();
  const task = client.initializeSession(controller.signal).then(done);

  await vi.advanceTimersByTimeAsync(10000);
  expect(update).toHaveBeenCalledTimes(1);
  expect(done).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(5000);
  await task;
  expect(done).toHaveBeenCalledTimes(1);
  expect(validate).toHaveBeenCalledTimes(3);
});

it("cancels readiness waiting without further requests", async () => {
  vi.useFakeTimers();
  const { client, settings, controller } = setup();

  settings.mockResolvedValue(disabled);
  const task = client.initializeSession(controller.signal);
  const rejected = expect(task).rejects.toMatchObject({ name: "AbortError" });

  await vi.advanceTimersByTimeAsync(0);
  controller.abort();
  await rejected;
  await vi.advanceTimersByTimeAsync(10000);
  expect(settings).toHaveBeenCalledTimes(1);
});

it("fails session initialization when readiness times out", async () => {
  vi.useFakeTimers();
  const { client, settings, controller } = setup();
  const timeout = new AbortController();

  vi.spyOn(AbortSignal, "timeout").mockReturnValue(timeout.signal);
  settings.mockResolvedValue(disabled);
  const task = client.initializeSession(controller.signal);
  const rejected = expect(task).rejects.toThrow("within 5 minutes");

  await vi.advanceTimersByTimeAsync(0);
  expect(AbortSignal.timeout).toHaveBeenCalledWith(300000);
  timeout.abort();
  await rejected;
});
