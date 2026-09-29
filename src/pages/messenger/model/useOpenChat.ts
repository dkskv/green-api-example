import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resolveContact } from "@/features/open-chat";
import { saveActiveContact } from "@/features/session";
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
      const contact = await resolveContact(client, phone);

      const messages = await queryClient.query({
        ...chatHistoryOptions(client, contact.chatId),
        staleTime: 0,
      });

      return { contact, messages };
    },
  });

  function openChat(phone: string) {
    mutation.mutate(phone, {
      // Per-call callbacks run only for the latest call while still mounted.
      onSuccess: ({ contact, messages }) => {
        saveActiveContact(contact);
        store.merge(contact.chatId, messages);
        onOpen(contact);
      },
    });
  }

  return { openChat, isPending: mutation.isPending, error: mutation.error };
}
