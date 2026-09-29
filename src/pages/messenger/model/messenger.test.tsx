// @vitest-environment jsdom
import { useStore } from "zustand";
import { type PropsWithChildren } from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createChatClientMock } from "@/entities/chat/testing/createChatClientMock";
import { type ChatMessage } from "@/entities/message";
import { MessageStore, emptyMessages } from "@/entities/message";
import { contactStore } from "@/features/session";
import { useChatHistory } from "@/pages/messenger/model/useChatHistory";
import { useOpenChat } from "@/pages/messenger/model/useOpenChat";
import { useMessageActions } from "@/pages/messenger/model/useMessageActions";

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
  it("reconciles a delayed snapshot with live deletions and delivery statuses", async () => {
    const { client, store, wrapper } = setup();
    const response = deferred<ChatMessage[]>();

    vi.spyOn(client, "getChatHistory").mockReturnValue(response.promise);
    renderHook(() => useChatHistory(client, store, "a"), { wrapper });
    store.remove("a", "deleted");

    store.receive({
      type: "messageStatusChanged",
      chatId: "a",
      messageId: "read",
      status: "read",
    });

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

    rerender({ chatId: "b" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(oldSignal?.aborted).toBe(true);
    expect(store.getMessages("a")).toEqual([]);
    expect(store.getMessages("b")).toHaveLength(2);
  });
});

describe("opening chats", () => {
  it("only selects and persists the latest opening when responses arrive out of order", async () => {
    const { client, store, wrapper } = setup();
    const first = deferred<ChatMessage[]>();
    const second = deferred<ChatMessage[]>();
    const onOpen = vi.fn(contactStore.save);

    vi.spyOn(client, "resolveContact").mockImplementation(async (phone) => ({
      phone: "12345678",
      chatId: String(phone),
    }));

    vi.spyOn(client, "getChatHistory").mockImplementation((id) =>
      id === "12345678" ? first.promise : second.promise,
    );

    const { result } = renderHook(() => useOpenChat(client, store, onOpen), {
      wrapper,
    });

    act(() => result.current.openChat("12345678"));
    await waitFor(() => expect(client.getChatHistory).toHaveBeenCalledTimes(1));
    act(() => result.current.openChat("87654321"));
    await waitFor(() => expect(client.getChatHistory).toHaveBeenCalledTimes(2));

    await act(async () => {
      second.resolve([]);
      await second.promise;
    });

    await waitFor(() => expect(onOpen).toHaveBeenCalledTimes(1));

    await act(async () => {
      first.resolve([]);
      await first.promise;
    });

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(contactStore.state.getState().contact?.chatId).toBe("87654321");
  });

  it("does not restore a saved chat after the page has unmounted", async () => {
    const { client, store, wrapper } = setup();
    const response = deferred<ChatMessage[]>();
    const onOpen = vi.fn(contactStore.save);

    vi.spyOn(client, "resolveContact").mockResolvedValue({
      phone: "12345678",
      chatId: "a",
    });

    vi.spyOn(client, "getChatHistory").mockReturnValue(response.promise);
    const { result, unmount } = renderHook(
      () => useOpenChat(client, store, onOpen),
      { wrapper },
    );

    act(() => result.current.openChat("12345678"));
    await waitFor(() => expect(client.getChatHistory).toHaveBeenCalled());
    unmount();

    await act(async () => {
      response.resolve([]);
      await response.promise;
    });

    expect(onOpen).not.toHaveBeenCalled();
    expect(contactStore.state.getState().contact).toBeNull();
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

it("updates the Zustand subscription after live events and keeps sessions isolated", () => {
  const store = new MessageStore();
  const otherSession = new MessageStore();
  const { result } = renderHook(() =>
    useStore(store.state, (state) => state.chats.a?.messages ?? emptyMessages),
  );

  expect(result.current).toEqual([]);
  act(() => store.merge("a", snapshot));
  expect(result.current).toHaveLength(2);
  act(() => store.remove("a", "deleted"));
  expect(result.current.map((message) => message.id)).toEqual(["read"]);
  expect(otherSession.getMessages("a")).toEqual([]);
});
