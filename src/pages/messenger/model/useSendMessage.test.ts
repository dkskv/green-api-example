// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";

import { expect, it, vi } from "vitest";

import { type ChatMessage } from "@/entities/message";

import { useSendMessage } from "./useSendMessage";

import { setup, deferred } from "./testing/setupMessengerTest";

it("отслеживает параллельные отправки по чатам и добавляет поздний ответ в исходный чат", async () => {
  const { messageCacheController, client, getMessages, wrapper } = setup();
  const response = deferred<ChatMessage>();

  vi.spyOn(client, "sendMessage").mockImplementation((id) =>
    id === "a"
      ? response.promise
      : Promise.resolve({
          id: "b-message",
          text: "other",
          direction: "outgoing",
          timestamp: 0,
        }),
  );

  const { result, rerender } = renderHook(
    ({ chatId }) => useSendMessage(client, messageCacheController, chatId),
    { initialProps: { chatId: "a" }, wrapper },
  );
  let sent!: Promise<boolean>;

  act(() => {
    sent = result.current.sendMessage("hello");
  });

  await waitFor(() => expect(result.current.sending).toBe(true));
  rerender({ chatId: "b" });
  expect(result.current.sending).toBe(false);

  await act(async () => {
    expect(await result.current.sendMessage("other")).toBe(true);
  });

  rerender({ chatId: "a" });
  expect(result.current.sending).toBe(true);

  await act(async () => {
    response.resolve({
      id: "a-message",
      text: "hello",
      direction: "outgoing",
      timestamp: 0,
    });

    await sent;
  });

  await waitFor(() => expect(result.current.sending).toBe(false));
  expect(getMessages("a")[0]?.id).toBe("a-message");
  expect(getMessages("b")[0]?.id).toBe("b-message");
});

it("показывает ошибку отправки только в её чате и не повторяет запрос", async () => {
  const { messageCacheController, client, getMessages, wrapper } = setup();

  vi.spyOn(client, "sendMessage").mockRejectedValue(new Error("send failed"));
  const { result, rerender } = renderHook(
    ({ chatId }) => useSendMessage(client, messageCacheController, chatId),
    { initialProps: { chatId: "a" }, wrapper },
  );

  await act(async () => {
    expect(await result.current.sendMessage("draft")).toBe(false);
  });

  await waitFor(() =>
    expect(result.current.sendError?.message).toBe("send failed"),
  );

  expect(client.sendMessage).toHaveBeenCalledTimes(1);
  expect(getMessages("a")).toEqual([]);
  rerender({ chatId: "b" });
  expect(result.current.sendError).toBeNull();
});
