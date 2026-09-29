import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { type MessageStore } from "@/entities/message";
import { type GreenApiClient } from "@/shared/api/green-api";
import { chatHistoryOptions } from "@/pages/messenger/model/chatHistory";

export function useChatHistory(
  client: GreenApiClient,
  store: MessageStore,
  chatId?: string,
) {
  const history = useQuery({
    ...chatHistoryOptions(client, chatId ?? ""),
    enabled: Boolean(chatId),
  });

  useEffect(() => {
    // Query owns the server snapshot; the store reconciles it with live events.
    if (chatId && history.data) store.merge(chatId, history.data);
  }, [chatId, history.data, store]);

  return history;
}
