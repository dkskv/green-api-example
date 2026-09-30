// @vitest-environment jsdom
import { type PropsWithChildren } from "react";
import { cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, vi } from "vitest";
import { createChatClientMock } from "@/entities/chat/testing";
import { type ChatMessage } from "@/entities/message";
import { type ChatState, emptyChatState } from "@/entities/message";
import {
  MessageCacheController,
  chatHistoryKey,
} from "../messageCacheController";
import { contactStore } from "@/features/green-api-session";

const clients: QueryClient[] = [];

export function setup() {
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

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });

  return { promise, resolve, reject };
}

export const snapshot: ChatMessage[] = [
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
