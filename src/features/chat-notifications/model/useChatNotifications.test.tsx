// @vitest-environment jsdom
import { StrictMode } from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { createChatClientMock } from "@/entities/chat/testing";
import { useChatNotifications } from "./useChatNotifications";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("запускает получение уведомлений один раз в StrictMode и отменяет при размонтировании", async () => {
  const client = createChatClientMock();

  client.receiveNotification.mockImplementation(() => new Promise(() => {}));
  const { unmount } = renderHook(
    () =>
      useChatNotifications({
        client,
        onNotification: () => {},
      }),
    {
      wrapper: ({ children }) => <StrictMode>{children}</StrictMode>,
    },
  );

  await waitFor(() =>
    expect(client.receiveNotification).toHaveBeenCalledTimes(1),
  );

  const signal = client.receiveNotification.mock.calls[0][0];

  expect(signal.aborted).toBe(false);
  unmount();
  expect(signal.aborted).toBe(true);
});

it("передаёт события актуальному обработчику без перезапуска опроса", async () => {
  const client = createChatClientMock();
  const event = {
    type: "messageDeleted" as const,
    chatId: "a",
    messageId: "1",
  };
  const acknowledge = vi.fn().mockResolvedValue(undefined);
  let deliver!: (value: {
    event: typeof event;
    acknowledge: typeof acknowledge;
  }) => void;

  client.receiveNotification
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          deliver = resolve;
        }),
    )
    .mockImplementation(() => new Promise(() => {}));

  const originalHandler = vi.fn();
  const latestHandler = vi.fn();
  const { rerender } = renderHook(
    ({ onNotification }) => useChatNotifications({ client, onNotification }),
    { initialProps: { onNotification: originalHandler } },
  );

  await waitFor(() =>
    expect(client.receiveNotification).toHaveBeenCalledTimes(1),
  );

  rerender({ onNotification: latestHandler });
  expect(client.receiveNotification).toHaveBeenCalledTimes(1);

  await act(async () => {
    deliver({ event, acknowledge });
  });

  expect(latestHandler).toHaveBeenCalledExactlyOnceWith(event);
  expect(originalHandler).not.toHaveBeenCalled();
  expect(acknowledge).toHaveBeenCalledTimes(1);
});
