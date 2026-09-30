import { type MessageCacheController } from "./messageCacheController";
import { useMutation, useMutationState } from "@tanstack/react-query";
import { type ChatClient } from "@/entities/chat";
import { getDeletionError } from "./getDeletionError";

type DeleteVariables = { chatId: string; id: string };

export function useDeleteMessage(
  client: ChatClient,
  messageCacheController: MessageCacheController,
  chatId: string | undefined,
) {
  const remove = useMutation({
    mutationKey: ["delete-message"],
    mutationFn: ({ chatId, id }: DeleteVariables) =>
      client.deleteMessage(chatId, id),
    onSuccess: (_, { chatId, id }) => messageCacheController.remove(chatId, id),
  });

  const deletions = useMutationState({
    filters: { mutationKey: ["delete-message"] },
    select: ({ state }) => ({
      variables: state.variables as DeleteVariables | undefined,
      status: state.status,
      error: state.error,
    }),
  }).filter((mutation) => mutation.variables?.chatId === chatId);

  function deleteMessage(id: string) {
    if (chatId) remove.mutate({ chatId, id });
  }

  return {
    deleteMessage,
    deletingIds: deletions
      .filter((mutation) => mutation.status === "pending")
      .map((mutation) => mutation.variables!.id),
    deleteError: getDeletionError(deletions),
  };
}
