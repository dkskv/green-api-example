// @vitest-environment jsdom
import { useChatNotificationHandler } from "./useChatNotificationHandler";

import { act, renderHook, waitFor } from "@testing-library/react";

import { expect, it, vi } from "vitest";

import { type ChatMessage } from "@/entities/message";
import { emptyChatState } from "@/entities/message";
import { chatHistoryKey } from "./messageCacheController";

import { useChatNotifications } from "@/features/chat-notifications";
import { useChatHistory } from "./useChatHistory";
import { useActiveContact } from "./useActiveContact";
import { useSendMessage } from "./useSendMessage";

import { useDeleteMessage } from "./useDeleteMessage";

import { setup, deferred, snapshot } from "./testing/setupMessengerTest";

it.each(["notification", "mutation"])(
  "отменяет устаревшую историю после удаления через %s и обновляет её без потери событий",
  async (source) => {
    const {
      client,
      queryClient,
      messageCacheController,
      getMessages,
      wrapper,
    } = setup();
    const oldResponse = deferred<ChatMessage[]>();
    const freshResponse = deferred<ChatMessage[]>();

    client.getChatHistory
      .mockReturnValueOnce(oldResponse.promise)
      .mockReturnValueOnce(freshResponse.promise);

    client.deleteMessage.mockResolvedValue(undefined);
    const { result } = renderHook(
      () => ({
        history: useChatHistory(client, "a"),
        handler: useChatNotificationHandler(messageCacheController),
        deletion: useDeleteMessage(client, messageCacheController, "a"),
      }),
      { wrapper },
    );

    await waitFor(() => expect(client.getChatHistory).toHaveBeenCalledTimes(1));

    const oldSignal = client.getChatHistory.mock.calls[0][1];

    act(() =>
      messageCacheController.merge("a", [
        ...snapshot,
        { id: "live", text: "new", direction: "incoming", timestamp: 1 },
      ]),
    );

    act(() => {
      if (source === "notification")
        result.current.handler.onNotification({
          type: "messageDeleted",
          chatId: "a",
          messageId: "deleted",
        });
      else result.current.deletion.deleteMessage("deleted");
    });

    await waitFor(() => expect(client.getChatHistory).toHaveBeenCalledTimes(2));

    expect(oldSignal?.aborted).toBe(true);
    expect(getMessages("a").map((m) => m.id)).toEqual(["read", "live"]);

    await act(async () => {
      freshResponse.resolve([snapshot[1]]);
      await freshResponse.promise;
    });

    await waitFor(() => expect(result.current.history.isFetching).toBe(false));

    await act(async () => {
      oldResponse.resolve(snapshot);
      await oldResponse.promise;
    });

    expect(getMessages("a").map((m) => m.id)).toEqual(["read", "live"]);

    expect(queryClient.getQueryData(chatHistoryKey("a"))).toEqual({
      messages: getMessages("a"),
      pendingStatuses: {},
    });
  },
);

it("открывает чат до загрузки истории и позволяет отправить сообщение и повторить загрузку после ошибки", async () => {
  const { messageCacheController, client, wrapper } = setup();
  const response = deferred<ChatMessage[]>();

  client.resolveContact.mockResolvedValue({ phone: "12345678", chatId: "a" });

  client.getChatHistory
    .mockReturnValueOnce(response.promise)
    .mockResolvedValue(snapshot);

  client.sendMessage.mockResolvedValue({
    id: "sent",
    text: "hello",
    direction: "outgoing",
    timestamp: 1,
  });

  const { result } = renderHook(
    () => {
      const selection = useActiveContact(client);
      const chatId = selection.activeContact?.chatId;
      const historyQuery = useChatHistory(client, chatId);
      const messages = historyQuery.data?.messages ?? emptyChatState.messages;
      const send = useSendMessage(client, messageCacheController, chatId);

      return { selection, historyQuery, messages, send };
    },
    { wrapper },
  );

  expect(client.getChatHistory).not.toHaveBeenCalled();
  act(() => result.current.selection.selectContact("12345678"));

  await waitFor(() =>
    expect(result.current.selection.activeContact?.chatId).toBe("a"),
  );

  expect(result.current.selection.isPending).toBe(false);
  expect(result.current.historyQuery.isFetching).toBe(true);
  expect(client.getChatHistory).toHaveBeenCalledTimes(1);
  act(() => response.reject(new Error("History unavailable")));

  await waitFor(() => expect(result.current.historyQuery.isError).toBe(true));

  expect(result.current.selection.error).toBeNull();
  expect(result.current.selection.activeContact?.chatId).toBe("a");

  await act(async () => {
    expect(await result.current.send.sendMessage("hello")).toBe(true);
    await result.current.historyQuery.refetch();
  });

  await waitFor(() => expect(result.current.historyQuery.isSuccess).toBe(true));

  expect(result.current.messages.map(({ id }) => id)).toEqual([
    "deleted",
    "read",
    "sent",
  ]);

  expect(client.getChatHistory).toHaveBeenCalledTimes(2);
});

it.each([{ chatId: "a", description: "rejected" }, {}])(
  "передаёт ошибки доставки обработчику и подтверждает их: %j",
  async (details) => {
    const { messageCacheController, client, queryClient, wrapper } = setup();
    const acknowledge = vi.fn().mockResolvedValue(undefined);
    const event = { type: "deliveryFailed" as const, ...details };

    client.receiveNotification
      .mockResolvedValueOnce({ event, acknowledge })
      .mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(
      () => {
        const handler = useChatNotificationHandler(messageCacheController);
        const connection = useChatNotifications({
          client,
          onNotification: handler.onNotification,
        });

        return { connection, deliveryError: handler.deliveryError };
      },
      { wrapper },
    );

    await waitFor(() =>
      expect(result.current.connection).toEqual({ status: "online" }),
    );

    expect(result.current.deliveryError).toEqual(event);

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(acknowledge).toHaveBeenCalledTimes(1);
  },
);
