import { queryOptions } from "@tanstack/react-query";
import { mapGreenMessage } from "@/entities/message";
import { type GreenApiClient } from "@/shared/api/green-api";

export function chatHistoryOptions(client: GreenApiClient, chatId: string) {
  return queryOptions({
    queryKey: ["chat-history", chatId],
    queryFn: async ({ signal }) => {
      const history = await client.getChatHistory(chatId, signal);

      return history.map(mapGreenMessage);
    },
    // Notifications keep the displayed conversation current. Refresh is explicit.
    staleTime: Infinity,
  });
}
