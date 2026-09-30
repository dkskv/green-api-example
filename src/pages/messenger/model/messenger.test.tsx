import { useChatNotificationHandler } from "./useChatNotificationHandler";
// @vitest-environment jsdom
import { StrictMode, type PropsWithChildren } from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createChatClientMock } from "@/entities/chat/testing";
import { type ChatMessage } from "@/entities/message";
import { type ChatState, emptyChatState } from "@/entities/message";
import {
  MessageCacheController,
  chatHistoryKey,
} from "./messageCacheController";
import { contactStore } from "@/features/green-api-session";
import { useChatNotifications } from "@/features/chat-notifications";
import { useChatHistory } from "./useChatHistory";
import { useActiveContact } from "./useActiveContact";
import { useSendMessage } from "./useSendMessage";
import { type VerifiedContact } from "@/entities/contact";
import { useDeleteMessage } from "./useDeleteMessage";

const clients: QueryClient[] = [];

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const messageCacheController = new MessageCacheController(queryClient);
  const client = createChatClientMock();
  const getMessages = (chatId: string) =>
    queryClient.getQueryData<ChatState>(chatHistoryKey(chatId))?.messages ??
    emptyChatState.messages;

  clients.push(queryClient);

  return {
    client,
    getMessages,
    messageCacheController,
    queryClient,
    wrapper: ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });

  return { promise, resolve, reject };
}

const snapshot: ChatMessage[] = [
  {
    id: "deleted",
    direction: "outgoing",
    status: "sent",
    text: "old",
    timestamp: 0,
  },
  {
    id: "read",
    direction: "outgoing",
    status: "sent",
    text: "hello",
    timestamp: 0,
  },
];

afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
  contactStore.clear();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("chat history", () => {
  it("loads history once in StrictMode and cancels it on unmount", async () => {
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

  it("merges delayed history with live messages and consumes pending statuses", async () => {
    const {
      client,
      queryClient,
      messageCacheController,
      getMessages,
      wrapper,
    } = setup();
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

  it.each(["notification", "mutation"])(
    "cancels stale history after deletion via %s and reloads without losing live events",
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

      await waitFor(() =>
        expect(client.getChatHistory).toHaveBeenCalledTimes(1),
      );

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

      await waitFor(() =>
        expect(client.getChatHistory).toHaveBeenCalledTimes(2),
      );

      expect(oldSignal?.aborted).toBe(true);
      expect(getMessages("a").map((m) => m.id)).toEqual(["read", "live"]);

      await act(async () => {
        freshResponse.resolve([snapshot[1]]);
        await freshResponse.promise;
      });

      await waitFor(() =>
        expect(result.current.history.isFetching).toBe(false),
      );

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

  it("cancels the old history request when switching chats", async () => {
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
});

describe("contact selection", () => {
  it("only persists the latest verification when responses arrive out of order", async () => {
    const { client, wrapper } = setup();
    const first = deferred<VerifiedContact>();
    const second = deferred<VerifiedContact>();

    client.resolveContact.mockImplementation((phone) =>
      phone === "12345678" ? first.promise : second.promise,
    );

    const { result } = renderHook(() => useActiveContact(client), { wrapper });

    act(() => result.current.selectContact("12345678"));
    await waitFor(() => expect(client.resolveContact).toHaveBeenCalledTimes(1));
    act(() => result.current.selectContact("87654321"));
    await waitFor(() => expect(client.resolveContact).toHaveBeenCalledTimes(2));

    await act(async () => {
      second.resolve({ phone: "87654321", chatId: "b" });
      await second.promise;
    });

    await waitFor(() => expect(result.current.activeContact?.chatId).toBe("b"));

    await act(async () => {
      first.resolve({ phone: "12345678", chatId: "a" });
      await first.promise;
    });

    expect(result.current.activeContact?.chatId).toBe("b");
    contactStore.state.persist.rehydrate();
    expect(contactStore.state.getState().contact?.chatId).toBe("b");
    expect(client.getChatHistory).not.toHaveBeenCalled();
  });

  it("does not select a contact after unmounting", async () => {
    const { client, wrapper } = setup();
    const response = deferred<VerifiedContact>();

    client.resolveContact.mockReturnValue(response.promise);
    const { result, unmount } = renderHook(() => useActiveContact(client), {
      wrapper,
    });

    act(() => result.current.selectContact("12345678"));
    await waitFor(() => expect(client.resolveContact).toHaveBeenCalled());
    unmount();

    await act(async () => {
      response.resolve({ phone: "12345678", chatId: "a" });
      await response.promise;
    });

    contactStore.state.persist.rehydrate();
    expect(contactStore.state.getState().contact).toBeNull();
  });

  it("keeps the current contact when verification fails", async () => {
    const { client, wrapper } = setup();
    const previous = { phone: "12345678", chatId: "a" };

    contactStore.save(previous);
    client.resolveContact.mockRejectedValue(new Error("Contact unavailable"));
    const { result } = renderHook(() => useActiveContact(client), { wrapper });

    act(() => result.current.selectContact("87654321"));

    await waitFor(() =>
      expect(result.current.error?.message).toBe("Contact unavailable"),
    );

    expect(result.current.activeContact).toEqual(previous);
  });

  it("opens before history arrives and can send and retry after a history failure", async () => {
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

    await waitFor(() =>
      expect(result.current.historyQuery.isSuccess).toBe(true),
    );

    expect(result.current.messages.map(({ id }) => id)).toEqual([
      "deleted",
      "read",
      "sent",
    ]);

    expect(client.getChatHistory).toHaveBeenCalledTimes(2);
  });

  it("refreshes history on returning to a previously selected chat", async () => {
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
});

describe("message actions", () => {
  it("tracks concurrent sends by chat and applies late success to the original chat", async () => {
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

  it("exposes a failed send only in its chat and does not retry it", async () => {
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

  it("tracks multiple deletions and preserves an earlier request's late error", async () => {
    const { client, messageCacheController, getMessages, wrapper } = setup();
    const first = deferred<void>();
    const second = deferred<void>();

    messageCacheController.merge("a", [
      { id: "first", text: "1", direction: "outgoing", timestamp: 1 },
      { id: "second", text: "2", direction: "outgoing", timestamp: 2 },
    ]);

    vi.spyOn(client, "deleteMessage").mockImplementation((_, id) =>
      id === "first" ? first.promise : second.promise,
    );

    const { result } = renderHook(
      () => useDeleteMessage(client, messageCacheController, "a"),
      {
        wrapper,
      },
    );

    act(() => {
      result.current.deleteMessage("first");
      result.current.deleteMessage("second");
    });

    await waitFor(() =>
      expect(result.current.deletingIds).toEqual(["first", "second"]),
    );

    await act(async () => {
      second.resolve();
      await second.promise;
    });

    await waitFor(() => expect(result.current.deletingIds).toEqual(["first"]));
    act(() => first.reject(new Error("delete failed")));

    await waitFor(() =>
      expect(result.current.deleteError?.message).toBe("delete failed"),
    );

    expect(getMessages("a").map((message) => message.id)).toEqual(["first"]);
  });
});

it("updates query subscribers after live events and keeps sessions isolated", async () => {
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

it("starts notification loading once in StrictMode and stops on unmount", async () => {
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

it.each([{ chatId: "a", description: "rejected" }, {}])(
  "routes delivery failures to their handler and acknowledges them: %j",
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

it("routes message events to the latest handler without restarting polling", async () => {
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

it("keeps only unknown message statuses and removes pending statuses on deletion", () => {
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
