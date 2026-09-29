import { useMutation } from "@tanstack/react-query";
import { useStore } from "zustand";
import { type ChatClient } from "@/entities/chat";
import { contactStore } from "@/features/messenger-session";

/** Проверяет номер и сохраняет выбранный контакт независимо от истории. */
export function useActiveContact(client: ChatClient) {
  const activeContact = useStore(contactStore.state, (state) => state.contact);
  const verification = useMutation({
    mutationFn: (phone: string) => client.resolveContact(phone),
  });

  function selectContact(phone: string) {
    verification.mutate(phone, {
      // Только последняя проверка до размонтирования может выбрать контакт.
      onSuccess: contactStore.save,
    });
  }

  return {
    activeContact,
    selectContact,
    isPending: verification.isPending,
    error: verification.error,
  };
}
