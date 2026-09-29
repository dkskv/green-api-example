import { afterEach, expect, it, vi } from "vitest";
import { createChatClientMock } from "@/entities/chat/testing";
import { runNotificationLoop } from "./runNotificationLoop";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

it("retries preparation, then preserves it across receive failures and acknowledges after handling", async () => {
  vi.useFakeTimers();

  const controller = new AbortController();
  const client = createChatClientMock();
  const preparationError = new Error("settings unavailable");
  const receiveError = new Error("receive unavailable");
  const acknowledge = vi.fn(async () => {
    events.push("acknowledge");
  });
  const notification = {
    event: {
      type: "messageDeleted" as const,
      chatId: "chat",
      messageId: "message",
    },
    acknowledge,
  };
  const events: string[] = [];
  const prepare = client.prepareNotifications
    .mockRejectedValueOnce(preparationError)
    .mockResolvedValue("Settings enabled");
  const receive = vi
    .spyOn(client, "receiveNotification")
    .mockRejectedValueOnce(receiveError)
    .mockResolvedValueOnce(notification)
    .mockImplementationOnce(async () => {
      events.push("next receive");
      controller.abort();

      return null;
    });
  const onNotice = vi.fn();
  const onConnectionChange = vi.fn();
  const loop = runNotificationLoop({
    client,
    signal: controller.signal,
    onNotification: () => {
      events.push("handle");
    },
    onConnectionChange,
    onNotice,
  });

  await vi.advanceTimersByTimeAsync(0);
  expect(receive).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1500);
  expect(receive).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1500);
  await loop;
  expect(prepare).toHaveBeenCalledTimes(2);
  expect(onNotice).toHaveBeenCalledTimes(1);
  expect(events).toEqual(["handle", "acknowledge", "next receive"]);
  expect(acknowledge).toHaveBeenCalledWith(controller.signal);

  expect(
    onConnectionChange.mock.calls.map(([connection]) => connection.status),
  ).toEqual(["connecting", "error", "error", "online"]);
});

it("does not acknowledge a failed handler and processes redelivery before acknowledging", async () => {
  vi.useFakeTimers();
  const client = createChatClientMock();
  const controller = new AbortController();
  const acknowledge = vi.fn(async () => {
    controller.abort();
  });
  const event = {
    type: "messageDeleted" as const,
    chatId: "chat",
    messageId: "message",
  };

  client.receiveNotification.mockResolvedValue({ event, acknowledge });
  const onNotification = vi
    .fn()
    .mockRejectedValueOnce(new Error("handler failed"))
    .mockResolvedValue(undefined);
  const onConnectionChange = vi.fn();
  const loop = runNotificationLoop({
    client,
    signal: controller.signal,
    onNotification,
    onConnectionChange,
    onNotice: vi.fn(),
  });

  await vi.advanceTimersByTimeAsync(0);
  expect(acknowledge).not.toHaveBeenCalled();

  expect(onConnectionChange).toHaveBeenLastCalledWith({
    status: "error",
    message: "handler failed",
  });

  await vi.advanceTimersByTimeAsync(1500);
  await loop;
  expect(onNotification).toHaveBeenCalledTimes(2);
  expect(acknowledge).toHaveBeenCalledTimes(1);
});

it("acknowledges irrelevant deliveries without passing them to the handler", async () => {
  const client = createChatClientMock();
  const controller = new AbortController();
  const acknowledge = vi.fn(async () => {
    controller.abort();
  });

  client.receiveNotification.mockResolvedValue({ event: null, acknowledge });
  const onNotification = vi.fn();

  await runNotificationLoop({
    client,
    signal: controller.signal,
    onNotification,
    onConnectionChange: vi.fn(),
    onNotice: vi.fn(),
  });

  expect(onNotification).not.toHaveBeenCalled();
  expect(acknowledge).toHaveBeenCalledWith(controller.signal);
});

it("does not acknowledge when cancelled during handling", async () => {
  const client = createChatClientMock();
  const controller = new AbortController();
  const acknowledge = vi.fn();

  client.receiveNotification.mockResolvedValue({
    event: { type: "messageDeleted", chatId: "chat", messageId: "message" },
    acknowledge,
  });

  await runNotificationLoop({
    client,
    signal: controller.signal,
    onNotification: () => controller.abort(),
    onConnectionChange: vi.fn(),
    onNotice: vi.fn(),
  });

  expect(acknowledge).not.toHaveBeenCalled();
});
