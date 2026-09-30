// @vitest-environment jsdom

import { StrictMode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";

import { type ChatMessage } from "@/entities/message";
import { type ChatState } from "@/entities/message";
import { chatHistoryKey } from "./messageCacheController";

import { useChatHistory } from "./useChatHistory";

import { setup, deferred, snapshot } from "./testing/setupMessengerTest";

it("загружает историю один раз в StrictMode и отменяет запрос при размонтировании", async () => {
  const { client, wrapper: Provider } = setup();

  client.getChatHistory.mockImplementation(() => new Promise(() => {}));
  const { unmount } = renderHook(() => useChatHistory(client, "a"), {
    wrapper: ({ children }) => (
      <StrictMode>
        <Provider>{children}</Provider>
      </StrictMode>
    ),
  });

  await waitFor(() => expect(client.getChatHistory).toHaveBeenCalledTimes(1));
  const signal = client.getChatHistory.mock.calls[0][1];

  expect(signal?.aborted).toBe(false);
  unmount();
  expect(signal?.aborted).toBe(true);
});

it("объединяет отложенную историю с новыми сообщениями и применяет ожидающие статусы", async () => {
  const { client, queryClient, messageCacheController, getMessages, wrapper } =
    setup();
  const response = deferred<ChatMessage[]>();

  client.getChatHistory.mockReturnValue(response.promise);
  renderHook(() => useChatHistory(client, "a"), { wrapper });
  await waitFor(() => expect(client.getChatHistory).toHaveBeenCalledTimes(1));

  act(() => {
    messageCacheController.updateStatus("a", "read", "read");

    messageCacheController.merge("a", [
      { id: "live", text: "new", direction: "incoming", timestamp: 1 },
    ]);
  });

  await act(async () => {
    response.resolve(snapshot);
    await response.promise;
  });

  await waitFor(() => expect(getMessages("a")).toHaveLength(3));
  expect(getMessages("a").find((m) => m.id === "read")?.status).toBe("read");

  expect(
    queryClient.getQueryData<ChatState>(chatHistoryKey("a"))?.pendingStatuses,
  ).toEqual({});
});

it("отменяет запрос прежней истории при переключении чата", async () => {
  const { client, getMessages, wrapper } = setup();
  let oldSignal: AbortSignal | undefined;

  vi.spyOn(client, "getChatHistory").mockImplementation((chatId, signal) => {
    if (chatId === "a") {
      oldSignal = signal;

      return new Promise(() => {});
    }

    return Promise.resolve(snapshot);
  });

  const { result, rerender } = renderHook(
    ({ chatId }) => useChatHistory(client, chatId),
    { initialProps: { chatId: "a" }, wrapper },
  );

  await waitFor(() => expect(oldSignal).toBeDefined());
  rerender({ chatId: "b" });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(oldSignal?.aborted).toBe(true);
  expect(getMessages("a")).toEqual([]);
  expect(getMessages("b")).toHaveLength(2);
});

it("обновляет историю при возврате к ранее выбранному чату", async () => {
  const { client, wrapper } = setup();

  client.getChatHistory.mockResolvedValue([]);
  const { result, rerender } = renderHook(
    ({ chatId }) => useChatHistory(client, chatId),
    { initialProps: { chatId: "a" }, wrapper },
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  rerender({ chatId: "b" });
  await waitFor(() => expect(client.getChatHistory).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  rerender({ chatId: "a" });
  await waitFor(() => expect(client.getChatHistory).toHaveBeenCalledTimes(3));

  expect(client.getChatHistory.mock.calls.map(([id]) => id)).toEqual([
    "a",
    "b",
    "a",
  ]);
});

it("обновляет подписчиков запросов после событий и изолирует сессии", async () => {
  const { client, messageCacheController, wrapper } = setup();
  const otherSession = new QueryClient();

  client.getChatHistory.mockResolvedValue([]);
  const { result } = renderHook(
    () => {
      const { data, isSuccess } = useChatHistory(client, "a");

      return { data, isSuccess };
    },
    { wrapper },
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  act(() => messageCacheController.merge("a", snapshot));
  await waitFor(() => expect(result.current.data?.messages).toHaveLength(2));
  act(() => messageCacheController.remove("a", "deleted"));

  await waitFor(() =>
    expect(result.current.data?.messages.map((m) => m.id)).toEqual(["read"]),
  );

  expect(client.getChatHistory).toHaveBeenCalledTimes(1);
  expect(otherSession.getQueryData(chatHistoryKey("a"))).toBeUndefined();
  otherSession.clear();
});
