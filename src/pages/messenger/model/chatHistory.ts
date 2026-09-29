import { queryOptions } from "@tanstack/react-query";
import { type ChatClient } from "@/entities/chat";

export function chatHistoryOptions(client: ChatClient, chatId: string) {
  return queryOptions({
    queryKey: ["chat-history", chatId],
    queryFn: ({ signal }) => client.getChatHistory(chatId, signal),
    // Уведомления обновляют чат; история перезагружается вручную.
    staleTime: Infinity,
  });
}
