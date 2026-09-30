// @vitest-environment jsdom
import { useChatNotificationHandler } from "./useChatNotificationHandler";

import { act, renderHook } from "@testing-library/react";

import { expect, it } from "vitest";

import { type ChatMessage } from "@/entities/message";
import { type ChatState } from "@/entities/message";
import { chatHistoryKey } from "./messageCacheController";

import { setup } from "./testing/setupMessengerTest";

it("сохраняет ожидающие статусы только для неизвестных сообщений и очищает их при удалении", () => {
  const { messageCacheController, queryClient, getMessages, wrapper } = setup();
  const { result } = renderHook(
    () => useChatNotificationHandler(messageCacheController),
    {
      wrapper,
    },
  );
  const message: ChatMessage = {
    id: "1",
    text: "hello",
    direction: "outgoing",
    timestamp: 1,
    status: "sent",
  };

  act(() => {
    result.current.onNotification({
      type: "messageStatusChanged",
      chatId: "a",
      messageId: "1",
      status: "read",
    });

    result.current.onNotification({
      type: "messageReceived",
      chatId: "a",
      message,
    });
  });

  act(() =>
    result.current.onNotification({
      type: "messageStatusChanged",
      chatId: "a",
      messageId: "1",
      status: "sent",
    }),
  );

  expect(getMessages("a")).toEqual([{ ...message, status: "read" }]);

  expect(
    queryClient.getQueryData<ChatState>(chatHistoryKey("a"))?.pendingStatuses,
  ).toEqual({});

  act(() =>
    result.current.onNotification({
      type: "messageStatusChanged",
      chatId: "a",
      messageId: "unknown",
      status: "read",
    }),
  );

  expect(
    queryClient.getQueryData<ChatState>(chatHistoryKey("a"))?.pendingStatuses,
  ).toEqual({ unknown: "read" });

  act(() =>
    result.current.onNotification({
      type: "messageDeleted",
      chatId: "a",
      messageId: "unknown",
    }),
  );

  act(() =>
    result.current.onNotification({
      type: "messageDeleted",
      chatId: "a",
      messageId: "1",
    }),
  );

  expect(getMessages("a")).toEqual([]);

  expect(
    queryClient.getQueryData<ChatState>(chatHistoryKey("a"))?.pendingStatuses,
  ).toEqual({});

  expect(result.current.deliveryError).toBeNull();
});
