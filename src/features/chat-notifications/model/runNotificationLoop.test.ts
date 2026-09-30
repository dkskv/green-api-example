import { afterEach, expect, it, vi } from "vitest";
import { createChatClientMock } from "@/entities/chat/testing";
import { runNotificationLoop } from "./runNotificationLoop";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

it("повторяет получение после ошибки и подтверждает уведомление после обработки", async () => {
  vi.useFakeTimers();

  const controller = new AbortController();
  const client = createChatClientMock();
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
  const receive = vi
    .spyOn(client, "receiveNotification")
    .mockRejectedValueOnce(receiveError)
    .mockResolvedValueOnce(notification)
    .mockImplementationOnce(async () => {
      events.push("next receive");
      controller.abort();

      return null;
    });
  const onConnectionChange = vi.fn();
  const loop = runNotificationLoop({
    client,
    signal: controller.signal,
    onNotification: () => {
      events.push("handle");
    },
    onConnectionChange,
  });

  await vi.advanceTimersByTimeAsync(0);
  expect(receive).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1500);
  await loop;
  expect(events).toEqual(["handle", "acknowledge", "next receive"]);
  expect(acknowledge).toHaveBeenCalledWith(controller.signal);

  expect(
    onConnectionChange.mock.calls.map(([connection]) => connection.status),
  ).toEqual(["connecting", "error", "online"]);
});

it("не подтверждает уведомление при ошибке обработчика и обрабатывает повторную доставку", async () => {
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
  const onNotification = vi.fn().mockImplementationOnce(() => {
    throw new Error("handler failed");
  });
  const onConnectionChange = vi.fn();
  const loop = runNotificationLoop({
    client,
    signal: controller.signal,
    onNotification,
    onConnectionChange,
  });

  await vi.advanceTimersByTimeAsync(0);
  expect(acknowledge).not.toHaveBeenCalled();

  expect(onConnectionChange).toHaveBeenLastCalledWith({
    status: "error",
    error: new Error("handler failed"),
  });

  await vi.advanceTimersByTimeAsync(1500);
  await loop;
  expect(onNotification).toHaveBeenCalledTimes(2);
  expect(acknowledge).toHaveBeenCalledTimes(1);
});

it("подтверждает нерелевантные уведомления без вызова обработчика", async () => {
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
  });

  expect(onNotification).not.toHaveBeenCalled();
  expect(acknowledge).toHaveBeenCalledWith(controller.signal);
});

it("не подтверждает уведомление при отмене во время обработки", async () => {
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
  });

  expect(acknowledge).not.toHaveBeenCalled();
});
