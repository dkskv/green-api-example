import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { type MessageStore } from "@/entities/message";
import { type ChatClient } from "@/entities/chat";
import { useMounted } from "@/shared/lib/useMounted";

export function useChatHistory(
  client: ChatClient,
  store: MessageStore,
  chatId?: string,
) {
  // Ждём завершения проверочного цикла StrictMode: повторные запросы вызывают 429 на dev-аккаунте.
  const mounted = useMounted();

  const history = useQuery({
    queryKey: ["chat-history", chatId],
    queryFn: ({ signal }) => client.getChatHistory(chatId!, signal),
    // Повторный выбор чата обновляет историю, пока события продолжают поступать.
    staleTime: 0,
    enabled: mounted && Boolean(chatId),
  });

  useEffect(() => {
    // Запрос хранит серверный снимок, стор объединяет его с текущими событиями.
    if (chatId && history.data) store.merge(chatId, history.data);
  }, [chatId, history.data, store]);

  return history;
}
