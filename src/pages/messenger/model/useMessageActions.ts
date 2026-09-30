import { type MessageStore } from "@/entities/message";
import { type ChatClient } from "@/entities/chat";
import { useSendMessage } from "./useSendMessage";
import { useDeleteMessage } from "./useDeleteMessage";

export function useMessageActions(
  client: ChatClient,
  store: MessageStore,
  chatId?: string,
) {
  const send = useSendMessage(client, store, chatId);
  const deletion = useDeleteMessage(client, store, chatId);

  return { ...send, ...deletion };
}
