import { getDeletionError } from "./getDeletionError";
import { useMutation, useMutationState } from "@tanstack/react-query";
import { sendChatMessage } from "@/features/send-message";
import { type MessageStore } from "@/entities/message";
import { type ChatClient } from "@/entities/chat";

type SendVariables = { chatId: string; text: string };

type DeleteVariables = { chatId: string; id: string };

export function useMessageActions(
  client: ChatClient,
  store: MessageStore,
  chatId?: string,
) {
  const send = useMutation({
    mutationKey: ["send-message"],
    mutationFn: ({ chatId, text }: SendVariables) =>
      sendChatMessage(client, chatId, text),
    onSuccess: (message, { chatId }) => store.merge(chatId, [message]),
  });

  const remove = useMutation({
    mutationKey: ["delete-message"],
    mutationFn: ({ chatId, id }: DeleteVariables) =>
      client.deleteMessage(chatId, id),
    onSuccess: (_, { chatId, id }) => store.remove(chatId, id),
  });

  const sends = useMutationState({
    filters: { mutationKey: ["send-message"] },
    select: ({ state }) => ({
      variables: state.variables as SendVariables | undefined,
      status: state.status,
      error: state.error,
    }),
  }).filter((mutation) => mutation.variables?.chatId === chatId);

  const deletions = useMutationState({
    filters: { mutationKey: ["delete-message"] },
    select: ({ state }) => ({
      variables: state.variables as DeleteVariables | undefined,
      status: state.status,
      error: state.error,
    }),
  }).filter((mutation) => mutation.variables?.chatId === chatId);

  async function sendMessage(text: string): Promise<boolean> {
    if (!chatId) return false;

    try {
      await send.mutateAsync({ chatId, text });

      return true;
    } catch {
      // Мутация возвращает ошибку, форма сохраняет черновик.
      return false;
    }
  }

  function deleteMessage(id: string) {
    if (chatId) remove.mutate({ chatId, id });
  }

  return {
    sendMessage,
    deleteMessage,
    sending: sends.some((mutation) => mutation.status === "pending"),
    sendError: sends.at(-1)?.error ?? null,
    deletingIds: deletions
      .filter((mutation) => mutation.status === "pending")
      .map((mutation) => mutation.variables!.id),
    deleteError: getDeletionError(deletions),
  };
}
