// @vitest-environment jsdom
import { type PropsWithChildren } from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GreenApiClient, type GreenMessageDto } from "@/shared/api/green-api";
import { MessageStore } from "@/entities/message";
import { readSavedChat } from "@/features/session";
import { useChatHistory } from "@/pages/messenger/model/useChatHistory";
import { useOpenChat } from "@/pages/messenger/model/useOpenChat";
import { useMessageActions } from "@/pages/messenger/model/useMessageActions";

const clients: QueryClient[] = [];

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const client = new GreenApiClient({
    apiUrl: "https://example.com",
    instanceId: "1",
    apiToken: "test",
  });
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

const snapshot: GreenMessageDto[] = [
  {
    idMessage: "deleted",
    type: "outgoing",
    statusMessage: "sent",
    textMessage: "old",
  },
  {
    idMessage: "read",
    type: "outgoing",
    statusMessage: "sent",
    textMessage: "hello",
  },
];

afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("chat history", () => {
  it("reconciles a delayed snapshot with live deletions and delivery statuses", async () => {
    const { client, store, wrapper } = setup();
    const response = deferred<GreenMessageDto[]>();

    vi.spyOn(client, "getChatHistory").mockReturnValue(response.promise);
    renderHook(() => useChatHistory(client, store, "a"), { wrapper });
    store.remove("a", "deleted");

    store.receive({
      receiptId: 1,
      body: {
        typeWebhook: "outgoingMessageStatus",
        chatId: "a",
        idMessage: "read",
        status: "read",
      },
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
    const first = deferred<GreenMessageDto[]>();
    const second = deferred<GreenMessageDto[]>();
    const onOpen = vi.fn();

    vi.spyOn(client, "checkAccount").mockImplementation(async (phone) => ({
      exist: true,
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
    expect(readSavedChat()?.chatId).toBe("87654321");
  });

  it("does not restore a saved chat after the page has unmounted", async () => {
    const { client, store, wrapper } = setup();
    const response = deferred<GreenMessageDto[]>();
    const onOpen = vi.fn();

    vi.spyOn(client, "checkAccount").mockResolvedValue({
      exist: true,
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
    expect(readSavedChat()).toBeNull();
  });
});

describe("message actions", () => {
  it("tracks concurrent sends by chat and applies late success to the original chat", async () => {
    const { client, store, wrapper } = setup();
    const response = deferred<{ idMessage: string }>();

    vi.spyOn(client, "sendMessage").mockImplementation((id) =>
      id === "a"
        ? response.promise
        : Promise.resolve({ idMessage: "b-message" }),
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
      response.resolve({ idMessage: "a-message" });
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
