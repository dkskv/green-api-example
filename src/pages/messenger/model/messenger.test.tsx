import { useChatNotificationHandler } from "./useChatNotificationHandler";
// @vitest-environment jsdom
import { useStore } from "zustand";
import { StrictMode, type PropsWithChildren } from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createChatClientMock } from "@/entities/chat/testing";
import { type ChatMessage } from "@/entities/message";
import { MessageStore } from "@/entities/message";
import { contactStore } from "@/features/green-api-session";
import { useChatNotifications } from "@/features/receive-messages";
import { useChatHistory } from "./useChatHistory";
import { useActiveContact } from "./useActiveContact";
import { useConversation } from "./useConversation";
import { type VerifiedContact } from "@/entities/contact";
import { useMessageActions } from "./useMessageActions";

const clients: QueryClient[] = [];

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const client = createChatClientMock();
  const store = new MessageStore();

  clients.push(queryClient);

  return {
    client,
    store,
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
    const { client, store, wrapper: Provider } = setup();

    client.getChatHistory.mockImplementation(() => new Promise(() => {}));
    const { unmount } = renderHook(() => useChatHistory(client, store, "a"), {
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

  it("reconciles a delayed snapshot with live deletions and delivery statuses", async () => {
    const { client, store, wrapper } = setup();
    const response = deferred<ChatMessage[]>();

    vi.spyOn(client, "getChatHistory").mockReturnValue(response.promise);
    renderHook(() => useChatHistory(client, store, "a"), { wrapper });
    store.remove("a", "deleted");

    store.updateMessageStatus("a", "read", "read");

    response.resolve(snapshot);

    await waitFor(() =>
      expect(store.getMessages("a")).toEqual([
        expect.objectContaining({ id: "read", status: "read" }),
      ]),
    );
  });

  it("cancels the old history request when switching chats", async () => {
    const { client, store, wrapper } = setup();
    let oldSignal: AbortSignal | undefined;

    vi.spyOn(client, "getChatHistory").mockImplementation((chatId, signal) => {
      if (chatId === "a") {
        oldSignal = signal;

        return new Promise(() => {});
      }

      return Promise.resolve(snapshot);
    });

    const { result, rerender } = renderHook(
      ({ chatId }) => useChatHistory(client, store, chatId),
      { initialProps: { chatId: "a" }, wrapper },
    );

    await waitFor(() => expect(oldSignal).toBeDefined());
    rerender({ chatId: "b" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(oldSignal?.aborted).toBe(true);
    expect(store.getMessages("a")).toEqual([]);
    expect(store.getMessages("b")).toHaveLength(2);
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
    const { client, store, wrapper } = setup();
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
        const conversation = useConversation(
          client,
          store,
          selection.activeContact?.chatId,
        );

        return { selection, conversation };
      },
      { wrapper },
    );

    expect(client.getChatHistory).not.toHaveBeenCalled();
    act(() => result.current.selection.selectContact("12345678"));

    await waitFor(() =>
      expect(result.current.selection.activeContact?.chatId).toBe("a"),
    );

    expect(result.current.selection.isPending).toBe(false);
    expect(result.current.conversation.history.isFetching).toBe(true);
    expect(client.getChatHistory).toHaveBeenCalledTimes(1);
    act(() => response.reject(new Error("History unavailable")));

    await waitFor(() =>
      expect(result.current.conversation.history.isError).toBe(true),
    );

    expect(result.current.selection.error).toBeNull();
    expect(result.current.selection.activeContact?.chatId).toBe("a");

    await act(async () => {
      expect(await result.current.conversation.sendMessage("hello")).toBe(true);
      await result.current.conversation.history.refetch();
    });

    await waitFor(() =>
      expect(result.current.conversation.history.isSuccess).toBe(true),
    );

    expect(result.current.conversation.messages.map(({ id }) => id)).toEqual([
      "deleted",
      "read",
      "sent",
    ]);

    expect(client.getChatHistory).toHaveBeenCalledTimes(2);
  });

  it("refreshes history on returning to a previously selected chat", async () => {
    const { client, store, wrapper } = setup();

    client.getChatHistory.mockResolvedValue([]);
    const { result, rerender } = renderHook(
      ({ chatId }) => useConversation(client, store, chatId),
      { initialProps: { chatId: "a" }, wrapper },
    );

    await waitFor(() => expect(result.current.history.isSuccess).toBe(true));
    rerender({ chatId: "b" });
    await waitFor(() => expect(client.getChatHistory).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.history.isSuccess).toBe(true));
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
    const { client, store, wrapper } = setup();
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
      ({ chatId }) => useMessageActions(client, store, chatId),
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
    expect(store.getMessages("a")[0]?.id).toBe("a-message");
    expect(store.getMessages("b")[0]?.id).toBe("b-message");
  });

  it("exposes a failed send only in its chat and does not retry it", async () => {
    const { client, store, wrapper } = setup();

    vi.spyOn(client, "sendMessage").mockRejectedValue(new Error("send failed"));
    const { result, rerender } = renderHook(
      ({ chatId }) => useMessageActions(client, store, chatId),
      { initialProps: { chatId: "a" }, wrapper },
    );

    await act(async () => {
      expect(await result.current.sendMessage("draft")).toBe(false);
    });

    await waitFor(() =>
      expect(result.current.sendError?.message).toBe("send failed"),
    );

    expect(client.sendMessage).toHaveBeenCalledTimes(1);
    expect(store.getMessages("a")).toEqual([]);
    rerender({ chatId: "b" });
    expect(result.current.sendError).toBeNull();
  });

  it("tracks multiple deletions and preserves an earlier request's late error", async () => {
    const { client, store, wrapper } = setup();
    const first = deferred<void>();
    const second = deferred<void>();

    store.merge("a", [
      { id: "first", text: "1", direction: "outgoing", timestamp: 1 },
      { id: "second", text: "2", direction: "outgoing", timestamp: 2 },
    ]);

    vi.spyOn(client, "deleteMessage").mockImplementation((_, id) =>
      id === "first" ? first.promise : second.promise,
    );

    const { result } = renderHook(() => useMessageActions(client, store, "a"), {
      wrapper,
    });

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

    expect(store.getMessages("a").map((message) => message.id)).toEqual([
      "first",
    ]);
  });
});

