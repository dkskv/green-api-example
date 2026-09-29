import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { type MessageStore } from "@/entities/message";
import { type ChatClient } from "@/entities/chat";
import { chatHistoryOptions } from "@/pages/messenger/model/chatHistory";

export function useChatHistory(
  client: ChatClient,
  store: MessageStore,
  chatId?: string,
) {
  const history = useQuery({
    ...chatHistoryOptions(client, chatId ?? ""),
    enabled: Boolean(chatId),
  });

  useEffect(() => {
    // Запрос хранит серверный снимок, стор объединяет его с текущими событиями.
    if (chatId && history.data) store.merge(chatId, history.data);
  }, [chatId, history.data, store]);

  return history;
}
