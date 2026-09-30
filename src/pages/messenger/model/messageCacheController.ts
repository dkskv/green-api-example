import { type QueryClient } from "@tanstack/react-query";
import {
  type ChatState,
  type ChatMessage,
  type MessageStatus,
  mergeMessages,
  updateMessageStatus,
  removeMessage,
} from "@/entities/message";

export const chatHistoryKey = (chatId?: string) =>
  ["chat-history", chatId] as const;

/** Операции над сообщениями в кеше QueryClient без собственного состояния. */
export class MessageCacheController {
  private readonly queryClient: QueryClient;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  merge(chatId: string, messages: ChatMessage[]) {
    this.queryClient.setQueryData<ChatState>(chatHistoryKey(chatId), (state) =>
      mergeMessages(state, messages),
    );
  }

  updateStatus(chatId: string, id: string, status: MessageStatus) {
    this.queryClient.setQueryData<ChatState>(chatHistoryKey(chatId), (state) =>
      updateMessageStatus(state, id, status),
    );
  }

  remove(chatId: string, id: string) {
    const filters = { queryKey: chatHistoryKey(chatId), exact: true };
    const fetching =
      this.queryClient.getQueryState(filters.queryKey)?.fetchStatus ===
      "fetching";

    // Отмена синхронно исключает старый ответ. Не откатываем события,
    // попавшие в кеш во время запроса.
    void this.queryClient.cancelQueries(filters, { revert: false });

    this.queryClient.setQueryData<ChatState>(filters.queryKey, (state) =>
      removeMessage(state, id),
    );

    // Прерванную загрузку нужно завершить уже свежим снимком.
    if (fetching) void this.queryClient.refetchQueries(filters);
  }
}
