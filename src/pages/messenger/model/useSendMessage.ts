import { type MessageCacheController } from "./messageCacheController";
import { useMutation, useMutationState } from "@tanstack/react-query";
import { type ChatClient } from "@/entities/chat";

type SendVariables = { chatId: string; text: string };

export function useSendMessage(
  client: ChatClient,
  messageCacheController: MessageCacheController,
  chatId: string | undefined,
) {
  const send = useMutation({
    mutationKey: ["send-message"],
    mutationFn: ({ chatId, text }: SendVariables) =>
      client.sendMessage(chatId, text),
    onSuccess: (message, { chatId }) =>
      messageCacheController.merge(chatId, [message]),
  });

  const sends = useMutationState({
    filters: { mutationKey: ["send-message"] },
    select: ({ state }) => ({
      variables: state.variables as SendVariables | undefined,
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

  return {
    sendMessage,
    sending: sends.some((mutation) => mutation.status === "pending"),
    sendError: sends.at(-1)?.error ?? null,
  };
}
