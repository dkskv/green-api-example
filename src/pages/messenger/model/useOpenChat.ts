import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type VerifiedContact } from "@/entities/contact";
import { type MessageStore } from "@/entities/message";
import { type ChatClient } from "@/entities/chat";
import { chatHistoryOptions } from "@/pages/messenger/model/chatHistory";

export function useOpenChat(
  client: ChatClient,
  store: MessageStore,
  onOpen: (contact: VerifiedContact) => void,
) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (phone: string) => {
      const contact = await client.resolveContact(phone);

      const messages = await queryClient.query({
        ...chatHistoryOptions(client, contact.chatId),
        staleTime: 0,
      });

      return { contact, messages };
    },
  });

  function openChat(phone: string) {
    mutation.mutate(phone, {
      // Обработчик вызывается только для последнего запроса до размонтирования.
      onSuccess: ({ contact, messages }) => {
        store.merge(contact.chatId, messages);
        onOpen(contact);
      },
    });
  }

  return { openChat, isPending: mutation.isPending, error: mutation.error };
}
