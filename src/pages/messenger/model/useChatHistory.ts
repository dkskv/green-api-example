import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ChatState, mergeMessages } from "@/entities/message";
import { type ChatClient } from "@/entities/chat";
import { useBypassStrictMode } from "@/shared/lib/useBypassStrictMode";
import { chatHistoryKey } from "./messageCacheController";

export function useChatHistory(client: ChatClient, chatId: string | undefined) {
  const queryClient = useQueryClient();
  // Ждём завершения проверочного цикла StrictMode: повторные запросы вызывают 429 на dev-аккаунте.
  const ready = useBypassStrictMode();

  return useQuery({
    queryKey: chatHistoryKey(chatId),
    queryFn: async ({ signal }) => {
      const messages = await client.getChatHistory(chatId!, signal);

      // События могли обновить кеш, пока загружалась история.
      return mergeMessages(
        queryClient.getQueryData<ChatState>(chatHistoryKey(chatId)),
        messages,
      );
    },
    staleTime: 0,
    enabled: ready && Boolean(chatId),
  });
}