it("keeps empty message snapshots stable without an active or loaded chat", () => {
  const store = new MessageStore();
  const { result, rerender } = renderHook(
    ({ chatId }: { chatId?: string }) =>
      useStore(store.state, (state) => store.getMessages(chatId, state)),
    { initialProps: { chatId: undefined } as { chatId?: string } },
  );
  const empty = result.current;

  expect(empty).toEqual([]);
  rerender({ chatId: "missing" });
  expect(result.current).toBe(empty);
  act(() => store.merge("other", snapshot));
  expect(result.current).toBe(empty);
});

it("updates the Zustand subscription after live events and keeps sessions isolated", () => {
  const store = new MessageStore();
  const otherSession = new MessageStore();
  const { result } = renderHook(() =>
    useStore(store.state, (state) => store.getMessages("a", state)),
  );

  expect(result.current).toEqual([]);
  act(() => store.merge("a", snapshot));
  expect(result.current).toHaveLength(2);
  act(() => store.remove("a", "deleted"));
  expect(result.current.map((message) => message.id)).toEqual(["read"]);
  expect(otherSession.getMessages("a")).toEqual([]);
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
    const client = createChatClientMock();
    const store = new MessageStore();
    const merge = vi.spyOn(store, "merge");
    const acknowledge = vi.fn().mockResolvedValue(undefined);
    const event = { type: "deliveryFailed" as const, ...details };

    client.receiveNotification
      .mockResolvedValueOnce({ event, acknowledge })
      .mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => {
      const handler = useChatNotificationHandler(store);
      const { connection } = useChatNotifications({
        client,
        onNotification: handler.onNotification,
      });

      return { connection, deliveryErrorMessage: handler.deliveryErrorMessage };
    });

    await waitFor(() =>
      expect(result.current.connection).toEqual({ status: "online" }),
    );

    expect(result.current.deliveryErrorMessage).toBe(
      "chatId" in details
        ? "Failed to send a message to chat a: rejected"
        : "Failed to send a message to chat unknown: unknown error",
    );

    expect(merge).not.toHaveBeenCalled();
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

it("applies message notifications and preserves status and deletion across snapshots", () => {
  const store = new MessageStore();
  const { result } = renderHook(() => useChatNotificationHandler(store));
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

  expect(store.getMessages("a")).toEqual([{ ...message, status: "read" }]);

  act(() =>
    result.current.onNotification({
      type: "messageDeleted",
      chatId: "a",
      messageId: "1",
    }),
  );

  store.merge("a", [message]);
  expect(store.getMessages("a")).toEqual([]);
  expect(result.current.deliveryErrorMessage).toBe("");
});
