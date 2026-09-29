import { useMutation, useQueryClient } from "@tanstack/react-query";
import { openTelegramChat } from "@/features/open-chat";
import { saveActiveChat } from "@/features/session";
import { type VerifiedChat } from "@/entities/chat";
import { type MessageStore } from "@/entities/message";
import { type GreenApiClient } from "@/shared/api/green-api";
import { chatHistoryOptions } from "@/pages/messenger/model/chatHistory";

export function useOpenChat(
  client: GreenApiClient,
  store: MessageStore,
  onOpen: (chat: VerifiedChat) => void,
) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (phone: string) => {
      const chat = await openTelegramChat(client, phone);
      const messages = await queryClient.fetchQuery({
        ...chatHistoryOptions(client, chat.chatId),
        staleTime: 0,
      });

      return { chat, messages };
    },
  });

  function openChat(phone: string) {
    mutation.mutate(phone, {
      // Per-call callbacks run only for the latest call while still mounted.
      onSuccess: ({ chat, messages }) => {
        saveActiveChat(chat);
        store.merge(chat.chatId, messages);
        onOpen(chat);
      },
    });
  }

  return { openChat, isPending: mutation.isPending, error: mutation.error };
}
